import { AgentState, AgentStateSchema } from "./core/state";
import { runResearcher } from "./agents/researcher";
import { runPlanner } from "./agents/planner";
import { runExecutor } from "./agents/executor";
import { runSandboxValidation } from "./core/sandbox";

// Fase 1 e 2: Pesquisa e Planejamento
export async function* runPlanningPipeline(initialState: AgentState): AsyncGenerator<AgentState, void, unknown> {
    let currentState = AgentStateSchema.parse(initialState);
    yield currentState;

    currentState = await runResearcher(currentState);
    currentState = AgentStateSchema.parse(currentState); 
    yield currentState;
    
    if (currentState.executionStatus.includes("FAILED")) return;

    currentState = await runPlanner(currentState);
    currentState = AgentStateSchema.parse(currentState); 
    yield currentState;
}

// Fase 3 e 4: Execução e Sandbox
export async function* runExecutionPipeline(state: AgentState): AsyncGenerator<AgentState, void, unknown> {
    let currentState = AgentStateSchema.parse(state);
    
    let retries = 3;
    let success = false;

    while (retries > 0 && !success) {
        currentState = await runExecutor(currentState);
        currentState = AgentStateSchema.parse(currentState);
        yield currentState;
        
        if (currentState.executionStatus.includes("FAILED")) break;

        if (currentState.generatedCode) {
            const sandboxResult = await runSandboxValidation(currentState.generatedCode);
            
            if (sandboxResult.success) {
                currentState = {
                    ...currentState,
                    sandboxCompilationPassed: true,
                    executionStatus: "SUCCESS_VERIFIED",
                    errorFeedbackLog: undefined
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
