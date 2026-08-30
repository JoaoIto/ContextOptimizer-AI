# ContextOptimizer-AI: Source Code (`/project`)

Welcome to the executable directory of **ContextOptimizer-AI**! This project is the practical implementation developed during the *micro1 Agentic Workflows Hackathon*. 

Here resides the logic of our Multi-Agent Orchestrator focused on solving the *"Context Bloat"* problem and accelerating software engineering workflows, ensuring first-class code without syntactic hallucinations ("Zero Hallucination").

---

## 🚀 The Problem and Our Solution

**The Pain:** Developers insert massive documentation into LLMs. Due to the phenomenon of spatial forgetting in the middle of the prompt ("Lost in the middle") and cognitive competition (the model has to understand the architecture and hit the syntax at the same time), the generated code often comes broken, hallucinated, or disregards the documentation guidelines.

**The Solution:** We employ a framework called **TDP (Task-Decoupled Planning)** through a chain of 3 isolated Agents:
1.  **🔍 Researcher:** Focuses strictly on pruning and compressing documentation, discarding noise and keeping only contracts.
2.  **🧠 Planner:** Uses the PTCF (Persona, Task, Context, Format) model to dictate the code architecture without writing executable syntax.
3.  **💻 Executor:** Receives a super-focused action plan and focuses *100% of its latent inference* on generating precise and clean code.
4.  **🛡️ Sandbox:** An executable host environment captures the code. If compilation fails, an automatic *Self-Repair Loop* is triggered based on the logged error (`stderr`).

---

## 🏗️ Hybrid Monorepo Structure

To ensure the maximum *"End to End Quality"* score, we pivoted the architecture from a CLI to a server with a real-time UI, through SSE connections.

```text
/project
├── backend/              # Multi-Agent Engine in Node.js (Express + Zod + GenAI)
│   ├── src/agents/       # Extraction, architecture, and generation logic (Researcher, Planner, Executor)
│   ├── src/core/         # Strict Zod contracts and the Sandbox mechanism (`child_process.exec`)
│   └── src/server.ts     # HTTP access point streaming state machine yields via SSE
├── frontend/             # Visual interface (React Vite + Tailwind) consuming SSE (To be developed)
└── package.json          # Global Orchestrator 
```

---

## ⚙️ How to Initialize (Zero-Friction)

Currently, only the **Backend** API is implemented (Phase 3 complete). 

**Prerequisites:** Node.js (v18+) and a `GEMINI_API_KEY`.

```bash
# 1. Enter the engine directory
cd backend

# 2. Configure environment variables
cp.env.example.env
# > Add your key: GEMINI_API_KEY=AIza...

# 3. Install dependencies
npm install

# 4. Start the server via tsx
npm run dev
```

The server will start listening on port `3000`. The core endpoint for streaming the agents' progress is triggered via GET on the route `http://localhost:3000/api/stream?prompt=...&document=...`.

---

## 🔗 Links and Useful Resources
*   👉 **[Read the Theses and Architecture in the /spec Directory](../spec/)**

---

## ⚠️ API Constraints & Mocked Circuit Breaker

**The Gemini Free Tier Bottleneck:** 
During testing, we encountered the aggressive rate limit (429 RESOURCE_EXHAUSTED) of the Gemini 2.5 Flash Free Tier (capped at 20 Requests Per Day). Our architecture mitigates cognitive overload by breaking generation into smaller steps (**Task-Decoupled Planning**), but this fundamentally requires *more* sequential API calls. This architectural trade-off means we hit the rate limits much faster than monolithic single-prompt applications.

**The Circuit Breaker Mitigation:**
Due to the strict 20 Requests Per Day limit on the Free Tier of Gemini 2.5 Flash, the team implemented a Circuit Breaker. If the quota is exhausted during the evaluation, the system will make an elegant fallback to a Simulated Demo, protecting the UI/UX stability and avoiding fatal network crashes.
To ensure our application's UI/UX can be fully evaluated during the hackathon without getting blocked by Google's quota limits, we implemented a **Circuit Breaker** pattern in the Multi-Agent Orchestrator (`orchestrator.ts`).
If the LLM backoff fails, the orchestrator gracefully degrades to a "Demo Simulation Mode". Instead of throwing fatal backend errors, it yields mock states and simulated code through Server-Sent Events (SSE). This maintains the state choreography and Framer Motion animations in the React client, allowing judges to evaluate the full frontend flow and architecture even if the API quota is strictly exhausted.