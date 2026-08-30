# Reproduction Guide

This guide provides step-by-step instructions for judges to reproduce the ContextOptimizer AI environment and run a baseline execution.

## Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Valid API keys for Gemini (Google GenAI) and OpenRouter (for Qwen/Llama fallback).

## Step 1: Clean Environment Setup
Clone the repository and navigate into the `project` directory.

```bash
cd project
```

Install dependencies for both the frontend and backend:
```bash
npm install --prefix frontend
npm install --prefix backend
```

## Step 2: Environment Variables
Create a `.env` file in the `project/backend/` directory with the following variables. A `.env.example` is also provided.

```env
PORT=3000
GEMINI_API_KEY=your_gemini_api_key_here
UNIVERSAL_API_KEY=your_openrouter_api_key_here
UNIVERSAL_API_BASE=https://openrouter.ai/api/v1
```

## Step 3: Execution
We use `concurrently` to spin up both the Vite frontend and the TSX backend in one command.

From the `project` root directory:
```bash
npm run dev
```

- **Backend:** Starts on `http://localhost:3000`
- **Frontend:** Starts on `http://localhost:5173`

Open `http://localhost:5173` in your browser.

## Step 4: Running the Solution

1. **Input a Goal:** Enter a complex development goal (e.g., "Build a full REST API for a Todo app with in-memory storage").
2. **Attach Context (Optional but Recommended):** Paste extensive raw documentation (e.g., Express.js docs or arbitrary JSON rules) into the Sources panel.
3. **Run:** Click Generate.
4. **Observe:** 
   - Watch the SSE stream live.
   - Observe the 3-step Stepper: Distillation -> Architecture -> Synthesis.
   - Once completed, the **Advanced ROI Analytics** dashboard will appear, comparing the token usage of this run versus a theoretical monolithic run.

## Expected Output & Constraints
- **Approximate Runtime:** 15 - 45 seconds depending on LLM response times.
- **Cost:** Fraction of a cent per run (highly optimized due to context compression).
- **Auto-Healing:** If the generated code fails the internal Sandbox compilation, the Executor will automatically retry and you will see the logs in the terminal.
- **Quota Fallback:** If you exhaust your Gemini free tier (20 RPM limit), the backend will automatically and seamlessly failover to Llama 3.3.
