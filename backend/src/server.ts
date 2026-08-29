import express, { Request, Response } from 'express';
import cors from 'cors';
import { runPlanningPipeline, runExecutionPipeline } from './orchestrator';
import { AgentState } from './core/state';
import crypto from 'crypto';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Armazenamento temporário para o Gate de Aprovação (In-Memory)
const pendingExecutions = new Map<string, AgentState>();

app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', message: 'Backend is running.' });
});

// Rota 1: Iniciar Planejamento (Pesquisador + Planejador)
app.get('/api/stream/plan', async (req: Request, res: Response) => {
  const prompt = req.query.prompt as string;
  const document = req.query.document as string;

  if (!prompt || !document) {
    res.status(400).json({ error: 'Faltam os parâmetros.' });
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  const initialState: AgentState = {
    rawUserPrompt: prompt,
    rawDocumentContext: document,
    executionStatus: "INITIALIZED",
    sandboxCompilationPassed: false,
    metrics: { tokensSaved: 0, totalCost: 0, wallClockLatencyMs: 0 }
  };

  try {
    for await (const state of runPlanningPipeline(initialState)) {
      res.write(`data: ${JSON.stringify(state)}\n\n`);
    }
  } catch (error) {
    res.write(`data: ${JSON.stringify({ error: String(error) })}\n\n`);
  } finally {
    res.end();
  }
});

// Rota 2: Receber o Estado Aprovado e gerar um ID de Sessão
app.post('/api/prepare-execute', (req: Request, res: Response) => {
    const state = req.body as AgentState;
    if (!state) {
        res.status(400).json({ error: 'Estado não fornecido.' });
        return;
    }
    const id = crypto.randomUUID();
    pendingExecutions.set(id, state);
    res.json({ id });
});

// Rota 3: Iniciar Execução (Executor + Sandbox via ID)
app.get('/api/stream/execute/:id', async (req: Request, res: Response) => {
    const id = req.params.id;
    const state = pendingExecutions.get(id);

    if (!state) {
        res.status(404).json({ error: 'Sessão de execução não encontrada ou expirada.' });
        return;
    }

    pendingExecutions.delete(id); // Consome a sessão

    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
    });

    try {
        for await (const newState of runExecutionPipeline(state)) {
            res.write(`data: ${JSON.stringify(newState)}\n\n`);
        }
    } catch (error) {
        res.write(`data: ${JSON.stringify({ error: String(error) })}\n\n`);
    } finally {
        res.end();
    }
});

app.listen(PORT, () => {
  console.log(`[server]: Server is running at http://localhost:${PORT}`);
});
