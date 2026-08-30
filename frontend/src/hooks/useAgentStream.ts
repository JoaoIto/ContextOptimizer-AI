import { useState, useCallback } from 'react';

export interface Metrics {
  tokensSaved: number;
  totalCost: number;
  wallClockLatencyMs: number;
}

export type ExecutionStatus = 
  | "INITIALIZED"
  | "RETRYING_API"
  | "RESEARCH_STREAMING"
  | "RESEARCH_COMPLETED"
  | "FAILED_RESEARCH"
  | "PLANNING_STREAMING"
  | "PLANNING_COMPLETED"
  | "FAILED_PLANNING"
  | "CODE_STREAMING"
  | "CODE_GENERATED"
  | "FAILED_CODING"
  | "SUCCESS_VERIFIED"
  | "FAILED_COMPILATION"
  | "TIMEOUT_EXPIRED"
  | "VALIDATION_EXCEPTION"
  | "QUOTA_EXCEEDED";

export interface AgentState {
  rawUserPrompt: string;
  rawDocumentContext: string;
  compressedContext?: string;
  extractedSources?: string[];
  ptcfMetaPrompt?: string;
  plannerMessage?: string;
  generatedCode?: string;
  streamingResearchChunk?: string;
  streamingPlanChunk?: string;
  streamingCodeChunk?: string;
  executionStatus: ExecutionStatus;
  sandboxCompilationPassed: boolean;
  errorFeedbackLog?: string;
  executorMessage?: string;
  metrics?: Metrics;
}

export function useAgentStream() {
  const [state, setState] = useState<AgentState | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados de Streaming Ao Vivo
  const [liveResearchText, setLiveResearchText] = useState("");
  const [livePlanText, setLivePlanText] = useState("");
  const [liveCodeText, setLiveCodeText] = useState("");

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

        // Concatena os chunks ao vivo
        if (data.executionStatus === "RESEARCH_STREAMING" && data.streamingResearchChunk) {
            setLiveResearchText((prev) => prev + data.streamingResearchChunk);
        }
        if (data.executionStatus === "PLANNING_STREAMING" && data.streamingPlanChunk) {
            setLivePlanText((prev) => prev + data.streamingPlanChunk);
        }
        if (data.executionStatus === "CODE_STREAMING" && data.streamingCodeChunk) {
            setLiveCodeText((prev) => prev + data.streamingCodeChunk);
        }

        if (
          data.executionStatus === "SUCCESS_VERIFIED" || 
          data.executionStatus === "PLANNING_COMPLETED" || 
          data.executionStatus === "QUOTA_EXCEEDED" ||
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
    setLiveResearchText("");
    setLivePlanText("");
    setLiveCodeText("");
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const url = `${apiUrl}/api/stream/plan?prompt=${encodeURIComponent(prompt)}&document=${encodeURIComponent(documentContext)}`;
    startEventStream(url);
  }, []);

  const startExecution = useCallback(async (currentState: AgentState) => {
    try {
        setIsProcessing(true);
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const res = await fetch(`${apiUrl}/api/prepare-execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(currentState)
        });
        
        if (!res.ok) throw new Error("Falha ao preparar execução.");
        
        const { id } = await res.json();
        startEventStream(`${apiUrl}/api/stream/execute/${id}`);
    } catch (err: any) {
        setError(err.message);
        setIsProcessing(false);
    }
  }, []);

  const resetState = () => {
      setState(null);
      setError(null);
      setIsProcessing(false);
      setLiveResearchText("");
      setLivePlanText("");
      setLiveCodeText("");
  }

  return { 
    state, 
    isProcessing, 
    error, 
    liveResearchText,
    livePlanText,
    liveCodeText,
    startPlanning, 
    startExecution, 
    resetState, 
    setState 
  };
}
