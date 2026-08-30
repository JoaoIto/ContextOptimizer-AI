import { exec } from 'child_process';
exec('node -e "setTimeout(() => console.log(\'done\'), 10000)"', { timeout: 2000 }, (error, stdout, stderr) => {
    console.log('Error:', error);
    console.log('Error name:', error?.name);
    console.log('Error code:', (error as any)?.code);
    console.log('Error signal:', (error as any)?.signal);
    console.log('Error killed:', (error as any)?.killed);
});
