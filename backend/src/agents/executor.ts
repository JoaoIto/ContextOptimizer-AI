import { AgentState } from "../core/state";
import { generateCompletion } from "../utils/llm";

export async function runExecutor(state: AgentState): Promise<AgentState> {
    console.log("[Executor] Codificando (Spec-First)...");
    
    const systemPrompt = `Você é um Desenvolvedor Sênior altamente focado.
Você receberá um plano de arquitetura (PTCF).
Sua ÚNICA função é retornar o código cru, completo e funcional que atenda ao plano. NÃO forneça explicações Markdown, nem envolva com crases (\`\`\`), retorne puramente o código.`;

    const userPrompt = `META-PROMPT ARQUITETURAL (PTCF):
${state.ptcfMetaPrompt || ''}
${state.errorFeedbackLog ? `\nATENÇÃO! O CÓDIGO ANTERIOR FALHOU NA COMPILAÇÃO. AQUI ESTÁ O ERRO DO TERMINAL:\n${state.errorFeedbackLog}\nCORRIJA O CÓDIGO E EMITA A NOVA VERSÃO.` : ''}`;

    try {
        const code = await generateCompletion(systemPrompt, userPrompt, 'gemini-1.5-pro');
        
        return {
            ...state,
            generatedCode: code,
            executionStatus: "CODE_GENERATED"
        };
    } catch (error) {
        return {
            ...state,
            executionStatus: "FAILED_CODING",
            errorFeedbackLog: String(error)
        };
    }
}
