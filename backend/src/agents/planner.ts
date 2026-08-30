import { AgentState } from "../core/state";
import { generateStream } from "../utils/llm";

export async function runPlanner(state: AgentState, onChunk?: (text: string) => void, onRetry?: (msg: string) => void): Promise<AgentState> {
    const systemPrompt = `Você atua no framework PTCF (Persona, Task, Context, Format). 
REGRAS ABSOLUTAS E INEGOCIÁVEIS:
1. O código arquitetado DEVE ser projetado estritamente para TypeScript (Node.js). Não proponha bibliotecas de Python, Go ou outras linguagens. O ambiente alvo é estritamente TypeScript.
2. Todo o sistema planejado deve caber OBRIGATORIAMENTE em um ÚNICO ARQUIVO TypeScript (Standalone Script). NÃO crie estruturas de pastas, não sugira múltiplos arquivos, nem package.json.
3. Você deve separar sua resposta usando as tags <MESSAGE> e <PLAN>.

DETALHAMENTO DAS TAGS:
- Dentro de <MESSAGE>...</MESSAGE>: Escreva uma resposta de IA conversacional e amigável (em Markdown), explicando brevemente o entendimento do problema e convidando o usuário a revisar o plano.
- Dentro de <PLAN>...</PLAN>: Escreva o plano técnico estruturado OBRIGATORIAMENTE em Markdown avançado (use #, ##, -, **, \`\`\`).

Exemplo de formato:
<MESSAGE>
Olá! Analisei seu pedido para construir um **Orquestrador de Projetos**. O contexto principal envolve o ecossistema TypeScript e Node.js...
</MESSAGE>
<PLAN>
# Persona
...
</PLAN>`;

    const userPrompt = `OBJETIVO DO DESENVOLVEDOR:\n${state.rawUserPrompt}\n\nCONTEXTO COMPRIMIDO (REGRAS):\n${state.compressedContext}`;

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
        
        const messageMatch = rawOutput.match(/<MESSAGE>([\s\S]*?)<\/MESSAGE>/i);
        const planMatch = rawOutput.match(/<PLAN>([\s\S]*?)<\/PLAN>/i);

        const plannerMessage = messageMatch ? messageMatch[1].trim() : "Plano gerado com sucesso. Revise os detalhes abaixo.";
        const ptcfMetaPrompt = planMatch ? planMatch[1].trim() : rawOutput;
        
        return {
            ...state,
            plannerMessage,
            ptcfMetaPrompt,
            executionStatus: "PLANNING_COMPLETED"
        };
    } catch (error: any) {
        const isQuota = error.message?.includes("QUOTA_EXCEEDED");
        return {
            ...state,
            executionStatus: isQuota ? "QUOTA_EXCEEDED" : "FAILED_PLANNING",
            errorFeedbackLog: error.message
        };
    }
}
