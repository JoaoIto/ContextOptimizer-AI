import express, { Request, Response } from 'express';
import cors from 'cors';
import { runPlanningPipeline, runExecutionPipeline } from './orchestrator';
import { AgentState } from './core/state';
import crypto from 'crypto';
import { UserInputSchema } from './validators';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Temporary Storage for Approval Gate (In-Memory)
const pendingExecutions = new Map<string, AgentState>();

app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', message: 'Backend is running.' });
});

// Route 1: Start Planning (Researcher + Planner)
app.get('/api/stream/plan', async (req: Request, res: Response) => {
  const parsed = UserInputSchema.safeParse({
      documentContext: (req.query.document as string) || '',
      userQuery: req.query.prompt as string
  });

  if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message });
      return;
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  const abortController = new AbortController();
  req.on('close', () => {
      console.log('[SSE] Client disconnected. Aborting AI...');
      abortController.abort();
      res.end();
  });

  const initialState: AgentState = {
    rawUserPrompt: parsed.data.userQuery,
    rawDocumentContext: parsed.data.documentContext || '',
    executionStatus: "INITIALIZED",
    sandboxCompilationPassed: false,
    metrics: { tokensSaved: 0, totalCost: 0, wallClockLatencyMs: 0 }
  };

  try {
    for await (const state of runPlanningPipeline(initialState, abortController.signal)) {
      if (abortController.signal.aborted) break;
      res.write(`data: ${JSON.stringify(state)}\n\n`);
    }
  } catch (error) {
    if (!abortController.signal.aborted) {
        res.write(`data: ${JSON.stringify({ error: String(error) })}\n\n`);
    }
  } finally {
    res.end();
  }
});

// Route 2: Receive Approved State and Generate Session ID
app.post('/api/prepare-execute', (req: Request, res: Response) => {
    const state = req.body as AgentState;
    if (!state) {
        res.status(400).json({ error: 'State not provided.' });
        return;
    }
    const id = crypto.randomUUID();
    pendingExecutions.set(id, state);
    res.json({ id });
});

// Route 3: Start Execution (Executor + Sandbox via ID)
app.get('/api/stream/execute/:id', async (req: Request, res: Response) => {
    const id = req.params.id;
    const state = pendingExecutions.get(id);

    if (!state) {
        res.status(404).json({ error: 'Execution session not found or expired.' });
        return;
    }

    pendingExecutions.delete(id); // Consume the session

    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
    });

    const abortController = new AbortController();
    req.on('close', () => {
        console.log('[SSE] Client disconnected. Aborting Execution...');
        abortController.abort();
        res.end();
    });

    try {
        for await (const newState of runExecutionPipeline(state, abortController.signal)) {
            if (abortController.signal.aborted) break;
            res.write(`data: ${JSON.stringify(newState)}\n\n`);
        }
    } catch (error) {
        if (!abortController.signal.aborted) {
            res.write(`data: ${JSON.stringify({ error: String(error) })}\n\n`);
        }
    } finally {
        res.end();
    }
});

app.listen(PORT, () => {
  console.log(`[server]: Server is running at http://localhost:${PORT}`);
});
