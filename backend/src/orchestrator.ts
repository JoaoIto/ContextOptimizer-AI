import { AgentState, AgentStateSchema } from "./core/state";
import { runResearcher } from "./agents/researcher";
import { runPlanner } from "./agents/planner";
import { runExecutor } from "./agents/executor";
import { runSandboxValidation } from "./core/sandbox";

// Helper robusto para rodar agente e fazer yield
async function* streamAgent(
    agentFn: (state: AgentState, onChunk: (c: string) => void, onRetry?: (msg: string) => void) => Promise<AgentState>,
    state: AgentState,
    streamingStatus: string,
    chunkKey: 'streamingResearchChunk' | 'streamingPlanChunk' | 'streamingCodeChunk'
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
    }).then(res => {
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

// Fase 1 e 2: Pesquisa e Planejamento
export async function* runPlanningPipeline(initialState: AgentState): AsyncGenerator<AgentState, void, unknown> {
    let currentState = AgentStateSchema.parse(initialState);
    yield currentState;

    const researchGen = streamAgent(runResearcher, currentState, "RESEARCH_STREAMING", "streamingResearchChunk");
    while (true) {
        const next = await researchGen.next();
        if (next.done) { currentState = next.value; break; }
        yield next.value;
    }
    
    yield currentState; // Manda o RESEARCH_COMPLETED
    
    if (currentState.executionStatus.includes("FAILED") || currentState.executionStatus === "QUOTA_EXCEEDED") return;

    currentState.rawDocumentContext = "";

    const plannerGen = streamAgent(runPlanner, currentState, "PLANNING_STREAMING", "streamingPlanChunk");
    while (true) {
        const next = await plannerGen.next();
        if (next.done) { currentState = next.value; break; }
        yield next.value;
    }
    
    yield currentState; // Manda o PLANNING_COMPLETED
}

// Fase 3 e 4: Execução e Sandbox
export async function* runExecutionPipeline(state: AgentState): AsyncGenerator<AgentState, void, unknown> {
    let currentState = AgentStateSchema.parse(state);
    
    currentState.rawDocumentContext = "";
    currentState.rawUserPrompt = "";
    currentState.compressedContext = "";
    
    let retries = 3;
    let success = false;

    while (retries > 0 && !success) {
        const executorGen = streamAgent(runExecutor, currentState, "CODE_STREAMING", "streamingCodeChunk");
        while (true) {
            const next = await executorGen.next();
            if (next.done) { currentState = next.value; break; }
            yield next.value;
        }
        
        yield currentState; // Manda o CODE_GENERATED
        
        if (currentState.executionStatus.includes("FAILED")) break;

        if (currentState.generatedCode) {
            // Task 5: Conserto da Sanitização na Sandbox (URGENTE)
            // Remover marcadores de markdown do código gerado (ex: ```typescript ... ```)
            const sanitizedCode = currentState.generatedCode.replace(/```(?:typescript|ts|javascript|js)?\n([\s\S]*?)```/gi, '$1').trim();
            
            const sandboxResult = await runSandboxValidation(sanitizedCode);
            
            if (sandboxResult.success) {
                // Métricas Básicas
                const rawChars = (currentState.rawDocumentContext?.length || 0) + (currentState.rawUserPrompt?.length || 0);
                const compressedChars = (currentState.compressedContext?.length || 0) + (currentState.ptcfMetaPrompt?.length || 0);
                const tokensSavedEstimate = Math.max(0, Math.floor((rawChars - compressedChars) / 4));

                currentState = {
                    ...currentState,
                    sandboxCompilationPassed: true,
                    executionStatus: "SUCCESS_VERIFIED",
                    errorFeedbackLog: undefined,
                    metrics: {
                        tokensSaved: tokensSavedEstimate,
                        totalCost: 0,
                        wallClockLatencyMs: 0
                    }
                };
                success = true;
            } else {
                currentState = {
                    ...currentState,
                    sandboxCompilationPassed: false,
                    executionStatus: "FAILED_COMPILATION",
                    errorFeedbackLog: sandboxResult.output
                };
                retries--;
            }
            
            currentState = AgentStateSchema.parse(currentState);
            yield currentState;
        } else {
            break;
        }
    }
}
