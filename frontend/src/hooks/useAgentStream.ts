import { useState, useCallback } from 'react';

export interface Metrics {
  tokensSaved: number;
  totalCost: number;
  wallClockLatencyMs: number;
}

export type ExecutionStatus = 
  | "INITIALIZED"
  | "RESEARCH_COMPLETED"
  | "FAILED_RESEARCH"
  | "PLANNING_COMPLETED"
  | "FAILED_PLANNING"
  | "CODE_GENERATED"
  | "FAILED_CODING"
  | "SUCCESS_VERIFIED"
  | "FAILED_COMPILATION"
  | "TIMEOUT_EXPIRED"
  | "VALIDATION_EXCEPTION";

export interface AgentState {
  rawUserPrompt: string;
  rawDocumentContext: string;
  compressedContext?: string;
  ptcfMetaPrompt?: string;
  generatedCode?: string;
  executionStatus: ExecutionStatus;
  sandboxCompilationPassed: boolean;
  errorFeedbackLog?: string;
  metrics?: Metrics;
}

export function useAgentStream() {
  const [state, setState] = useState<AgentState | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startEventStream = (url: string) => {
    setIsProcessing(true);
    setError(null);

    const eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.error) {
          setError(data.error);
          setIsProcessing(false);
          eventSource.close();
          return;
        }

        setState(data as AgentState);

        if (
          data.executionStatus === "SUCCESS_VERIFIED" || 
          data.executionStatus === "PLANNING_COMPLETED" || 
          data.executionStatus.includes("FAILED") ||
          data.executionStatus.includes("EXCEPTION") ||
          data.executionStatus.includes("TIMEOUT")
        ) {
          setIsProcessing(false);
          eventSource.close();
        }
      } catch (err) {
        console.error("Erro ao parsear dados do SSE:", err);
      }
    };

    eventSource.onerror = (err) => {
      console.error("Erro no EventSource:", err);
      setError("Conexão com o servidor perdida.");
      setIsProcessing(false);
      eventSource.close();
    };
  };

  const startPlanning = useCallback((prompt: string, documentContext: string) => {
    setState(null);
    const url = `http://localhost:3000/api/stream/plan?prompt=${encodeURIComponent(prompt)}&document=${encodeURIComponent(documentContext)}`;
    startEventStream(url);
  }, []);

  const startExecution = useCallback(async (currentState: AgentState) => {
    try {
        setIsProcessing(true);
        const res = await fetch('http://localhost:3000/api/prepare-execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(currentState)
        });
        
        if (!res.ok) throw new Error("Falha ao preparar execução.");
        
        const { id } = await res.json();
        startEventStream(`http://localhost:3000/api/stream/execute/${id}`);
    } catch (err: any) {
        setError(err.message);
        setIsProcessing(false);
    }
  }, []);

  const resetState = () => {
      setState(null);
      setError(null);
      setIsProcessing(false);
  }

  return { state, isProcessing, error, startPlanning, startExecution, resetState, setState };
}
