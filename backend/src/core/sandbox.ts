import { exec } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

export async function runSandboxValidation(code: string): Promise<{ success: boolean; output: string }> {
    // Cria o caminho de um arquivo temporário único na pasta de temp do sistema operacional
    const tempDir = os.tmpdir();
    const tempFileName = `sandbox_agent_${Date.now()}_${Math.floor(Math.random() * 1000)}.ts`;
    const tempFilePath = path.join(tempDir, tempFileName);

    try {
        // Grava o código gerado no arquivo temporário
        fs.writeFileSync(tempFilePath, code, 'utf-8');

        return await new Promise((resolve) => {
            // Executa o arquivo TS. Se houver erro de sintaxe, o executor lançará erro.
            exec(`npx tsx ${tempFilePath}`, { timeout: 5000 }, (error, stdout, stderr) => {
                if (error) {
                    const cleanError = (stderr || error.message).replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
                    resolve({
                        success: false,
                        output: cleanError
                    });
                } else {
                    resolve({
                        success: true,
                        output: stdout
                    });
                }
            });
        });

    } catch (err: any) {
        return {
            success: false,
            output: `Erro catastrófico na Sandbox: ${err.message}`
        };
    } finally {
        // MUITO IMPORTANTE: Garante a deleção do arquivo residual (Reprodutibilidade)
        if (fs.existsSync(tempFilePath)) {
            try {
                fs.unlinkSync(tempFilePath);
            } catch (cleanupError) {
                console.error("Falha ao limpar arquivo da Sandbox:", cleanupError);
            }
        }
    }
}
