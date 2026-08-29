import React, { useState, useRef, useEffect } from 'react';
import { useAgentStream } from './hooks/useAgentStream';
import { Paperclip, ArrowUp, Check, Loader2, Sparkles, X } from 'lucide-react';

function App() {
  const [prompt, setPrompt] = useState('');
  const [docs, setDocs] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [started, setStarted] = useState(false);
  
  const { state, isProcessing, error, startPlanning, startExecution, resetState } = useAgentStream();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state, isProcessing]);

  const handleStartPlan = () => {
    if (!prompt.trim()) return;
    setStarted(true);
    startPlanning(prompt, docs);
  };

  const handleApprove = () => {
    if (state) startExecution(state);
  };

  const handleReset = () => {
    setStarted(false);
    setPrompt('');
    setDocs('');
    resetState();
  };

  return (
    <div className="min-h-screen bg-[#131314] text-gray-100 flex flex-col items-center relative font-sans selection:bg-purple-500/30">
      
      {/* Header Minimalista (Muda com o state 'started') */}
      <header className={`w-full max-w-4xl px-6 py-6 flex items-center transition-all duration-500 z-10 ${started ? 'justify-start opacity-100' : 'justify-center opacity-0 pointer-events-none absolute top-0'}`}>
         <h1 className="text-xl font-medium bg-gradient-to-r from-gray-200 to-gray-400 bg-clip-text text-transparent flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity" onClick={handleReset}>
            <Sparkles className="w-5 h-5 text-gray-400" /> Context
         </h1>
      </header>

      {/* Título Centralizado Hero (Desaparece ao iniciar) */}
      {!started && (
        <div className="flex-1 flex items-center justify-center w-full max-w-3xl px-6 animate-in fade-in zoom-in-95 duration-700">
           <h1 className="text-4xl md:text-5xl font-medium bg-gradient-to-br from-gray-100 to-gray-500 bg-clip-text text-transparent mb-20 text-center tracking-tight">
             Context
           </h1>
        </div>
      )}

      {/* Timeline de Chat Dinâmica */}
      {started && (
        <main className="flex-1 w-full max-w-3xl flex flex-col gap-6 px-6 pb-40 overflow-y-auto mt-4 custom-scrollbar">
          
          {/* Mensagem Inicial (Usuário) */}
          <div className="self-end max-w-[85%] bg-[#2a2a2a] px-5 py-4 rounded-2xl rounded-tr-sm animate-in slide-in-from-right-8 fade-in duration-500">
             <p className="text-gray-200 text-[15px] leading-relaxed">{prompt}</p>
             {docs && (
                <div className="mt-3 flex items-center gap-2 text-xs text-gray-400 bg-black/20 p-2 rounded-lg w-fit">
                   <Paperclip className="w-3 h-3" /> Contexto anexado
                </div>
             )}
          </div>

          {/* Passo 1: Extração e Planejamento */}
          {(isProcessing || state) && (
            <div className="self-start max-w-[90%] flex gap-4 animate-in slide-in-from-bottom-4 fade-in duration-500">
               <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-500/20 to-gray-400/10 flex items-center justify-center shrink-0 border border-white/5 mt-1">
                 <Sparkles className="w-4 h-4 text-gray-400" />
               </div>
               
               <div className="flex flex-col gap-2">
                 {(!state || (isProcessing && state?.executionStatus !== 'PLANNING_COMPLETED')) && (
                    <div className="flex items-center gap-3 text-gray-400 text-[15px] py-1 mt-1.5">
                      <Loader2 className="w-4 h-4 animate-spin text-gray-500" /> 
                      Lendo a documentação e extraindo o essencial...
                    </div>
                 )}

                 {/* Passo 2: Approval Gate (Mensagem de Chat) */}
                 {state?.executionStatus === 'PLANNING_COMPLETED' && (
                    <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                      <p className="text-gray-200 text-[15px] mt-1.5">Pronto! Aqui está o plano de ação:</p>
                      
                      <div className="bg-[#1e1e1e] border border-white/5 rounded-2xl p-5 shadow-lg">
                        <pre className="font-mono text-[13px] text-gray-300 whitespace-pre-wrap max-h-64 overflow-y-auto custom-scrollbar">
                          {state.ptcfMetaPrompt}
                        </pre>
                      </div>
                      
                      {!state?.generatedCode && !isProcessing && (
                        <div className="flex gap-3 mt-1">
                          <button onClick={handleReset} className="px-5 py-2.5 rounded-full text-sm font-medium text-gray-400 bg-white/5 hover:bg-white/10 hover:text-white transition-all cursor-pointer">
                            Ajustar
                          </button>
                          <button onClick={handleApprove} className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium text-black bg-gray-200 hover:bg-white transition-all cursor-pointer">
                            <Check className="w-4 h-4" /> Aprovar e Gerar Código
                          </button>
                        </div>
                      )}
                    </div>
                 )}
               </div>
            </div>
          )}

          {/* Passo 3 e 4: Execução de Código */}
          {state?.executionStatus && state.executionStatus !== 'INITIALIZED' && state.executionStatus !== 'RESEARCH_COMPLETED' && state.executionStatus !== 'PLANNING_COMPLETED' && (
            <div className="self-start max-w-[95%] w-full flex gap-4 animate-in slide-in-from-bottom-4 fade-in duration-500 mt-2">
               <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-500/20 to-gray-400/10 flex items-center justify-center shrink-0 border border-white/5 mt-1">
                 <Check className="w-4 h-4 text-emerald-400/80" />
               </div>
               
               <div className="flex flex-col gap-2 w-full">
                 {isProcessing && (
                    <div className="flex items-center gap-3 text-gray-400 text-[15px] py-1 mt-1.5">
                      <Loader2 className="w-4 h-4 animate-spin text-gray-500" /> 
                      {state.errorFeedbackLog 
                        ? <span className="animate-pulse text-amber-500">Corrigindo detalhes técnicos...</span>
                        : "Escrevendo e testando o código..."
                      }
                    </div>
                 )}

                 {state?.generatedCode && !isProcessing && (
                    <div className="flex flex-col gap-3 animate-in fade-in duration-500 w-full mt-1.5">
                      <p className="text-gray-200 text-[15px]">Código gerado e validado com sucesso.</p>
                      <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl overflow-hidden shadow-lg w-full">
                        <div className="flex items-center justify-between px-4 py-2 bg-[#222] border-b border-white/5">
                           <span className="text-xs font-mono text-gray-500">output.ts</span>
                           <button 
                             onClick={() => navigator.clipboard.writeText(state.generatedCode || '')}
                             className="text-xs text-gray-400 hover:text-white transition-colors cursor-pointer"
                           >
                             Copiar
                           </button>
                        </div>
                        <pre className="font-mono text-[13px] text-gray-300 whitespace-pre-wrap p-5 max-h-[50vh] overflow-y-auto custom-scrollbar">
                          {state.generatedCode}
                        </pre>
                      </div>
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
         <div className="max-w-3xl mx-auto flex items-end gap-3 bg-[#1e1e1e] p-2 pr-2 pl-2 rounded-[28px] shadow-2xl transition-all duration-300 pointer-events-auto">
            
            <button 
              onClick={() => setIsModalOpen(true)}
              className={`p-3 ml-1 rounded-full flex items-center justify-center shrink-0 transition-all cursor-pointer ${docs ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}
              title="Anexar Documentação"
              disabled={isProcessing}
            >
              <Paperclip className="w-5 h-5" />
            </button>

            <textarea 
              rows={1}
              className="flex-1 bg-transparent border-none text-gray-100 placeholder-gray-500 text-[15px] resize-none outline-none py-3 px-2 max-h-32 min-h-[44px]"
              placeholder="O que você quer criar hoje?"
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
           <div className="bg-[#1e1e1e] border border-white/5 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col">
             <div className="flex items-center justify-between p-6 pb-4">
                <h3 className="text-lg font-medium text-gray-100">Adicionar Contexto</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-200 transition-colors p-1 rounded-full hover:bg-white/5 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
             </div>
             <div className="p-6 pt-0">
                <textarea 
                  className="w-full h-64 bg-[#131314] rounded-2xl p-4 text-[14px] text-gray-300 focus:outline-none resize-none font-mono custom-scrollbar"
                  placeholder="Cole o texto da documentação ou contexto base aqui..."
                  value={docs}
                  onChange={(e) => setDocs(e.target.value)}
                />
             </div>
             <div className="p-6 pt-0 flex justify-end">
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
