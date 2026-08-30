import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

export const GOLDEN_MODELS = {
  STABLE_WORKHORSE: 'gemini-2.5-flash'
} as const;

export const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export async function generateStream(
    systemPrompt: string, 
    userPrompt: string, 
    _modelName: string = GOLDEN_MODELS.STABLE_WORKHORSE, // Ignorado, fixo no STABLE_WORKHORSE
    temperature: number = 0.2,
    onRetry?: (msg: string) => void
) {
    const targetModel = GOLDEN_MODELS.STABLE_WORKHORSE;
    const maxRetries = 3;
    let attempt = 0;

    while (attempt <= maxRetries) {
        try {
            if (attempt === 0) {
                console.log(`[🤖] LLM Request: Iniciando STREAMING com modelo ${targetModel}...`);
            } else {
                console.log(`[🔄] Retry ${attempt}/${maxRetries} via modelo: ${targetModel}...`);
            }
            
            // Throttling / P-Queue simplificado (Delay garantido de 2s antes de qualquerr requisição nova para respeitar RPM rate limit)
            await delay(2000);

            return await ai.models.generateContentStream({
                model: targetModel,
                contents: userPrompt,
                config: {
                    systemInstruction: systemPrompt,
                    temperature: temperature,
                }
            });
        } catch (error: any) {
            const isTimeoutOrRateLimit = error.message?.includes('503') || error.message?.includes('429') || error.message?.includes('Timeout');
            
            if (attempt < maxRetries && (isTimeoutOrRateLimit || attempt === 0)) {
                const backoffTimes = [4000, 8000, 15000];
                const waitTime = backoffTimes[attempt] || 15000;
                attempt++;
                const msg = `Atraso na API detectado. Aplicando retentativa de segurança... (Tentativa ${attempt}/${maxRetries})`;
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
