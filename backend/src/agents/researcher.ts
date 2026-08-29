import { AgentState } from "../core/state";
import { generateCompletion } from "../utils/llm";

export async function runResearcher(state: AgentState): Promise<AgentState> {
    console.log("[Pesquisador] Iniciando filtragem de contexto...");
    
    const systemPrompt = `Você é um agente especializado em filtragem técnica e compressão algorítmica (Context Pruning).
Seu objetivo é analisar documentações pesadas e extrair ESTRITAMENTE as assinaturas de funções, schemas de dados, endpoints e regras de negócio exigidas.
Ignore prosa introdutória, textos de marketing ou lógicas redundantes que não se aplicam à tarefa solicitada.`;

    const userPrompt = `TAREFA DO DESENVOLVEDOR: ${state.rawUserPrompt}
DOCUMENTAÇÃO BRUTA:
${state.rawDocumentContext}

Retorne apenas o contexto técnico comprimido essencial.`;

    try {
        const compressed = await generateCompletion(systemPrompt, userPrompt, 'gemini-1.5-flash');
        
        return {
            ...state,
            compressedContext: compressed,
            executionStatus: "RESEARCH_COMPLETED"
        };
    } catch (error) {
        return {
            ...state,
            executionStatus: "FAILED_RESEARCH",
            errorFeedbackLog: String(error)
        };
    }
}
