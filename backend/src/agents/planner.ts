import { AgentState } from "../core/state";
import { generateCompletion } from "../utils/llm";

export async function runPlanner(state: AgentState): Promise<AgentState> {
    console.log("[Planejador] Estruturando plano PTCF...");
    
    const systemPrompt = `Você é um Arquiteto de Software Técnico operando o framework PTCF (Persona, Task, Context, Format).
Você não escreve código funcional, você foca apenas na elaboração do esquema e arquitetura. Você estrutura metas claras para que um desenvolvedor (executor) programe com perfeição.
Formate sua saída exatamente em seções PTCF sem incluir prosa solta.`;

    const userPrompt = `Crie o meta-prompt PTCF baseado nas informações abaixo.
TAREFA ORIGINAL: ${state.rawUserPrompt}
CONTEXTO TÉCNICO COMPRIMIDO: ${state.compressedContext || ''}`;

    try {
        const metaPrompt = await generateCompletion(systemPrompt, userPrompt, 'gemini-1.5-pro');
        
        return {
            ...state,
            ptcfMetaPrompt: metaPrompt,
            executionStatus: "PLANNING_COMPLETED"
        };
    } catch (error) {
        return {
            ...state,
            executionStatus: "FAILED_PLANNING",
            errorFeedbackLog: String(error)
        };
    }
}
