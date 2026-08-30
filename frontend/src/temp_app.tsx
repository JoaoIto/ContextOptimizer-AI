import React, { useState, useRef, useEffect } from 'react';
import { useAgentStream } from './hooks/useAgentStream';
import { Paperclip, ArrowUp, Check, Loader2, Sparkles, X, FileText, Code2, BookOpen, Download } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

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
  
  const { state, isProcessing, error, liveResearchText, livePlanText, liveCodeText, startPlanning, startExecution, resetState } = useAgentStream();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state, isProcessing, liveResearchText, livePlanText, liveCodeText]);

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
        <code className="bg-white/10 px-1.5 py-0.5 rounded text-[0.9em] text-purple-300 font-mono" {...props}>
          {children}
        </code>
      )
    },
    a: ({node, ...props}: any) => <a target="_blank" rel="noopener noreferrer" {...props} />
  };

  return (
    <div className="min-h-screen bg-[#131314] text-gray-100 flex flex-col items-center relative font-sans selection:bg-purple-500/30 overflow-hidden">
      
      {/* Header Minimalista */}
      <header className={`w-full max-w-5xl px-6 py-6 flex items-center transition-all duration-500 z-10 ${started ? 'justify-start opacity-100' : 'justify-center opacity-0 pointer-events-none absolute top-0'}`}>
         <h1 className="text-xl font-medium bg-gradient-to-r from-gray-200 to-gray-400 bg-clip-text text-transparent flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity" onClick={handleReset}>
            <Sparkles className="w-5 h-5 text-gray-400" /> Context
         </h1>
      </header>

      {/* Título Centralizado Hero */}
      {!started && (
        <div className="flex-1 flex items-center justify-center w-full max-w-3xl px-6 animate-in fade-in zoom-in-95 duration-700">
           <h1 className="text-4xl md:text-5xl font-medium bg-gradient-to-br from-gray-100 to-gray-500 bg-clip-text text-transparent mb-20 text-center tracking-tight">
             Context
           </h1>
        </div>
      )}

      {/* Sidebar de Transparência (Sources) */}
      {started && (docs || (state?.extractedSources && state.extractedSources.length > 0)) && (
        <aside 
          onClick={() => setIsModalOpen(true)}
          className="fixed right-6 top-24 w-64 bg-[#1e1e1e] border border-white/5 rounded-2xl p-4 shadow-2xl hidden lg:block animate-in fade-in slide-in-from-right-8 duration-700 transition-all group cursor-pointer hover:border-white/20 hover:-translate-y-1"
          title="Clique para ver detalhes do contexto analisado"
        >
           <h3 className="text-sm font-medium text-gray-400 flex items-center gap-2 mb-3 group-hover:text-gray-200 transition-colors">
             <BookOpen className="w-4 h-4" /> Fontes Estudadas
           </h3>
           <div className="flex flex-col gap-2">
             {(docs || state?.rawDocumentContext) && (
               <div className="flex items-center gap-2 bg-[#2a2a2a] px-3 py-2 rounded-lg border border-white/5">
                 <FileText className="w-3.5 h-3.5 text-blue-400" />
                 <span className="text-xs text-gray-300 truncate">Documentação Anexada</span>
               </div>
             )}
             {state?.extractedSources?.map((source, idx) => (
               <div key={idx} className="flex items-center gap-2 bg-[#2a2a2a] px-3 py-2 rounded-lg border border-white/5 animate-in fade-in zoom-in-95" style={{ animationDelay: `${idx * 150}ms` }}>
                 <Code2 className="w-3.5 h-3.5 text-emerald-400" />
                 <span className="text-xs text-gray-300 truncate">{source}</span>
               </div>
             ))}
             <p className="text-[10px] text-gray-500 mt-2 text-center opacity-0 group-hover:opacity-100 transition-opacity">Ver documentação completa</p>
           </div>
        </aside>
      )}

      {/* Timeline de Chat Dinâmica */}
      {started && (
        <main className="flex-1 w-full max-w-3xl flex flex-col gap-6 px-6 pb-40 overflow-y-auto mt-4 custom-scrollbar relative z-0">
          
          {/* Histórico Anterior */}
          {history.map((pastState, i) => (
             <React.Fragment key={i}>
               <div className="self-end max-w-[85%] bg-[#2a2a2a] px-5 py-4 rounded-2xl rounded-tr-sm opacity-50 hover:opacity-100 transition-opacity">
                 <p className="text-gray-200 text-[15px] leading-relaxed">{pastState.rawUserPrompt}</p>
               </div>
               <div className="self-start max-w-[100%] flex gap-4 opacity-50 hover:opacity-100 transition-opacity">
                 <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-400/10 flex items-center justify-center shrink-0 border border-emerald-500/20 mt-1">
                   <Check className="w-4 h-4 text-emerald-400" />
                 </div>
                 <div className="flex flex-col gap-2 w-full">
                   {pastState.plannerMessage && (
                     <div className="text-gray-200 text-[15px] mt-1.5 leading-relaxed prose prose-invert prose-p:my-1 prose-headings:text-gray-100 prose-a:text-purple-400">
                       <ReactMarkdown components={markdownComponents}>{pastState.plannerMessage}</ReactMarkdown>
                     </div>
                   )}
                   {pastState.generatedCode && (
                     <div className="bg-[#18181b] border border-white/10 rounded-2xl overflow-hidden shadow-xl w-full mt-2">
                       <div className="flex items-center justify-between px-4 py-3 bg-[#222] border-b border-white/5">
                         <span className="text-xs font-mono text-emerald-400/80 flex items-center gap-2"><Code2 className="w-4 h-4"/> output.ts (Arquivado)</span>
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
          <div className="self-end max-w-[85%] bg-[#2a2a2a] px-5 py-4 rounded-2xl rounded-tr-sm animate-in slide-in-from-right-8 fade-in duration-500">
             <p className="text-gray-200 text-[15px] leading-relaxed">{currentPrompt}</p>
          </div>

          {(isProcessing || state) && (
            <div className="self-start max-w-[90%] flex gap-4 animate-in slide-in-from-bottom-4 fade-in duration-500">
               <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-500/20 to-gray-400/10 flex items-center justify-center shrink-0 border border-white/5 mt-1">
                 <Sparkles className="w-4 h-4 text-gray-400" />
               </div>
               
               <div className="flex flex-col gap-2 w-full">
                 
                 {/* Live Streaming Texts e Terminal de Compressão */}
                 {(!state || (isProcessing && (state.executionStatus === 'INITIALIZED' || state.executionStatus === 'RESEARCH_STREAMING'))) && (
                     <div className="flex flex-col gap-3 animate-in fade-in duration-500 w-full mt-1.5">
                       <div className="flex items-center gap-3 text-blue-400 text-[15px] py-2 animate-pulse bg-blue-900/10 border border-blue-500/20 px-4 rounded-xl w-fit">
                         <Loader2 className="w-4 h-4 animate-spin" /> ⚙️ Mapeando componentes para: {currentPrompt}
                       </div>
                       <div className="bg-[#18181b] border border-white/10 rounded-2xl overflow-hidden shadow-2xl w-full">
                         <div className="flex items-center justify-between px-4 py-3 bg-[#222] border-b border-white/5">
                            <span className="text-xs font-mono text-blue-400/80 flex items-center gap-2"><Code2 className="w-4 h-4"/> terminal.log</span>
                         </div>
                         <div className="max-h-[40vh] overflow-y-auto custom-scrollbar text-[13px] text-emerald-400 font-mono whitespace-pre-wrap p-6">
                             {liveResearchText || "Conectando ao núcleo de IA..."}
                         </div>
                       </div>
                     </div>
                 )}
                 {isProcessing && state?.executionStatus === 'PLANNING_STREAMING' && (
                     <div className="flex items-center gap-3 text-purple-400 text-[15px] py-2 mt-1.5 animate-pulse bg-purple-900/10 border border-purple-500/20 px-4 rounded-xl w-fit">
                        <Loader2 className="w-4 h-4 animate-spin" /> Escrevendo Plano PTCF...
                     </div>
                 )}

                 {/* Tratamento Gracioso de Falha Absoluta (Max Retries Esgotado ou 429) */}
                 {(state?.executionStatus === 'QUOTA_EXCEEDED' || (state?.executionStatus?.includes('FAILED') && !state?.executionStatus?.includes('CODING') && !state?.executionStatus?.includes('COMPILATION')) || (error && (!state || state.executionStatus === 'INITIALIZED' || state.executionStatus === 'RESEARCH_COMPLETED' || state.executionStatus === 'RETRYING_API'))) && (
                     <div className="flex flex-col items-center justify-center gap-4 mt-4 mb-4 p-8 bg-orange-900/10 border border-orange-500/20 rounded-2xl animate-in zoom-in-95 duration-500 shadow-xl">
                        <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center mb-2">
                          <X className="w-6 h-6 text-orange-400" />
                        </div>
                        <p className="text-orange-200 text-[15px] text-center leading-relaxed">
                          ⚠️ A cota temporária de requisições foi excedida ou houve falha de conexão. Tente novamente ou reduza o tamanho da documentação anexa.
                        </p>
                        <button onClick={handleReset} className="mt-4 flex items-center gap-2 px-6 py-2.5 bg-orange-500/20 hover:bg-orange-500/30 rounded-full text-sm font-medium text-orange-200 transition-colors cursor-pointer border border-orange-500/30">
                          Tentar Novamente
                        </button>
                     </div>
                 )}

                 {state?.executionStatus === 'PLANNING_COMPLETED' && !state.generatedCode && !isProcessing && (
                    <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                      <div className="text-gray-200 text-[15px] mt-1.5 leading-relaxed prose prose-invert prose-p:my-1 prose-headings:text-gray-100 prose-a:text-purple-400">
                         <ReactMarkdown components={markdownComponents}>{state.plannerMessage || "Plano gerado e aguardando sua revisão."}</ReactMarkdown>
                      </div>
                      <button onClick={() => document.getElementById('approval-modal')?.classList.remove('hidden')} className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium text-black bg-gray-200 hover:bg-white transition-all cursor-pointer w-fit mt-2">
                        <Check className="w-4 h-4" /> Revisar e Aprovar Plano
                      </button>
                    </div>
                 )}
               </div>
            </div>
          )}

          {/* Modal de Approval */}
          {((isProcessing && state?.executionStatus === 'PLANNING_STREAMING') || 
            (state?.executionStatus === 'PLANNING_COMPLETED' && !state.generatedCode && !isProcessing)) && (
            <div id="approval-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
              <div className="bg-[#18181b] border border-white/10 rounded-3xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#1e1e1e]">
                   <h2 className="text-xl font-medium text-gray-100 flex items-center gap-2">
                     <Sparkles className="w-5 h-5 text-purple-400" /> 
                     Plano de Ação (PTCF)
                   </h2>
                   {state?.executionStatus === 'PLANNING_COMPLETED' && (
                     <button onClick={() => document.getElementById('approval-modal')?.classList.add('hidden')} className="p-2 hover:bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors cursor-pointer">
                       <X className="w-5 h-5" />
                     </button>
                   )}
                </div>
                
                {/* Formatação Rica via React Markdown */}
                <div className="p-8 overflow-y-auto custom-scrollbar prose prose-invert max-w-none text-gray-300 prose-headings:text-gray-100 prose-a:text-purple-400 prose-strong:text-emerald-400">
                   <ReactMarkdown components={markdownComponents}>
                     {state.executionStatus === 'PLANNING_STREAMING' ? livePlanText : (state.ptcfMetaPrompt || '')}
                   </ReactMarkdown>
                </div>

                <div className="p-6 bg-[#1e1e1e] border-t border-white/5 flex justify-end gap-3">
                   {state.executionStatus === 'PLANNING_STREAMING' ? (
                       <div className="flex items-center gap-2 text-purple-400 text-sm">
                           <Loader2 className="w-4 h-4 animate-spin" /> Escrevendo Plano ao vivo...
                       </div>
                   ) : (
                       <>
                         <button onClick={() => exportMarkdown(state?.ptcfMetaPrompt || '', 'plano-de-acao')} className="px-5 py-3 rounded-full text-sm font-medium text-gray-300 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer flex items-center gap-2">
                           <Download className="w-4 h-4" /> Exportar .md
                         </button>
                         <button onClick={handleAdjustPlan} className="px-6 py-3 rounded-full text-sm font-medium text-gray-300 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
                           Ajustar Plano
                         </button>
                         <button onClick={() => { document.getElementById('approval-modal')?.classList.add('hidden'); handleApprove(); }} className="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-medium text-black bg-gradient-to-r from-gray-200 to-white hover:opacity-90 transition-opacity cursor-pointer shadow-lg shadow-white/5">
                           <Check className="w-4 h-4" /> Aprovar e Gerar Código
                         </button>
                       </>
                   )}
                </div>
              </div>
            </div>
          )}

          {/* Execução de Código */}
          {state?.executionStatus && (state.executionStatus === 'CODE_STREAMING' || state.executionStatus === 'CODE_GENERATED' || state.executionStatus === 'SUCCESS_VERIFIED' || state.executionStatus === 'FAILED_COMPILATION' || (isProcessing && state.ptcfMetaPrompt) || (error && state.ptcfMetaPrompt)) && (
            <div className="self-start max-w-[100%] w-full flex gap-4 animate-in slide-in-from-bottom-4 fade-in duration-500 mt-2">
               <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-400/10 flex items-center justify-center shrink-0 border border-emerald-500/20 mt-1">
                 <Check className="w-4 h-4 text-emerald-400" />
               </div>
               
               <div className="flex flex-col gap-3 w-full border border-white/5 bg-[#141414]/50 rounded-2xl p-5">
                 <div className="flex items-center justify-between border-b border-white/5 pb-3">
                   <h3 className="text-emerald-400 font-medium text-sm flex items-center gap-2">
                     {isProcessing ? (
                       <><Loader2 className="w-4 h-4 animate-spin" /> Escrevendo e testando código na Sandbox...</>
                     ) : (
                       <><Check className="w-4 h-4" /> Plano Aprovado. Código Gerado.</>
                     )}
                   </h3>
                 </div>

                 {state?.executorMessage && (
                    <div className="bg-[#18181b] border border-white/5 p-3 rounded-xl mb-1 animate-in fade-in duration-500 text-gray-300 text-sm">
                       {state.executorMessage}
                    </div>
                 )}

                 {isProcessing && state.executionStatus !== 'CODE_STREAMING' && (
                    <div className="flex items-center gap-3 text-gray-400 text-[15px] py-1 mt-1.5 animate-pulse">
                      {state.errorFeedbackLog 
                        ? <span className="text-amber-500">Auto-reparo ativado: corrigindo erro do compilador...</span>
                        : EXECUTOR_LOADING_MESSAGES[execLoadingMsgIdx]
                      }
                    </div>
                 )}

                 {/* LIVE CODE STREAMING */}
                 {isProcessing && state.executionStatus === 'CODE_STREAMING' && (
                     <div className="flex flex-col gap-3 animate-in fade-in duration-500 w-full mt-1.5">
                       <p className="text-gray-200 text-[15px]">Gerando código em tempo real...</p>
                       <div className="bg-[#18181b] border border-white/10 rounded-2xl overflow-hidden shadow-2xl w-full">
                         <div className="flex items-center justify-between px-4 py-3 bg-[#222] border-b border-white/5">
                            <span className="text-xs font-mono text-emerald-400/80 flex items-center gap-2"><Code2 className="w-4 h-4"/> output.ts (Stream)</span>
                         </div>
                         <div className="max-h-[60vh] overflow-y-auto custom-scrollbar text-[13px] text-emerald-300 font-mono whitespace-pre-wrap p-6">
                             {liveCodeText}
                         </div>
                       </div>
                     </div>
                 )}

                 {state?.generatedCode && (state.executionStatus === 'SUCCESS_VERIFIED' || state.executionStatus === 'CODE_GENERATED') && !isProcessing && (
                    <div className="flex flex-col gap-3 animate-in fade-in duration-500 w-full mt-1.5">
                      <p className="text-gray-200 text-[15px]">Código gerado e verificado com sucesso pelo Node.js (tsx).</p>
                      <div className="bg-[#18181b] border border-white/10 rounded-2xl overflow-hidden shadow-2xl w-full">
                        <div className="flex items-center justify-between px-4 py-3 bg-[#222] border-b border-white/5">
                           <span className="text-xs font-mono text-emerald-400/80 flex items-center gap-2"><Code2 className="w-4 h-4"/> output.ts</span>
                           <button 
                             onClick={() => navigator.clipboard.writeText(state.generatedCode || '')}
                             className="text-xs font-medium bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full text-gray-300 transition-colors cursor-pointer"
                           >
                             Copiar Código
                           </button>
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
                       <div className="bg-red-950/30 border border-red-500/20 rounded-xl p-3 text-[13px] font-mono text-red-300/80 break-words whitespace-pre-wrap">
                         {state?.errorFeedbackLog || "Ocorreu um erro desconhecido na API do Gemini."}
                       </div>
                       
                       {state?.generatedCode && (
                          <details className="mt-2 text-gray-400 text-sm">
                             <summary className="cursor-pointer hover:text-gray-300">Ver Código Inválido Gerado</summary>
                             <div className="mt-2 bg-[#18181b] border border-white/5 rounded-xl p-3 text-[12px] font-mono whitespace-pre-wrap overflow-x-auto">
                               {state.generatedCode}
                             </div>
                          </details>
                       )}

                       <button onClick={handleReset} className="self-start mt-1 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full text-xs font-medium text-gray-300 transition-colors cursor-pointer">
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
         <div className="max-w-3xl mx-auto flex items-end gap-3 bg-[#1e1e1e] p-2 pr-2 pl-2 rounded-[28px] shadow-2xl transition-all duration-300 pointer-events-auto border border-white/5">
            
            <button 
              onClick={() => setIsModalOpen(true)}
              className={`p-3 ml-1 rounded-full flex items-center justify-center shrink-0 transition-all cursor-pointer ${docs ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}
              title="Anexar Documentação"
              disabled={isProcessing}
            >
              <Paperclip className="w-5 h-5" />
            </button>

            <textarea 
              id="main-input"
              rows={1}
              className="flex-1 bg-transparent border-none text-gray-100 placeholder-gray-500 text-[15px] resize-none outline-none py-3 px-2 max-h-32 min-h-[44px]"
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

            <button 
              onClick={handleStartPlan}
              disabled={!prompt.trim() || isProcessing}
              className="p-2.5 rounded-full bg-gray-200 text-black shrink-0 hover:bg-white transition-all cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed self-end mb-0.5"
            >
              <ArrowUp className="w-5 h-5" />
            </button>
         </div>
      </div>

      {/* Modal Minimalista de Contexto/Documentação */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-[#18181b] border border-white/10 rounded-3xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
             <div className="flex items-center justify-between p-6 pb-4 bg-[#1e1e1e] border-b border-white/5">
                <h3 className="text-lg font-medium text-gray-100">{state ? 'Rastreamento de Pesquisa e Contexto' : 'Adicionar Contexto'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-200 transition-colors p-1 rounded-full hover:bg-white/5 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
             </div>
             <div className="p-8 overflow-y-auto custom-scrollbar">
                {state ? (
                  <div className="w-full prose prose-invert max-w-none prose-p:text-[14.5px] prose-headings:text-gray-200 prose-a:text-purple-400 prose-strong:text-emerald-400">
                    {state.rawDocumentContext && (
                       <>
                         <h3 className="text-gray-400 uppercase text-xs tracking-wider mb-2 font-mono">Documentação Anexada Pelo Usuário</h3>
                         <div className="bg-[#1e1e1e] p-4 rounded-xl mb-6 font-mono text-[13px] text-gray-400 whitespace-pre-wrap border border-white/5">
                           {state.rawDocumentContext}
                         </div>
                         <hr className="border-white/5 my-6" />
                       </>
                    )}
                    <h3 className="text-gray-400 uppercase text-xs tracking-wider mb-4 font-mono">Relatório da Base de Conhecimento (IA)</h3>
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
                    className="w-full h-64 bg-[#131314] rounded-2xl p-4 text-[14px] text-gray-300 focus:outline-none resize-none font-mono custom-scrollbar border border-white/5"
                    placeholder="Cole o texto da documentação ou contexto base aqui..."
                    value={docs}
                    onChange={(e) => setDocs(e.target.value)}
                  />
                )}
             </div>
             <div className="p-6 bg-[#1e1e1e] border-t border-white/5 flex justify-end gap-3">
                {state && (
                  <button onClick={() => exportMarkdown(`${state.rawDocumentContext ? `[DOCUMENTAÇÃO ORIGINAL]\n${state.rawDocumentContext}\n\n` : ''}[RELATÓRIO DA IA]\n${state.compressedContext}\n\n[FONTES]\n${state.extractedSources?.join('\n')}`, 'rastreamento-pesquisa')} className="px-5 py-2.5 bg-white/5 text-gray-300 rounded-full font-medium text-sm hover:bg-white/10 transition-colors cursor-pointer flex items-center gap-2">
                    <Download className="w-4 h-4" /> Exportar .md
                  </button>
                )}
                <button onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 bg-gray-200 text-black rounded-full font-medium text-sm hover:bg-white transition-colors cursor-pointer">
                   Concluir
                </button>
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
