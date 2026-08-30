import { AgentState, AgentStateSchema } from "./core/state";
import { runResearcher } from "./agents/researcher";
import { runPlanner } from "./agents/planner";
import { runExecutor } from "./agents/executor";
import { runSandboxValidation } from "./core/sandbox";

// Robust helper to run agent and yield chunks
async function* streamAgent(
    agentFn: (state: AgentState, onChunk: (c: string) => void, onRetry?: (msg: string) => void, abortSignal?: AbortSignal) => Promise<AgentState>,
    state: AgentState,
    streamingStatus: string,
    chunkKey: 'streamingResearchChunk' | 'streamingPlanChunk' | 'streamingCodeChunk',
    abortSignal?: AbortSignal
): AsyncGenerator<AgentState, AgentState, unknown> {
    const queue: AgentState[] = [];
    let isDone = false;
    let finalState: AgentState | null = null;

    agentFn(state, (chunk: string) => {
        queue.push({
            ...state,
            executionStatus: streamingStatus as any,
            [chunkKey]: chunk
        });
    }, (msg: string) => {
        queue.push({
            ...state,
            executionStatus: "RETRYING_API",
            errorFeedbackLog: msg
        });
    }, abortSignal).then(res => {
        finalState = res;
        isDone = true;
    }).catch(err => {
        const isQuota = err.message?.includes("QUOTA_EXCEEDED");
        finalState = { 
            ...state, 
            executionStatus: isQuota ? "QUOTA_EXCEEDED" : `FAILED_${streamingStatus.split('_')[0]}` as any, 
            errorFeedbackLog: err.message 
        };
        isDone = true;
    });

    while (!isDone || queue.length > 0) {
        if (queue.length > 0) {
            yield queue.shift()!;
        } else {
            await new Promise(r => setTimeout(r, 10));
        }
    }

    return finalState!;
}

// Phase 1 and 2: Research and Planning
export async function* runPlanningPipeline(initialState: AgentState, abortSignal?: AbortSignal): AsyncGenerator<AgentState, void, unknown> {
    let currentState = AgentStateSchema.parse(initialState);
    yield currentState;

    const researchGen = streamAgent(runResearcher, currentState, "RESEARCH_STREAMING", "streamingResearchChunk", abortSignal);
    while (true) {
        const next = await researchGen.next();
        if (next.done) { currentState = next.value; break; }
        yield next.value;
    }
    
    yield currentState; // Sends RESEARCH_COMPLETED
    


    if (currentState.executionStatus.includes("FAILED")) return;

    currentState.rawDocumentContext = "";

    const plannerGen = streamAgent(runPlanner, currentState, "PLANNING_STREAMING", "streamingPlanChunk", abortSignal);
    while (true) {
        const next = await plannerGen.next();
        if (next.done) { currentState = next.value; break; }
        yield next.value;
    }
    


    yield currentState; // Sends PLANNING_COMPLETED
}

// Phase 3 and 4: Execution and Sandbox
export async function* runExecutionPipeline(state: AgentState, abortSignal?: AbortSignal): AsyncGenerator<AgentState, void, unknown> {
    let currentState = AgentStateSchema.parse(state);
    
    currentState.rawDocumentContext = "";
    currentState.rawUserPrompt = "";
    currentState.compressedContext = "";
    
    let retries = 3;
    let success = false;

    while (retries > 0 && !success) {
        const executorGen = streamAgent(runExecutor, currentState, "CODE_STREAMING", "streamingCodeChunk", abortSignal);
        while (true) {
            const next = await executorGen.next();
            if (next.done) { currentState = next.value; break; }
            yield next.value;
        }
        


        yield currentState; // Sends CODE_GENERATED
        
        if (currentState.executionStatus.includes("FAILED")) break;

        if (currentState.generatedCode) {
            // Task 5: Sandbox Sanitization Fix (URGENT)
            // Remove markdown markers from the generated code (e.g., ```typescript ... ```)
            const sanitizedCode = currentState.generatedCode.replace(/```(?:typescript|ts|javascript|js)?\n([\s\S]*?)```/gi, '$1').trim();
            
            const sandboxResult = await runSandboxValidation(sanitizedCode);
            
            // Basic Metrics
            const rawChars = (currentState.rawDocumentContext?.length || 0) + (currentState.rawUserPrompt?.length || 0);
            const compressedChars = (currentState.compressedContext?.length || 0) + (currentState.ptcfMetaPrompt?.length || 0);
            const tokensSavedEstimate = Math.max(0, Math.floor((rawChars - compressedChars) / 4));

            if (!sandboxResult.success) {
                retries--;
                currentState = {
                    ...currentState,
                    executionStatus: "FAILED_COMPILATION",
                    errorFeedbackLog: sandboxResult.output, // Passes the error log for self-correction
                    sandboxCompilationPassed: false
                };
                yield currentState;
                
                if (!success && retries === 0) {
                    currentState = {
                        ...currentState,
                        executionStatus: "VALIDATION_EXCEPTION",
                        errorFeedbackLog: "Terminal failure: Maximum sandbox compilation retries exceeded."
                    };
                    yield currentState;
                }
            } else {
                success = true;
                currentState = {
                    ...currentState,
                    sandboxCompilationPassed: true,
                    executionStatus: "SUCCESS_VERIFIED",
                    errorFeedbackLog: "", // Cleans up the log on success
                    metrics: {
                        tokensSaved: tokensSavedEstimate,
                        totalCost: 0,
                        wallClockLatencyMs: 0
                    }
                };
                yield currentState;
            }
            
            currentState = AgentStateSchema.parse(currentState);
        } else {
            break;
        }
    }
}
