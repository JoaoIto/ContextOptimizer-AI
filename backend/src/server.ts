import express, { Request, Response } from 'express';
import cors from 'cors';
import { runPipeline } from './orchestrator';
import { AgentState } from './core/state';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Endpoint de Healthcheck
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', message: 'ContextOptimizer-AI Backend is running.' });
});

// Endpoint SSE (Server-Sent Events)
app.get('/api/stream', async (req: Request, res: Response) => {
  const prompt = req.query.prompt as string;
  const document = req.query.document as string;

  if (!prompt || !document) {
    res.status(400).json({ error: 'Faltam os parâmetros prompt e document na querystring.' });
    return;
  }

  // Configura os headers obrigatórios para SSE
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
    for await (const state of runPipeline(initialState)) {
      res.write(`data: ${JSON.stringify(state)}\n\n`);
    }
  } catch (error) {
    console.error("Erro na pipeline:", error);
    res.write(`data: ${JSON.stringify({ error: String(error) })}\n\n`);
  } finally {
    res.end();
  }
});

app.listen(PORT, () => {
  console.log(`[server]: Server is running at http://localhost:${PORT}`);
});
