import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();

export const GOLDEN_MODELS = {
  STABLE_WORKHORSE: 'gemini-2.5-flash'
} as const;

export const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const universalClient = new OpenAI({
  baseURL: process.env.UNIVERSAL_API_BASE || 'https://openrouter.ai/api/v1',
  apiKey: process.env.UNIVERSAL_API_KEY || 'sua_chave_openrouter_ou_groq',
  defaultHeaders: {
    'HTTP-Referer': 'https://contextoptimizer.ai',
    'X-Title': 'ContextOptimizer-AI'
  }
});

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export async function* generateUniversalStream(
    userPrompt: string, 
    systemInstruction: string, 
    agentType: 'RESEARCHER' | 'PLANNER' | 'EXECUTOR',
    onRetry?: (msg: string) => void,
): AsyncGenerator<{ text: string }> {
    const maxRetries = 2;

    if (agentType === 'RESEARCHER') {
        let attempt = 0;
        while (attempt <= maxRetries) {
            try {
                const stream = await universalClient.chat.completions.create({
                    model: 'meta-llama/llama-3.1-8b-instruct',
                    messages: [
                        { role: 'system', content: systemInstruction },
                        { role: 'user', content: userPrompt }
                    ],
                    stream: true,
                    temperature: 0.2
                });
                for await (const chunk of stream) {
                    const content = chunk.choices[0]?.delta?.content || '';
                    if (content) yield { text: content };
                }
                return; // Sucesso, sai do loop
            } catch (error: any) {
                console.error(`[🔥] ERROR IN RESEARCHER API CALL (Tentativa ${attempt + 1}/${maxRetries + 1}):`, error.message);
                if (attempt < maxRetries) {
                    attempt++;
                    if (onRetry) onRetry(`Atraso na rede OpenRouter. Retentando pesquisa (Tentativa ${attempt}/${maxRetries})...`);
                    await delay(3000 * attempt);
                } else {
                    throw error;
                }
            }
        }
    } else if (agentType === 'PLANNER') {
        let attempt = 0;
        while (attempt <= maxRetries) {
            try {
                const stream = await universalClient.chat.completions.create({
                    model: 'meta-llama/llama-3.3-70b-instruct',
                    messages: [
                        { role: 'system', content: systemInstruction },
                        { role: 'user', content: userPrompt }
                    ],
                    stream: true,
                    temperature: 0.2
                });
                for await (const chunk of stream) {
                    const content = chunk.choices[0]?.delta?.content || '';
                    if (content) yield { text: content };
                }
                return; // Sucesso, sai do loop
            } catch (error: any) {
                console.error(`[🔥] ERROR IN PLANNER API CALL (Tentativa ${attempt + 1}/${maxRetries + 1}):`, error.message);
                if (attempt < maxRetries) {
                    attempt++;
                    if (onRetry) onRetry(`Atraso na rede OpenRouter. Retentando planejamento (Tentativa ${attempt}/${maxRetries})...`);
                    await delay(3000 * attempt);
                } else {
                    throw error;
                }
            }
        }
    } else if (agentType === 'EXECUTOR') {
        let useFallback = false;
        try {
            const stream = await ai.models.generateContentStream({
                model: 'gemini-2.5-flash',
                contents: userPrompt,
                config: {
                    systemInstruction: systemInstruction,
                    temperature: 0.1,
                }
            });
            for await (const chunk of stream) {
                if (chunk.text) yield { text: chunk.text };
            }
            return;
        } catch (error: any) {
            const isHardQuota = error.message?.includes('429') || error.message?.includes('limit: 20') || error.message?.includes('QUOTA') || error.message?.includes('403');
            if (isHardQuota || error.status === 429) {
                console.error(`[🔥] LLM Generation Quota Exceeded for Gemini. Disparando Fallback imediato para Qwen via universalClient.`, error.message);
                if (onRetry) onRetry("Fallback de provedor ativado (Cota Google excedida).");
                useFallback = true;
            } else {
                throw error;
            }
        }

        if (useFallback) {
            let attempt = 0;
            while (attempt <= maxRetries) {
                try {
                    const stream = await universalClient.chat.completions.create({
                        model: 'meta-llama/llama-3.3-70b-instruct',
                        messages: [
                            { role: 'system', content: systemInstruction },
                            { role: 'user', content: userPrompt }
                        ],
                        stream: true,
                        temperature: 0.1
                    });
                    for await (const chunk of stream) {
                        const content = chunk.choices[0]?.delta?.content || '';
                        if (content) yield { text: content };
                    }
                    return; // Sucesso, sai do loop
                } catch (error: any) {
                    console.error(`[🔥] ERROR IN EXECUTOR FALLBACK (Tentativa ${attempt + 1}/${maxRetries + 1}):`, error.message);
                    if (attempt < maxRetries) {
                        attempt++;
                        if (onRetry) onRetry(`Retentando Qwen Fallback (Tentativa ${attempt}/${maxRetries})...`);
                        await delay(3000 * attempt);
                    } else {
                        throw error;
                    }
                }
            }
        }
    } else {
        throw new Error('Unknown agent type');
    }
}
