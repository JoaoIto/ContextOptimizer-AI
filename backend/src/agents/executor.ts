import { AgentState } from "../core/state";
import { generateUniversalStream } from "../utils/llm";

export async function runExecutor(
    state: AgentState, 
    onChunk?: (text: string) => void, 
    onRetry?: (msg: string) => void,
    abortSignal?: AbortSignal
): Promise<AgentState> {
    const systemPrompt = `You are a Senior Software Engineer specializing in Node.js and TypeScript.
Your sole function is to write the final and functional code based on the approved plan.
- You must output the complete script in a single file, with the necessary imports, logic, and exports.
- Do not create placeholders or "add here" comments. Write the actual implementation.
- MANDATORY: If you are going to instantiate an HTTP server, you MUST set the port to 0 (e.g., server.listen(0)) or process.env.PORT || 0 to avoid EADDRINUSE errors during compilation in the Sandbox.
- MANDATORY: DO NOT use external libraries (like express, axios, cors, etc). Use EXCLUSIVELY native Node.js modules (http, fs, etc). The script will be tested in a clean Sandbox without node_modules.
- MANDATORY: The final code must be encapsulated inside <CODE> and </CODE> tags. Do not return Markdown like \`\`\`typescript, ONLY the <CODE> tags.`;

    const userPrompt = `PTCF META PROMPT:
${state.ptcfMetaPrompt}

${state.errorFeedbackLog ? `\nATTENTION! THE PREVIOUS CODE FAILED COMPILATION. HERE IS THE TERMINAL ERROR:\n${state.errorFeedbackLog}\nFIX THE CODE AND OUTPUT ONLY THE NEW RAW CODE INSIDE THE <CODE> TAG.` : ''}`;

    try {
        const stream = await generateUniversalStream(userPrompt, systemPrompt, 'EXECUTOR', onRetry, abortSignal);
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

        const executorMessage = messageMatch ? messageMatch[1].trim() : "Code generated successfully.";
        let sanitizedCode = codeMatch ? codeMatch[1].trim() : rawOutput.trim();

        // In case it still outputs markdown inside the <CODE> tag
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
