import fs from 'fs';
import path from 'path';
import { OpenAI } from 'openai';
import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, 'backend', '.env') });

const client = new OpenAI({
    baseURL: process.env.UNIVERSAL_API_BASE || 'https://openrouter.ai/api/v1',
    apiKey: process.env.UNIVERSAL_API_KEY || 'dummy'
});

async function translateFile(filePath: string) {
    const content = fs.readFileSync(filePath, 'utf-8');
    console.log(`Translating ${filePath}... (${content.length} chars)`);
    try {
        const response = await client.chat.completions.create({
            model: 'meta-llama/llama-3.3-70b-instruct',
            messages: [
                { role: 'system', content: 'You are an expert technical translator. Translate the following content from Portuguese to English. Maintain all original formatting (markdown, code blocks, etc.). Do not add any conversational text before or after the translation. ONLY output the translated text. If the text is already in English, output it as is.' },
                { role: 'user', content }
            ],
            temperature: 0.1
        });
        
        const translatedText = response.choices[0].message.content || content;
        fs.writeFileSync(filePath, translatedText);
        console.log(`Successfully translated: ${filePath}`);
    } catch (e: any) {
        console.error(`Failed to translate ${filePath}: ${e.message}`);
    }
}

const files = [
    'spec/README.md',
    'spec/base/1_PRODUCT_SPEC.md',
    'spec/base/2_TECHNICAL_ARCHITECTURE.md',
    'spec/base/3_EVALUATION_AND_HOT_TAKE.md',
    'spec/implementation/fase1.md',
    'spec/implementation/fase2.md',
    'spec/implementation/fase3.md',
    'spec/implementation/fase4.md',
    'spec/implementation/fase5.md',
    'spec/implementation/implementation.md',
    'README.md',
];

async function run() {
    for (const f of files) {
        // Se f começar com spec, está um nível acima
        const fullPath = f.startsWith('spec') 
            ? path.resolve(__dirname, '..', f)
            : path.resolve(__dirname, f);
            
        if (fs.existsSync(fullPath)) {
            await translateFile(fullPath);
        } else {
            console.log(`File not found: ${fullPath}`);
        }
    }
}

run();
