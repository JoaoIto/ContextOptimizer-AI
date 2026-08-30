const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend/src/App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Tarefa 1: Fundo Global e Superfícies
content = content.replace(/bg-\[#131314\]/g, 'bg-[#030303]');
content = content.replace(/bg-\[#1e1e1e\]/g, 'bg-[#0A0A0A]/80 backdrop-blur-md');
content = content.replace(/bg-\[#2a2a2a\]/g, 'bg-zinc-900/50');
content = content.replace(/bg-\[#222\]\/50/g, 'bg-transparent');
content = content.replace(/bg-slate-900/g, 'bg-[#030303]');
content = content.replace(/bg-gray-800/g, 'bg-zinc-900/50');
content = content.replace(/border-white\/5/g, 'border-[rgba(255,255,255,0.08)]');

// Tarefa 2: Tipografia Geral
content = content.replace(/text-gray-100/g, 'text-zinc-100');
content = content.replace(/text-gray-200/g, 'text-zinc-100');
content = content.replace(/text-gray-300/g, 'text-zinc-300');
content = content.replace(/text-gray-400/g, 'text-zinc-400');
content = content.replace(/text-gray-500/g, 'text-zinc-600');
content = content.replace(/from-gray-100/g, 'from-zinc-100');
content = content.replace(/from-gray-200/g, 'from-zinc-200');
content = content.replace(/from-gray-400/g, 'from-zinc-400');
content = content.replace(/from-gray-500/g, 'from-zinc-500');
content = content.replace(/to-gray-100/g, 'to-zinc-100');
content = content.replace(/to-gray-200/g, 'to-zinc-200');
content = content.replace(/to-gray-400/g, 'to-zinc-400');
content = content.replace(/to-gray-500/g, 'to-zinc-500');

// Typography in terminal & specific blocks (removing neon colors except for semantic states)
content = content.replace(/text-sky-400/g, 'text-zinc-300');
content = content.replace(/text-sky-500/g, 'text-zinc-400');
content = content.replace(/bg-sky-400/g, 'bg-zinc-400');
content = content.replace(/bg-sky-500/g, 'bg-zinc-500');

content = content.replace(/text-blue-400/g, 'text-zinc-300');
content = content.replace(/text-blue-500/g, 'text-zinc-400');
content = content.replace(/shadow-blue-500\/5/g, 'shadow-none');

content = content.replace(/text-purple-300/g, 'text-zinc-300');
content = content.replace(/text-purple-400/g, 'text-zinc-300');
content = content.replace(/shadow-purple-500\/5/g, 'shadow-none');

content = content.replace(/text-emerald-300/g, 'text-zinc-300');
content = content.replace(/text-emerald-400/g, 'text-zinc-300');
content = content.replace(/shadow-emerald-500\/5/g, 'shadow-none');
content = content.replace(/border-emerald-500\/20/g, 'border-zinc-800');
content = content.replace(/from-emerald-500\/20/g, 'from-zinc-800');
content = content.replace(/to-emerald-400\/10/g, 'to-zinc-900');

// Semantic Alerts Rate Limit 429 & Errors (Tarefa 4)
// Rate Limit 429
content = content.replace(/bg-orange-900\/10/g, 'bg-yellow-950/10');
content = content.replace(/border-orange-500\/20/g, 'border-yellow-500/20');
content = content.replace(/border-orange-500\/30/g, 'border-yellow-500/20');
content = content.replace(/text-orange-200/g, 'text-yellow-100');
content = content.replace(/text-orange-400/g, 'text-yellow-400');
content = content.replace(/text-orange-500/g, 'text-yellow-500');
content = content.replace(/bg-orange-500\/20/g, 'bg-yellow-500/10');
content = content.replace(/hover:bg-orange-500\/30/g, 'hover:bg-yellow-500/20 text-yellow-400');
// Fatal Errors
// Red is already mostly correct, but let's ensure it's exact: bg-red-950/10
content = content.replace(/bg-red-950\/40/g, 'bg-red-950/10');
content = content.replace(/bg-red-950\/30/g, 'bg-red-950/10');

// Tarefa 5: Botões Primários
content = content.replace(/bg-gray-200 hover:bg-white transition-colors cursor-pointer w-fit mt-2 shadow-lg shadow-white\/5/g, 'bg-zinc-100 hover:bg-white text-zinc-950 transition-colors cursor-pointer w-fit mt-2 shadow-lg shadow-white/5');
content = content.replace(/bg-gradient-to-r from-gray-200 to-white/g, 'bg-zinc-100 hover:bg-white text-zinc-950');

// Tarefa 3: Stepper Re-write
// Let's replace the stepper block manually via regex to be safe
// Since it spans multiple lines, we'll write a targeted replacement
const stepperRegex = /\{\/\* Stepper \/ Timeline Vivo \*\/\}([\s\S]*?)\{\/\* Histórico Anterior \*\/\}/m;

const newStepper = `{/* Stepper / Timeline Vivo */}
          <div className="w-full flex items-center justify-between mb-4 px-4 relative shrink-0">
             <div className="absolute top-1/2 left-8 right-8 h-px bg-zinc-800 -z-10 -translate-y-1/2" />
             
             {/* Passo 1 */}
             <div className={\`relative flex flex-col items-center gap-2 \${(!state?.ptcfMetaPrompt && !state?.generatedCode) ? 'text-zinc-100' : 'text-zinc-600'}\`}>
                <motion.div 
                  className={\`w-9 h-9 rounded-full flex items-center justify-center border transition-all relative \${(!state?.ptcfMetaPrompt && !state?.generatedCode && isProcessing) ? 'bg-zinc-800 border-zinc-500' : (state?.ptcfMetaPrompt || state?.generatedCode) ? 'bg-transparent border-zinc-800' : 'bg-zinc-900/50 border-zinc-800'}\`}
                >
                   {(!state?.ptcfMetaPrompt && !state?.generatedCode && isProcessing) && (
                     <motion.div className="absolute inset-0 rounded-full border border-zinc-400/30" animate={{ scale: [1, 1.2, 1], opacity: [1, 0, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
                   )}
                   {(state?.ptcfMetaPrompt || state?.generatedCode) ? <Check className="text-zinc-400" size={18} /> : <Cpu size={18} className="relative z-10" />}
                </motion.div>
                <span className="text-[10px] uppercase tracking-wider font-medium">1. Destilação</span>
             </div>

             {/* Passo 2 */}
             <div className={\`relative flex flex-col items-center gap-2 \${(state?.ptcfMetaPrompt && !state?.generatedCode) ? 'text-zinc-100' : 'text-zinc-600'}\`}>
                <motion.div 
                  className={\`w-9 h-9 rounded-full flex items-center justify-center border transition-all relative \${(state?.ptcfMetaPrompt && !state?.generatedCode && isProcessing) ? 'bg-zinc-800 border-zinc-500' : state?.generatedCode ? 'bg-transparent border-zinc-800' : 'bg-zinc-900/50 border-zinc-800'}\`}
                >
                   {(state?.ptcfMetaPrompt && !state?.generatedCode && isProcessing) && (
                     <motion.div className="absolute inset-0 rounded-full border border-zinc-400/30" animate={{ scale: [1, 1.2, 1], opacity: [1, 0, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
                   )}
                   {state?.generatedCode ? <Check className="text-zinc-400" size={18} /> : <Network size={18} className="relative z-10" />}
                </motion.div>
                <span className="text-[10px] uppercase tracking-wider font-medium">2. Arquitetura</span>
             </div>

             {/* Passo 3 */}
             <div className={\`relative flex flex-col items-center gap-2 \${state?.generatedCode ? 'text-zinc-100' : 'text-zinc-600'}\`}>
                <motion.div 
                  className={\`w-9 h-9 rounded-full flex items-center justify-center border transition-all relative \${(state?.executionStatus === 'CODE_STREAMING' || (isProcessing && state?.generatedCode)) ? 'bg-zinc-800 border-zinc-500' : (state?.executionStatus === 'SUCCESS_VERIFIED' || state?.executionStatus === 'CODE_GENERATED') ? 'bg-transparent border-zinc-800' : 'bg-zinc-900/50 border-zinc-800'}\`}
                >
                   {(state?.executionStatus === 'CODE_STREAMING' || (isProcessing && state?.generatedCode)) && (
                     <motion.div className="absolute inset-0 rounded-full border border-zinc-400/30" animate={{ scale: [1, 1.2, 1], opacity: [1, 0, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
                   )}
                   {(state?.executionStatus === 'SUCCESS_VERIFIED' || state?.executionStatus === 'CODE_GENERATED' && !isProcessing) ? <Check className="text-zinc-400" size={18} /> : <Sparkles size={18} className="relative z-10" />}
                </motion.div>
                <span className="text-[10px] uppercase tracking-wider font-medium">3. Síntese</span>
             </div>
          </div>
          
          {/* Histórico Anterior */}`;

content = content.replace(stepperRegex, newStepper);

fs.writeFileSync(filePath, content, 'utf8');
console.log("Successfully updated App.tsx styles.");
