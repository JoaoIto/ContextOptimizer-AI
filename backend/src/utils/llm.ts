import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

// Inicializa a instância do SDK do Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export async function generateStream(
    systemPrompt: string, 
    userPrompt: string, 
    modelName: string = 'gemini-2.5-flash',
    temperature: number = 0.2,
    onRetry?: (msg: string) => void
) {
    const maxRetries = 3;
    let attempt = 0;

    while (attempt <= maxRetries) {
        try {
            if (attempt === 0) {
                console.log(`[🤖] LLM Request: Iniciando STREAMING com modelo ${modelName}...`);
            } else {
                console.log(`[🔄] Retry ${attempt}/${maxRetries} via modelo: ${modelName}...`);
            }
            
            return await ai.models.generateContentStream({
                model: modelName,
                contents: userPrompt,
                config: {
                    systemInstruction: systemPrompt,
                    temperature: temperature,
                }
            });
        } catch (error: any) {
            const isTimeoutOrRateLimit = error.message?.includes('503') || error.message?.includes('429') || error.message?.includes('Timeout');
            
            if (attempt < maxRetries && (isTimeoutOrRateLimit || attempt === 0)) {
                attempt++;
                const waitTime = attempt * 2000;
                const msg = `Servidores congestionados ou limite atingido (${error.message || 'Erro Desconhecido'}). Tentativa ${attempt}/${maxRetries} em ${waitTime/1000}s...`;
                console.log(`[⚠️] ${msg}`);
                
                if (onRetry) {
                    onRetry(msg);
                }
                
                await delay(waitTime);
            } else {
                console.error(`[🔥] LLM Generation Stream Error (Esgotou retentativas)`, error);
                const isQuotaExceeded = error.message?.includes('429');
                const errMsg = isQuotaExceeded ? `QUOTA_EXCEEDED: ${error.message}` : (error.message || "Falha na comunicação com o LLM.");
                throw new Error(errMsg);
            }
        }
    }
    
    throw new Error("Falha inesperada no streaming LLM.");
}
