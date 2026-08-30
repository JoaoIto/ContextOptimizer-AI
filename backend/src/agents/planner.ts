import { AgentState } from "../core/state";
import { generateUniversalStream } from "../utils/llm";

export async function runPlanner(
    state: AgentState, 
    onChunk?: (text: string) => void, 
    onRetry?: (msg: string) => void,
    abortSignal?: AbortSignal
): Promise<AgentState> {
    const systemPrompt = `You are an Elite Staff Software Engineer and Architecture Planner.
Your task is to analyze the compressed structural context and the user's request to output a rigorous, deterministic Markdown action plan.
Context constraints: Base your entire architecture EXCLUSIVELY on the provided compressed context. Do not invent missing variables or hallucinate APIs.
Format: Output STRICTLY a step-by-step markdown plan (\`### Step 1\`, etc.). Include required dependencies, data structures, and edge-case handling.

ABSOLUTE AND NON-NEGOTIABLE RULES:
1. The architected code MUST be designed strictly for TypeScript (Node.js). Do not propose libraries for Python, Go, or other languages. The target environment is strictly TypeScript.
2. The entire planned system must fit MANDATORILY in a SINGLE TypeScript FILE (Standalone Script). DO NOT create folder structures, do not suggest multiple files, nor package.json.
3. You must separate your response using the <MESSAGE> and <PLAN> tags.
4. MANDATORY: If the solution involves a web/HTTP server, instruct it to use port 0 (random) or \`process.env.PORT || 0\`, to avoid EADDRINUSE error in the sandbox.
5. MANDATORY: DO NOT use external libraries (like express, axios, cors, etc). Use EXCLUSIVELY native Node.js modules (http, https, fs, path, crypto, etc). The script will be tested in a clean Sandbox without node_modules.

TAG DETAILS:
- Inside <MESSAGE>...</MESSAGE>: Write a conversational and friendly AI response (in Markdown), briefly explaining the understanding of the problem and inviting the user to review the plan.
- Inside <PLAN>...</PLAN>: Write the structured technical plan MANDATORILY in advanced Markdown (use #, ##, -, **, \`\`\`).

Example format:
<MESSAGE>
Hello! I analyzed your request to build a **Project Orchestrator**. The main context involves the TypeScript and Node.js ecosystem...
</MESSAGE>
<PLAN>
# Persona
...
</PLAN>`;

    const userPrompt = `DEVELOPER GOAL:\n${state.rawUserPrompt}\n\nCOMPRESSED CONTEXT (RULES):\n${state.compressedContext}`;

    try {
        const stream = await generateUniversalStream(userPrompt, systemPrompt, 'PLANNER', onRetry, abortSignal);
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

        const plannerMessage = messageMatch ? messageMatch[1].trim() : "Plan successfully generated. Review the details below.";
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
