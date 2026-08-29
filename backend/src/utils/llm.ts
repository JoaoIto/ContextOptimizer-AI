import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

// Inicializa a instância do SDK do Gemini. A chave de API deve estar no ambiente como GEMINI_API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateCompletion(
    systemPrompt: string, 
    userPrompt: string, 
    modelName: string = 'gemini-1.5-pro'
): Promise<string> {
    try {
        const response = await ai.models.generateContent({
            model: modelName,
            contents: userPrompt,
            config: {
                systemInstruction: systemPrompt,
                temperature: 0.2, // Temperatura baixa para respostas mais determinísticas
            }
        });
        
        return response.text || '';
    } catch (error) {
        console.error("LLM Generation Error: ", error);
        throw new Error("Falha na comunicação com o LLM.");
    }
}
