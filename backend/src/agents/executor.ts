import { AgentState } from "../core/state";
import { generateStream } from "../utils/llm";

export async function runExecutor(state: AgentState, onChunk?: (text: string) => void, onRetry?: (msg: string) => void): Promise<AgentState> {
    const systemPrompt = `Você é um Engenheiro de Software Sênior especialista em Node.js e TypeScript.
Sua única função é escrever o código final e funcional baseado no plano aprovado.
- Você deve emitir o script completo em um único arquivo, com imports, lógicas e exports necessários.
- Não crie placeholders ou comentários "adicione aqui". Escreva a implementação real.
- OBRIGATÓRIO: O código final deve estar encapsulado dentro de tags <CODE> e </CODE>. Não retorne Markdown como \`\`\`typescript, APENAS as tags <CODE>.`;

    const userPrompt = `META PROMPT PTCF:
${state.ptcfMetaPrompt}

${state.errorFeedbackLog ? `\nATENÇÃO! O CÓDIGO ANTERIOR FALHOU NA COMPILAÇÃO. AQUI ESTÁ O ERRO DO TERMINAL:\n${state.errorFeedbackLog}\nCORRIJA O CÓDIGO E EMITA APENAS O NOVO CÓDIGO CRU DENTRO DA TAG <CODE>.` : ''}`;

    try {
        const stream = await generateStream(systemPrompt, userPrompt, 'gemini-2.5-flash', 0.1, onRetry);
        let rawOutput = '';
        
        for await (const chunk of stream) {
            const chunkText = chunk.text;
            rawOutput += chunkText;
            if (onChunk) {
                onChunk(chunkText);
            }
        }
        
        const messageMatch = rawOutput.match(/<MESSAGE>([\s\S]*?)<\/MESSAGE>/i);
        const codeMatch = rawOutput.match(/<CODE>([\s\S]*?)<\/CODE>/i);

        const executorMessage = messageMatch ? messageMatch[1].trim() : "Código gerado com sucesso.";
        let sanitizedCode = codeMatch ? codeMatch[1].trim() : rawOutput.trim();

        // Caso ele ainda coloque markdown dentro da tag <CODE>
        const markdownRegex = /```(?:typescript|ts|javascript|js|json)?\s*([\s\S]*?)```/i;
        const match = sanitizedCode.match(markdownRegex);
        if (match && match[1]) {
            sanitizedCode = match[1].trim();
        }

        return {
            ...state,
            executorMessage,
            generatedCode: sanitizedCode,
            executionStatus: "CODE_GENERATED"
        };
    } catch (error: any) {
        const isQuota = error.message?.includes("QUOTA_EXCEEDED");
        return {
            ...state,
            executionStatus: isQuota ? "QUOTA_EXCEEDED" : "FAILED_CODING",
            errorFeedbackLog: error.message
        };
    }
}
