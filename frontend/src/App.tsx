import React, { useState, useRef, useEffect } from 'react';
import { useAgentStream } from './hooks/useAgentStream';
import { Paperclip, ArrowUp, Check, Loader2, Sparkles, X, FileText, Code2, BookOpen, Download, AlertTriangle, Settings, Copy, Cpu, Network } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useSimulationPacing } from './hooks/useSimulationPacing';

const EXECUTOR_LOADING_MESSAGES = [
  "Provisionando ambiente virtual isolado...",
  "Escrevendo código-fonte estruturado...",
  "Injetando dependências e bibliotecas...",
  "Rodando linters e testes unitários...",
  "Validando compilação (Auto-healing)..."
];

function App() {
  const [prompt, setPrompt] = useState('');
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [docs, setDocs] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [started, setStarted] = useState(false);
  const [execLoadingMsgIdx, setExecLoadingMsgIdx] = useState(0);
  const [history, setHistory] = useState<any[]>([]);
  const [isCopied, setIsCopied] = useState(false);
  
  const { state, isProcessing, error, liveResearchText, livePlanText, liveCodeText, startPlanning, startExecution, resetState } = useAgentStream();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const pacedResearchText = useSimulationPacing(liveResearchText, 25);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state, isProcessing, pacedResearchText, livePlanText, liveCodeText]);

  // Loading Animado do Executor
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isProcessing) {
      interval = setInterval(() => {
        setExecLoadingMsgIdx((prev) => (prev + 1) % EXECUTOR_LOADING_MESSAGES.length);
      }, 3500);
    }
    return () => clearInterval(interval);
  }, [isProcessing]);

  const handleStartPlan = () => {
    if (!prompt.trim()) return;
    if (state && (state.executionStatus === 'SUCCESS_VERIFIED' || state.executionStatus.includes('FAILED'))) {
      setHistory(prev => [...prev, state]);
    }
    setStarted(true);
    setCurrentPrompt(prompt);
    startPlanning(prompt, docs);
    setPrompt('');
  };

  const handleApprove = () => {
    if (state) startExecution(state);
  };

  const handleAdjustPlan = () => {
    document.getElementById('approval-modal')?.classList.add('hidden');
    setPrompt("Por favor, ajuste o plano: ");
    setTimeout(() => {
      const ta = document.getElementById('main-input');
      if (ta) ta.focus();
    }, 100);
  };

  const handleReset = () => {
    setStarted(false);
    setPrompt('');
    setCurrentPrompt('');
    setDocs('');
    setHistory([]);
    resetState();
  };

  const exportMarkdown = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const markdownComponents = {
    code({node, inline, className, children, ...props}: any) {
      const match = /language-(\w+)/.exec(className || '');
      return !inline ? (
        <SyntaxHighlighter
          style={vscDarkPlus as any}
          language={match ? match[1] : 'typescript'}
          PreTag="div"
          customStyle={{ borderRadius: '0.5rem', marginTop: '1rem', marginBottom: '1rem' }}
          {...props}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      ) : (
        <code className="bg-white/10 px-1.5 py-0.5 rounded text-[0.9em] text-zinc-300 font-mono" {...props}>
          {children}
        </code>
      )
    },
    a: ({node, ...props}: any) => <a target="_blank" rel="noopener noreferrer" {...props} />
  };

  return (
    <div className="min-h-screen bg-[#030303] text-zinc-100 flex flex-col items-center relative font-sans selection:bg-purple-500/30 overflow-hidden">
      
      {/* Header Minimalista */}
      <header className={`w-full max-w-5xl px-6 py-6 flex items-center transition-all duration-500 z-10 ${started ? 'justify-start opacity-100' : 'justify-center opacity-0 pointer-events-none absolute top-0'}`}>
         <h1 className="text-xl font-medium bg-gradient-to-r from-zinc-200 to-zinc-400 bg-clip-text text-transparent flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity" onClick={handleReset}>
            <Sparkles className="w-5 h-5 text-zinc-400" /> Context
         </h1>
      </header>

      {/* Título Centralizado Hero */}
      {!started && (
        <div className="flex-1 flex items-center justify-center w-full max-w-3xl px-6 animate-in fade-in zoom-in-95 duration-700">
           <h1 className="text-4xl md:text-5xl font-medium bg-gradient-to-br from-zinc-100 to-zinc-500 bg-clip-text text-transparent mb-20 text-center tracking-tight">
             Context
           </h1>
        </div>
      )}

      {/* Sidebar de Transparência (Sources) */}
      {started && (docs || (state?.extractedSources && state.extractedSources.length > 0)) && (
        <aside 
          onClick={() => setIsModalOpen(true)}
          className="fixed right-6 top-24 w-64 bg-[#0A0A0A]/80 backdrop-blur-md border border-[rgba(255,255,255,0.08)] rounded-2xl p-4 shadow-2xl hidden lg:block animate-in fade-in slide-in-from-right-8 duration-700 transition-all group cursor-pointer hover:border-white/20 hover:-translate-y-1"
          title="Clique para ver detalhes do contexto analisado"
        >
           <h3 className="text-sm font-medium text-zinc-400 flex items-center gap-2 mb-3 group-hover:text-zinc-100 transition-colors">
             <BookOpen className="w-4 h-4" /> Fontes Estudadas
           </h3>
           <div className="flex flex-col gap-2">
             {(docs || state?.rawDocumentContext) && (
               <div className="flex items-center gap-2 bg-zinc-900/50 px-3 py-2 rounded-lg border border-[rgba(255,255,255,0.08)]">
                 <FileText className="w-3.5 h-3.5 text-zinc-300" />
                 <span className="text-xs text-zinc-300 truncate">Documentação Anexada</span>
               </div>
             )}
             {state?.extractedSources?.map((source, idx) => (
               <div key={idx} className="flex items-center gap-2 bg-zinc-900/50 px-3 py-2 rounded-lg border border-[rgba(255,255,255,0.08)] animate-in fade-in zoom-in-95" style={{ animationDelay: `${idx * 150}ms` }}>
                 <Code2 className="w-3.5 h-3.5 text-zinc-300" />
                 <span className="text-xs text-zinc-300 truncate">{source}</span>
               </div>
             ))}
             <p className="text-[10px] text-zinc-600 mt-2 text-center opacity-0 group-hover:opacity-100 transition-opacity">Ver documentação completa</p>
           </div>
        </aside>
      )}

      {/* Timeline de Chat Dinâmica */}
      {started && (
        <main className="flex-1 w-full max-w-3xl flex flex-col gap-6 px-6 pb-40 overflow-y-auto mt-4 custom-scrollbar relative z-0">
          
          {/* Stepper / Timeline Vivo */}
          <div className="w-full flex items-center justify-between mb-4 px-4 relative shrink-0">
             <div className="absolute top-1/2 left-8 right-8 h-px bg-zinc-800 -z-10 -translate-y-1/2" />
             
             {/* Passo 1 */}
             <div className={`relative flex flex-col items-center gap-2 ${(!state?.ptcfMetaPrompt && !state?.generatedCode) ? 'text-zinc-100' : 'text-zinc-600'}`}>
                <motion.div 
                  className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all relative ${(!state?.ptcfMetaPrompt && !state?.generatedCode && isProcessing) ? 'bg-zinc-800 border-zinc-500' : (state?.ptcfMetaPrompt || state?.generatedCode) ? 'bg-transparent border-zinc-800' : 'bg-zinc-900/50 border-zinc-800'}`}
                >
                   {(!state?.ptcfMetaPrompt && !state?.generatedCode && isProcessing) && (
                     <motion.div className="absolute inset-0 rounded-full border border-zinc-400/30" animate={{ scale: [1, 1.2, 1], opacity: [1, 0, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
                   )}
                   {(state?.ptcfMetaPrompt || state?.generatedCode) ? <Check className="text-zinc-400" size={18} /> : <Cpu size={18} className="relative z-10" />}
                </motion.div>
                <span className="text-[10px] uppercase tracking-wider font-medium">1. Destilação</span>
             </div>

             {/* Passo 2 */}
             <div className={`relative flex flex-col items-center gap-2 ${(state?.ptcfMetaPrompt && !state?.generatedCode) ? 'text-zinc-100' : 'text-zinc-600'}`}>
                <motion.div 
                  className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all relative ${(state?.ptcfMetaPrompt && !state?.generatedCode && isProcessing) ? 'bg-zinc-800 border-zinc-500' : state?.generatedCode ? 'bg-transparent border-zinc-800' : 'bg-zinc-900/50 border-zinc-800'}`}
                >
                   {(state?.ptcfMetaPrompt && !state?.generatedCode && isProcessing) && (
                     <motion.div className="absolute inset-0 rounded-full border border-zinc-400/30" animate={{ scale: [1, 1.2, 1], opacity: [1, 0, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
                   )}
                   {state?.generatedCode ? <Check className="text-zinc-400" size={18} /> : <Network size={18} className="relative z-10" />}
                </motion.div>
                <span className="text-[10px] uppercase tracking-wider font-medium">2. Arquitetura</span>
             </div>

             {/* Passo 3 */}
             <div className={`relative flex flex-col items-center gap-2 ${state?.generatedCode ? 'text-zinc-100' : 'text-zinc-600'}`}>
                <motion.div 
                  className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all relative ${(state?.executionStatus === 'CODE_STREAMING' || (isProcessing && state?.generatedCode)) ? 'bg-zinc-800 border-zinc-500' : (state?.executionStatus === 'SUCCESS_VERIFIED' || state?.executionStatus === 'CODE_GENERATED') ? 'bg-transparent border-zinc-800' : 'bg-zinc-900/50 border-zinc-800'}`}
                >
                   {(state?.executionStatus === 'CODE_STREAMING' || (isProcessing && state?.generatedCode)) && (
                     <motion.div className="absolute inset-0 rounded-full border border-zinc-400/30" animate={{ scale: [1, 1.2, 1], opacity: [1, 0, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
                   )}
                   {(state?.executionStatus === 'SUCCESS_VERIFIED' || state?.executionStatus === 'CODE_GENERATED' && !isProcessing) ? <Check className="text-zinc-400" size={18} /> : <Sparkles size={18} className="relative z-10" />}
                </motion.div>
                <span className="text-[10px] uppercase tracking-wider font-medium">3. Síntese</span>
             </div>
          </div>
          
          {/* Histórico Anterior */}
          {history.map((pastState, i) => (
             <React.Fragment key={i}>
               <div className="self-end max-w-[85%] bg-zinc-900/50 px-5 py-4 rounded-2xl rounded-tr-sm opacity-50 hover:opacity-100 transition-opacity">
                 <p className="text-zinc-100 text-[15px] leading-relaxed">{pastState.rawUserPrompt}</p>
               </div>
               <div className="self-start max-w-[100%] flex gap-4 opacity-50 hover:opacity-100 transition-opacity">
                 <div className="w-8 h-8 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center shrink-0 border border-zinc-800 mt-1">
                   <Check className="w-4 h-4 text-zinc-300" />
                 </div>
                 <div className="flex flex-col gap-2 w-full">
                   {pastState.plannerMessage && (
                     <div className="text-zinc-100 text-[15px] mt-1.5 leading-relaxed prose prose-invert prose-p:my-1 prose-headings:text-zinc-100 prose-a:text-zinc-300">
                       <ReactMarkdown components={markdownComponents}>{pastState.plannerMessage}</ReactMarkdown>
                     </div>
                   )}
                   {pastState.generatedCode && (
                     <div className="bg-[#0A0A0A]/80 backdrop-blur-md border border-[rgba(255,255,255,0.08)] rounded-2xl overflow-hidden shadow-xl w-full mt-2">
                       <div className="flex items-center justify-between px-4 py-3 bg-transparent border-b border-[rgba(255,255,255,0.08)]">
                         <span className="text-xs font-mono text-zinc-300/80 flex items-center gap-2"><Code2 className="w-4 h-4"/> output.ts (Arquivado)</span>
                       </div>
                       <div className="max-h-[30vh] overflow-y-auto custom-scrollbar text-[13px]">
                         <SyntaxHighlighter language="typescript" style={vscDarkPlus} customStyle={{ margin: 0, padding: '1.5rem', background: 'transparent' }}>
                           {pastState.generatedCode}
                         </SyntaxHighlighter>
                       </div>
                     </div>
                   )}
                 </div>
               </div>
             </React.Fragment>
          ))}

          {/* Interação Atual */}
          <div className="self-end max-w-[85%] bg-zinc-900/50 px-5 py-4 rounded-2xl rounded-tr-sm animate-in slide-in-from-right-8 fade-in duration-500">
             <p className="text-zinc-100 text-[15px] leading-relaxed">{currentPrompt}</p>
          </div>

          {(isProcessing || state) && (
            <div className="self-start max-w-[90%] flex gap-4 animate-in slide-in-from-bottom-4 fade-in duration-500">
               <div className="w-8 h-8 rounded-full bg-gradient-to-br from-zinc-500/20 to-zinc-400/10 flex items-center justify-center shrink-0 border border-[rgba(255,255,255,0.08)] mt-1">
                 <Sparkles className="w-4 h-4 text-zinc-400" />
               </div>
               
               <div className="flex flex-col gap-2 w-full">
                 {/* Coreografia das Fases: Terminal (Pesquisa) e PTCF (Plano) */}
                 <AnimatePresence mode="wait">
                   {((isProcessing && (!state || !state.executionStatus || state.executionStatus === 'INITIALIZED' || state.executionStatus === 'RESEARCH_STREAMING' || state.executionStatus === 'RESEARCH_COMPLETED')) || (!state?.ptcfMetaPrompt && (state?.executionStatus === 'QUOTA_EXCEEDED' || state?.executionStatus === 'FAILED_RESEARCH' || state?.executionStatus === 'RETRYING_API'))) && (
                     <motion.div 
                       key="research-terminal"
                       initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.4, ease: "easeOut" }}
                       className="flex flex-col gap-3 w-full mt-1.5"
                     >
                       <div className="flex items-center gap-3 text-zinc-300 text-[15px] py-2 animate-pulse bg-[#0A0A0A]/80 backdrop-blur-md border border-[rgba(255,255,255,0.08)] px-4 rounded-xl w-fit shadow-lg shadow-none">
                         <Settings className="w-4 h-4 animate-spin" /> Mapeando componentes e extraindo contexto...
                       </div>
                       <div className="bg-[#0A0A0A]/80 backdrop-blur-md border border-[rgba(255,255,255,0.08)] rounded-2xl overflow-hidden shadow-2xl w-full">
                         <div className="flex items-center justify-between px-4 py-3 bg-transparent border-b border-[rgba(255,255,255,0.08)]">
                            <span className="text-xs font-mono text-zinc-300/80 flex items-center gap-2"><Code2 className="w-4 h-4"/> terminal.log</span>
                         </div>
                         <div className="max-h-[40vh] overflow-y-auto custom-scrollbar text-[13px] font-mono whitespace-pre-wrap p-6 relative">
                             {pacedResearchText ? (
                               <span className="font-mono text-zinc-300">{pacedResearchText}</span>
                             ) : (
                               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 text-zinc-300/70">
                                  <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-zinc-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-zinc-500"></span>
                                  </span>
                                  Conectando ao núcleo de IA...
                               </motion.div>
                             )}
                             
                             {(state?.executionStatus === 'QUOTA_EXCEEDED' || state?.executionStatus === 'FAILED_RESEARCH') && (
                               <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mt-4 p-4 bg-red-950/10 border border-red-500/20 rounded-xl">
                                 <span className="text-red-400 font-mono text-sm">&gt; [FALHA DE REDE] O Google Gemini recusou a conexão por limite de tráfego. Retentando fluxo...</span>
                                 <br />
                                 <motion.button whileTap={{ scale: 0.98 }} onClick={handleReset} className="mt-3 px-4 py-2 border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 rounded-md text-red-300 cursor-pointer font-sans text-[13px] transition-colors">
                                   Tentar Continuar
                                 </motion.button>
                               </motion.div>
                             )}
                         </div>
                       </div>
                     </motion.div>
                   )}
                   {isProcessing && state?.executionStatus === 'RESEARCH_COMPLETED' && (
                    <motion.div 
                      key="research-completed"
                      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }} 
                      className="flex items-center gap-3 text-zinc-300 text-[15px] py-2 mt-1.5 animate-pulse bg-emerald-900/10 border border-zinc-800 px-4 rounded-xl w-fit shadow-lg shadow-none"
                    >
                       <Settings className="w-4 h-4 animate-spin" /> Consolidando pesquisa. Inicializando motor de arquitetura...
                    </motion.div>
                  )}

                  {isProcessing && state?.executionStatus === 'PLANNING_STREAMING' && (
                   <motion.button 
                     key="planning-streaming"
                     onClick={() => document.getElementById('approval-modal')?.classList.remove('hidden')}
                     initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }} 
                     className="flex items-center gap-3 text-zinc-300 text-[15px] py-2 mt-1.5 animate-pulse bg-purple-900/10 border border-purple-500/20 px-4 rounded-xl w-fit shadow-lg shadow-none cursor-pointer hover:bg-purple-900/20 transition-colors"
                   >
                      <Settings className="w-4 h-4 animate-spin" /> Escrevendo Plano Arquitetural PTCF (Clique para visualizar)...
                   </motion.button>
                 )}

                 {state?.executionStatus === 'RETRYING_API' && (
                   <motion.div key="retrying-api" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex items-center gap-3 text-yellow-400 text-[15px] py-2 mt-1.5 animate-pulse bg-yellow-950/10 border border-yellow-500/20 px-4 rounded-xl w-fit shadow-lg shadow-orange-500/5">
                      <AlertTriangle className="w-4 h-4 animate-bounce" /> {state.errorFeedbackLog || "Atraso na API detectado. Aplicando retentativa de segurança..."}
                   </motion.div>
                 )}

                 {/* Tratamento Gracioso de Falha Absoluta (Max Retries Esgotado ou 429) */}
                 {((state?.executionStatus?.includes('FAILED') && !state?.executionStatus?.includes('CODING') && !state?.executionStatus?.includes('COMPILATION') && state?.executionStatus !== 'FAILED_RESEARCH') || (state?.executionStatus === 'QUOTA_EXCEEDED' && state?.ptcfMetaPrompt)) && (
                     <motion.div key="failed-modal" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="flex flex-col items-center justify-center gap-4 mt-4 mb-4 p-8 bg-yellow-950/10 border border-yellow-500/20 rounded-2xl shadow-xl">
                        <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center mb-2">
                          <X className="w-6 h-6 text-yellow-400" />
                        </div>
                        <p className="text-yellow-100 text-[15px] text-center leading-relaxed">
                          <AlertTriangle className="w-4 h-4 inline-block mr-1 -mt-0.5 text-yellow-500" /> A cota temporária de requisições foi excedida ou houve falha de conexão. Tente novamente ou reduza o tamanho da documentação anexa.
                        </p>
                        <div className="flex items-center gap-3 mt-4">
                          {(state.executionStatus === 'FAILED_CODING' || state.executionStatus === 'FAILED_COMPILATION' || (state.executionStatus === 'QUOTA_EXCEEDED' && state.ptcfMetaPrompt)) ? (
                            <button onClick={() => startExecution(state)} className="flex items-center gap-2 px-6 py-2.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 rounded-full text-sm font-medium text-yellow-100 transition-colors cursor-pointer border border-yellow-500/20">
                              <Code2 className="w-4 h-4" /> Retomar Geração de Código
                            </button>
                          ) : (
                            <button onClick={handleReset} className="flex items-center gap-2 px-6 py-2.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 rounded-full text-sm font-medium text-yellow-100 transition-colors cursor-pointer border border-yellow-500/20">
                              Reiniciar Tudo
                            </button>
                          )}
                        </div>
                     </motion.div>
                 )}

                 {/* Exibição do Plano (agora permanece visível mesmo após gerar código) */}
                 {(state?.plannerMessage || state?.executionStatus === 'PLANNING_COMPLETED') && (
                    <motion.div key="planner-ptcf" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.4 }} className="flex flex-col gap-4 mb-2 mt-2">
                      <div className="text-[#F3F4F6] text-[15px] mt-1.5 leading-relaxed prose prose-invert prose-p:my-1 prose-headings:text-zinc-100 prose-a:text-zinc-300">
                         <ReactMarkdown components={markdownComponents}>{(state.plannerMessage || "Plano gerado e aguardando sua revisão.").replace(/<\/?MESSAGE>/gi, '').replace(/<\/?PLAN>/gi, '')}</ReactMarkdown>
                      </div>
                      {(!state.generatedCode && !isProcessing) && (
                        <motion.button 
                          whileHover={{ scale: 1.02 }} 
                          whileTap={{ scale: 0.98 }}
                          onClick={() => document.getElementById('approval-modal')?.classList.remove('hidden')} 
                          className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium text-black bg-zinc-100 hover:bg-white text-zinc-950 transition-colors cursor-pointer w-fit mt-2 shadow-lg shadow-white/5"
                        >
                          <Check className="w-4 h-4" /> Revisar e Aprovar Plano
                        </motion.button>
                      )}
                    </motion.div>
                 )}
                 </AnimatePresence>
               </div>
            </div>
          )}

          {/* Modal de Approval */}
          {((isProcessing && state?.executionStatus === 'PLANNING_STREAMING') || 
            (state?.executionStatus === 'PLANNING_COMPLETED' && !state.generatedCode && !isProcessing)) && (
            <div id="approval-modal" onClick={() => document.getElementById('approval-modal')?.classList.add('hidden')} className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-zinc-950/80 animate-in fade-in duration-300 cursor-pointer">
              <div onClick={(e) => e.stopPropagation()} className="bg-zinc-900/50 border border-zinc-800 rounded-3xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl backdrop-blur-xl cursor-auto">
                <div className="p-6 border-b border-[rgba(255,255,255,0.08)] flex justify-between items-center bg-[#0A0A0A]/80 backdrop-blur-md">
                   <h2 className="text-xl font-medium text-zinc-100 flex items-center gap-2">
                     <Sparkles className="w-5 h-5 text-zinc-300" /> 
                     Plano de Ação (PTCF)
                   </h2>
                   <button onClick={() => document.getElementById('approval-modal')?.classList.add('hidden')} className="text-zinc-600 hover:text-zinc-100 transition-colors p-1 rounded-full hover:bg-white/5 cursor-pointer">
                      <X className="w-5 h-5" />
                   </button>
                </div>
                
                {/* Formatação Rica via React Markdown */}
                <div className="p-8 overflow-y-auto custom-scrollbar prose prose-invert max-w-none text-zinc-300 prose-headings:text-zinc-100 prose-a:text-zinc-300 prose-strong:text-zinc-300">
                   <ReactMarkdown components={markdownComponents}>
                     {(state.executionStatus === 'PLANNING_STREAMING' ? (livePlanText || '') : (state.ptcfMetaPrompt || '')).replace(/<\/?MESSAGE>/gi, '').replace(/<\/?PLAN>/gi, '')}
                   </ReactMarkdown>
                </div>

                <div className="p-6 bg-[#0A0A0A]/80 backdrop-blur-md border-t border-[rgba(255,255,255,0.08)] flex justify-end gap-3">
                   {state.executionStatus === 'PLANNING_STREAMING' ? (
                       <div className="flex items-center gap-2 text-zinc-300 text-sm">
                           <Loader2 className="w-4 h-4 animate-spin" /> Escrevendo Plano ao vivo...
                       </div>
                   ) : (
                       <>
                         <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => exportMarkdown((state?.ptcfMetaPrompt || '').replace(/<\/?MESSAGE>/gi, '').replace(/<\/?PLAN>/gi, ''), 'plano-de-acao')} className="px-5 py-3 rounded-full text-sm font-medium text-zinc-300 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer flex items-center gap-2">
                           <Download className="w-4 h-4" /> Exportar .md
                         </motion.button>
                         <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleAdjustPlan} className="px-6 py-3 rounded-full text-sm font-medium text-zinc-300 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
                           Ajustar Plano
                         </motion.button>
                         <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => { document.getElementById('approval-modal')?.classList.add('hidden'); handleApprove(); }} className="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-medium text-zinc-950 bg-zinc-100 hover:bg-white transition-opacity cursor-pointer shadow-lg shadow-white/5">
                           <Check className="w-4 h-4" /> Aprovar e Gerar Código
                         </motion.button>
                       </>
                   )}
                </div>
              </div>
            </div>
          )}

          {/* Execução de Código */}
          {state?.executionStatus && (state.executionStatus === 'CODE_STREAMING' || state.executionStatus === 'CODE_GENERATED' || state.executionStatus === 'SUCCESS_VERIFIED' || state.executionStatus === 'FAILED_COMPILATION' || state.executionStatus === 'FAILED_CODING' || (isProcessing && state.ptcfMetaPrompt) || (error && state.ptcfMetaPrompt)) && (
            <div className="self-start max-w-[100%] w-full flex gap-4 animate-in slide-in-from-bottom-4 fade-in duration-500 mt-2">
               <div className="w-8 h-8 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center shrink-0 border border-zinc-800 mt-1">
                 <Check className="w-4 h-4 text-zinc-300" />
               </div>
               
               <div className="flex flex-col gap-3 w-full border border-[rgba(255,255,255,0.08)] bg-[#141414]/50 rounded-2xl p-5">
                 <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] pb-3">
                   <h3 className="text-zinc-300 font-medium text-sm flex items-center gap-2">
                     {isProcessing ? (
                       <><Loader2 className="w-4 h-4 animate-spin" /> Escrevendo e testando código na Sandbox...</>
                     ) : (
                       <><Check className="w-4 h-4" /> Plano Aprovado. Código Gerado.</>
                     )}
                   </h3>
                 </div>

                 {state?.executorMessage && (
                    <div className="bg-[#0A0A0A]/80 backdrop-blur-md border border-[rgba(255,255,255,0.08)] p-3 rounded-xl mb-1 animate-in fade-in duration-500 text-zinc-300 text-sm">
                       {state.executorMessage}
                    </div>
                 )}

                 {isProcessing && state.executionStatus !== 'CODE_STREAMING' && (
                    <div className="flex items-center gap-3 text-zinc-400 text-[15px] py-1 mt-1.5 animate-pulse">
                      {state.errorFeedbackLog 
                        ? <span className="text-amber-500">Auto-reparo ativado: corrigindo erro do compilador...</span>
                        : EXECUTOR_LOADING_MESSAGES[execLoadingMsgIdx]
                      }
                    </div>
                 )}

                 {/* LIVE CODE STREAMING */}
                 {isProcessing && state.executionStatus === 'CODE_STREAMING' && (
                     <div className="flex flex-col gap-3 animate-in fade-in duration-500 w-full mt-1.5">
                       <p className="text-zinc-100 text-[15px]">Gerando código em tempo real...</p>
                       <div className="bg-[#0A0A0A]/80 backdrop-blur-md border border-[rgba(255,255,255,0.08)] rounded-2xl overflow-hidden shadow-2xl w-full">
                         <div className="flex items-center justify-between px-4 py-3 bg-transparent border-b border-[rgba(255,255,255,0.08)]">
                            <span className="text-xs font-mono text-zinc-300/80 flex items-center gap-2"><Code2 className="w-4 h-4"/> output.ts (Stream)</span>
                         </div>
                         <div className="max-h-[60vh] overflow-y-auto custom-scrollbar text-[13px] text-zinc-300 font-mono whitespace-pre-wrap p-6">
                             {liveCodeText}
                         </div>
                       </div>
                     </div>
                 )}

                 {state?.generatedCode && (state.executionStatus === 'SUCCESS_VERIFIED' || state.executionStatus === 'CODE_GENERATED') && !isProcessing && (
                    <div className="flex flex-col gap-3 animate-in fade-in duration-500 w-full mt-1.5">
                      <p className="text-zinc-100 text-[15px]">Código gerado e verificado com sucesso pelo Node.js (tsx).</p>
                      <div className="bg-[#0A0A0A]/80 backdrop-blur-md border border-[rgba(255,255,255,0.08)] rounded-2xl overflow-hidden shadow-2xl w-full">
                        <div className="flex items-center justify-between px-4 py-3 bg-transparent border-b border-[rgba(255,255,255,0.08)]">
                           <span className="text-xs font-mono text-zinc-300/80 flex items-center gap-2"><Code2 className="w-4 h-4"/> output.ts</span>
                           <motion.button 
                             whileHover={{ scale: 1.05 }}
                             whileTap={{ scale: 0.95 }}
                             onClick={() => {
                               navigator.clipboard.writeText(state.generatedCode || '');
                               setIsCopied(true);
                               setTimeout(() => setIsCopied(false), 2000);
                             }}
                             className="text-xs font-medium bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full text-zinc-300 transition-colors cursor-pointer flex items-center gap-2"
                           >
                             {isCopied ? <><Check className="w-4 h-4 text-zinc-300" /> Copiado</> : <><Copy className="w-4 h-4" /> Copiar Código</>}
                           </motion.button>
                        </div>
                        <div className="max-h-[60vh] overflow-y-auto custom-scrollbar text-[13px]">
                           {/* Highlight nativo do TypeScript */}
                           <SyntaxHighlighter 
                             language="typescript" 
                             style={vscDarkPlus as any}
                             customStyle={{ margin: 0, padding: '1.5rem', background: 'transparent' }}
                           >
                             {state.generatedCode}
                           </SyntaxHighlighter>
                        </div>
                      </div>
                    </div>
                 )}

                 {!isProcessing && (state?.executionStatus === 'FAILED_CODING' || state?.executionStatus === 'FAILED_COMPILATION') && (
                    <div className="flex flex-col gap-2 mt-2 animate-in fade-in duration-300">
                       <p className="text-red-400 text-[15px] font-medium flex items-center gap-2">
                         Ocorreu um erro na Geração de Código
                       </p>
                       <div className="bg-red-950/10 border border-red-500/20 rounded-xl p-3 text-[13px] font-mono text-red-300/80 break-words whitespace-pre-wrap">
                         {state?.errorFeedbackLog || "Ocorreu um erro desconhecido na API do Gemini."}
                       </div>
                       
                       {state?.generatedCode && (
                          <details className="mt-2 text-zinc-400 text-sm">
                             <summary className="cursor-pointer hover:text-zinc-300">Ver Código Inválido Gerado</summary>
                             <div className="mt-2 bg-[#0A0A0A]/80 backdrop-blur-md border border-[rgba(255,255,255,0.08)] rounded-xl p-3 text-[12px] font-mono whitespace-pre-wrap overflow-x-auto">
                               {state.generatedCode}
                             </div>
                          </details>
                       )}

                       <button onClick={handleReset} className="self-start mt-1 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full text-xs font-medium text-zinc-300 transition-colors cursor-pointer">
                         Voltar e Tentar Novamente
                       </button>
                    </div>
                 )}
                 {error && (
                   <p className="text-red-400 text-sm mt-2">{error}</p>
                 )}
               </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </main>
      )}

      {/* Barra Inferior (Input Flutuante) */}
      <div className="fixed bottom-0 left-0 w-full bg-gradient-to-t from-[#131314] via-[#131314] to-transparent pt-12 pb-6 px-6 z-20 pointer-events-none">
         <div className="max-w-3xl mx-auto flex items-end gap-3 bg-[#0A0A0A]/80 backdrop-blur-md p-2 pr-2 pl-2 rounded-[28px] shadow-2xl transition-all duration-300 pointer-events-auto border border-[rgba(255,255,255,0.08)]">
            
            <button 
              onClick={() => setIsModalOpen(true)}
              className={`p-3 ml-1 rounded-full flex items-center justify-center shrink-0 transition-all cursor-pointer ${docs ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-100'}`}
              title="Anexar Documentação"
              disabled={isProcessing}
            >
              <Paperclip className="w-5 h-5" />
            </button>

            <textarea 
              id="main-input"
              rows={1}
              className="flex-1 bg-transparent border-none text-zinc-100 placeholder-gray-500 text-[15px] resize-none outline-none py-3 px-2 max-h-32 min-h-[44px]"
              placeholder={state?.executionStatus === 'SUCCESS_VERIFIED' ? "Quer adicionar mais alguma coisa a este código?" : "O que você quer criar hoje?"}
              value={prompt}
              onChange={(e) => {
                 setPrompt(e.target.value);
                 e.target.style.height = 'auto';
                 e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
              }}
              onKeyDown={(e) => {
                 if (e.key === 'Enter' && !e.shiftKey) {
                   e.preventDefault();
                   if (!started && !isProcessing) handleStartPlan();
                 }
              }}
              disabled={isProcessing}
            />

            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleStartPlan}
              disabled={!prompt.trim() || isProcessing}
              className="p-2.5 rounded-full bg-zinc-100 text-zinc-950 shrink-0 hover:bg-white transition-all cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed self-end mb-0.5"
            >
              <ArrowUp className="w-5 h-5" />
            </motion.button>
         </div>
      </div>

      {/* Modal Minimalista de Contexto/Documentação */}
      {isModalOpen && (
        <div onClick={() => setIsModalOpen(false)} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 cursor-pointer">
           <div onClick={(e) => e.stopPropagation()} className="bg-[#0A0A0A]/90 backdrop-blur-xl border border-[rgba(255,255,255,0.08)] rounded-3xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 cursor-auto">
             <div className="flex items-center justify-between p-6 pb-4 bg-[#0A0A0A]/80 backdrop-blur-md/50 border-b border-[rgba(255,255,255,0.08)]">
                <h3 className="text-lg font-medium text-zinc-100">{state ? 'Rastreamento de Pesquisa e Contexto' : 'Adicionar Contexto'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-zinc-600 hover:text-zinc-100 transition-colors p-1 rounded-full hover:bg-white/5 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
             </div>
             <div className="p-8 overflow-y-auto custom-scrollbar">
                {state ? (
                  <div className="w-full prose prose-invert max-w-none prose-p:text-[14.5px] prose-headings:text-zinc-100 prose-a:text-zinc-300 prose-strong:text-zinc-300">
                    {state.rawDocumentContext && (
                       <>
                         <h3 className="text-zinc-400 uppercase text-xs tracking-wider mb-2 font-mono">Documentação Anexada Pelo Usuário</h3>
                         <div className="bg-[#0A0A0A]/80 backdrop-blur-md p-4 rounded-xl mb-6 font-mono text-[13px] text-zinc-400 whitespace-pre-wrap border border-[rgba(255,255,255,0.08)]">
                           {state.rawDocumentContext}
                         </div>
                         <hr className="border-[rgba(255,255,255,0.08)] my-6" />
                       </>
                    )}
                    <h3 className="text-zinc-400 uppercase text-xs tracking-wider mb-4 font-mono">Relatório da Base de Conhecimento (IA)</h3>
                    <ReactMarkdown components={markdownComponents}>
                      {`${state.compressedContext || "*Gerando rastreamento da pesquisa...*"}\n\n${state.extractedSources && state.extractedSources.length > 0 ? `### Fontes e Links Referenciados\n${state.extractedSources.map(s => {
                        const clean = s.trim();
                        const isDomain = /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?:\/[^\s]*)?$/.test(clean) || clean.startsWith('http');
                        if (isDomain && !clean.includes(' ')) {
                          const href = clean.startsWith('http') ? clean : 'https://' + clean;
                          return `- [${clean}](${href})`;
                        }
                        return `- ${clean}`;
                      }).join('\n')}` : ''}`}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <textarea 
                    className="w-full h-64 bg-[#030303] rounded-2xl p-4 text-[14px] text-zinc-300 focus:outline-none resize-none font-mono custom-scrollbar border border-[rgba(255,255,255,0.08)]"
                    placeholder="Cole o texto da documentação ou contexto base aqui..."
                    value={docs}
                    onChange={(e) => setDocs(e.target.value)}
                  />
                )}
             </div>
             <div className="p-6 bg-[#0A0A0A]/80 backdrop-blur-md border-t border-[rgba(255,255,255,0.08)] flex justify-end gap-3">
                {state && (
                  <button onClick={() => exportMarkdown(`${state.rawDocumentContext ? `[DOCUMENTAÇÃO ORIGINAL]\n${state.rawDocumentContext}\n\n` : ''}[RELATÓRIO DA IA]\n${state.compressedContext}\n\n[FONTES]\n${state.extractedSources?.join('\n')}`, 'rastreamento-pesquisa')} className="px-5 py-2.5 bg-white/5 text-zinc-300 rounded-full font-medium text-sm hover:bg-white/10 transition-colors cursor-pointer flex items-center gap-2">
                    <Download className="w-4 h-4" /> Exportar .md
                  </button>
                )}
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 bg-zinc-100 text-zinc-950 rounded-full font-medium text-sm hover:bg-white transition-colors cursor-pointer">
                   Concluir
                </motion.button>
             </div>
           </div>
        </div>
      )}

      {/* Global CSS Inject */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}</style>
    </div>
  );
}

export default App;
