import { AgentState } from "../core/state";
import { generateStream } from "../utils/llm";

export async function runResearcher(state: AgentState, onChunk?: (text: string) => void, onRetry?: (msg: string) => void): Promise<AgentState> {
    const systemPrompt = `Você é um Compressor Extrativo de Contexto de extrema precisão.
Sua única função é ler a documentação bruta do usuário e devolver um sumário hiperdenso voltado exclusivamente para código.

REGRAS DE COMPRESSÃO:
1. Extraia APENAS as interfaces, dependências, rotas, assinaturas de métodos e esquemas de dados essenciais para a tarefa solicitada.
2. Ignore TODA prosa, textos explicativos, introduções e formatações longas.
3. Retorne o texto com a maior densidade de informação possível no menor número de tokens. Se uma palavra não contribui para a lógica técnica, remova-a.
4. Identifique as tecnologias envolvidas e resuma as dependências.
5. Não emita saudações, apenas o contexto comprimido bruto.`;

    const userPrompt = `DOCUMENTAÇÃO BRUTA:\n${state.rawDocumentContext || 'Nenhuma documentação fornecida.'}\n\nO que o usuário quer construir:\n${state.rawUserPrompt}`;

    try {
        const stream = await generateStream(systemPrompt, userPrompt, 'gemini-2.5-flash', 0.2, onRetry);
        let rawOutput = '';
        
        for await (const chunk of stream) {
            const chunkText = chunk.text;
            rawOutput += chunkText;
            if (onChunk) {
                onChunk(chunkText);
            }
        }
        
        return {
            ...state,
            compressedContext: rawOutput,
            extractedSources: ["Conhecimento Interno da IA"],
            executionStatus: "RESEARCH_COMPLETED"
        };
    } catch (error: any) {
        const isQuota = error.message?.includes("QUOTA_EXCEEDED");
        return {
            ...state,
            executionStatus: isQuota ? "QUOTA_EXCEEDED" : "FAILED_RESEARCH",
            errorFeedbackLog: error.message
        };
    }
}
