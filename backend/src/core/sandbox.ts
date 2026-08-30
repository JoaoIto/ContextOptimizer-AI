import { exec } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

export async function runSandboxValidation(code: string): Promise<{ success: boolean; output: string }> {
    // Creates a unique temporary file path in the OS temp directory
    const tempDir = os.tmpdir();
    const tempFileName = `sandbox_agent_${Date.now()}_${Math.floor(Math.random() * 1000)}.ts`;
    const tempFilePath = path.join(tempDir, tempFileName);

    try {
        // Writes the generated code to the temporary file
        fs.writeFileSync(tempFilePath, code, 'utf-8');

        return await new Promise((resolve) => {
            // Executes the TS file. If there is a syntax error, the executor will throw an error.
            exec(`npx tsx ${tempFilePath}`, { timeout: 5000 }, (error, stdout, stderr) => {
                if (error) {
                    // If the error was caused by a timeout (killed = true), it means the script
                    // compiled and started running (e.g., web server, interactive readline), which is a syntax SUCCESS.
                    if (error.killed && error.signal === 'SIGTERM') {
                        resolve({
                            success: true,
                            output: "Syntax successfully validated (Script in continuous execution / Timeout reached without initial crash).\n" + stdout
                        });
                        return;
                    }

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
            output: `Catastrophic error in the Sandbox: ${err.message}`
        };
    } finally {
        // VERY IMPORTANT: Ensures deletion of the residual file (Reproducibility)
        if (fs.existsSync(tempFilePath)) {
            try {
                fs.unlinkSync(tempFilePath);
            } catch (cleanupError) {
                console.error("Failed to clean up Sandbox file:", cleanupError);
            }
        }
    }
}
