import { AgentState } from "../core/state";
import { generateStream } from "../utils/llm";

export async function runResearcher(state: AgentState, onChunk?: (text: string) => void, onRetry?: (msg: string) => void): Promise<AgentState> {
    const systemPrompt = `You are a deterministic, lossy prompt compression engine operating on raw context payloads. Your goal is to maximize information density by pruning syntactic redundancy while strictly preserving factual semantic anchors, verbatim code structures, variable names, and precise configurations.
Perform strict extractive compression under the following rules:
1. Strip all determiners, coordinating conjunctions, and stylistic transitions.
2. Compact grammatical markers. Render text in a non-standard, high-entropy representation that is ungrammatical to humans but highly coherent to LLM tokenizers (e.g., "The system configuration must be updated inside the database" -> "system_config:update_db").
3. Eliminate polite prose, metadata wrappers, and tutorial descriptions.
4. Do not rewrite, paraphrase, or summarize. Keep essential sentences verbatim, but stripped of filler words.
5. Preserve all unique identifiers, UUIDs, hex values, environment variables, API signatures, types, and mathematical formulas verbatim.
6. If code snippets are present, output only the operational declarations, types, and raw logic blocks. Remove comments and import lists.
Never hallucinate. Execute prompt pruning now. Squeeze the provided payload to 10% of its original size.`;

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
