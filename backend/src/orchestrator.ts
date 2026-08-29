import { AgentState, AgentStateSchema } from "./core/state";
import { runResearcher } from "./agents/researcher";
import { runPlanner } from "./agents/planner";
import { runExecutor } from "./agents/executor";
import { runSandboxValidation } from "./core/sandbox";

/**
 * Pipeline de orquestração sequencial que emite o estado a cada transição (Generator Function).
 * Essa abordagem nativa do TS permite uma integração assíncrona extremamente limpa com o SSE.
 */
export async function* runPipeline(initialState: AgentState): AsyncGenerator<AgentState, void, unknown> {
    // Parsing rigoroso da estrutura via Zod
    let currentState = AgentStateSchema.parse(initialState);
    
    // Transição 0: Estado base aceito
    yield currentState;

    // --- FASE 1: PESQUISA E COMPRESSÃO ---
    currentState = await runResearcher(currentState);
    currentState = AgentStateSchema.parse(currentState); 
    yield currentState;
    
    if (currentState.executionStatus.includes("FAILED")) return;

    // --- FASE 2: PLANEJAMENTO ARQUITETURAL (PTCF) ---
    currentState = await runPlanner(currentState);
    currentState = AgentStateSchema.parse(currentState); 
    yield currentState;

    if (currentState.executionStatus.includes("FAILED")) return;

    // --- FASE 3 e 4: GERAÇÃO DE CÓDIGO E LOOP DE VALIDAÇÃO (SANDBOX) ---
    let retries = 3;
    let success = false;

    while (retries > 0 && !success) {
        currentState = await runExecutor(currentState);
        currentState = AgentStateSchema.parse(currentState);
        yield currentState;
        
        if (currentState.executionStatus.includes("FAILED")) break;

        // Se houver código gerado, envia para a Sandbox
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
