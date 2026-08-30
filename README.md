# ContextOptimizer-AI: Código Fonte (`/project`)

Bem-vindo ao diretório executável do **ContextOptimizer-AI**! Este projeto é a implementação prática desenvolvida durante o *micro1 Agentic Workflows Hackathon*. 

Aqui reside a lógica do nosso Orquestrador Multiagente focado em resolver o problema do *"Context Bloat"* e acelerar fluxos de engenharia de software garantindo código de primeira viagem sem alucinações sintáticas ("Zero Hallucination").

---

## 🚀 O Problema e Nossa Solução

**A Dor:** Desenvolvedores inserem documentações massivas em LLMs. Devido ao fenômeno de esquecimento espacial no meio do prompt ("Lost in the middle") e à concorrência cognitiva (o modelo tem que entender a arquitetura e acertar a sintaxe ao mesmo tempo), o código gerado frequentemente vem quebrado, alucinado ou desrespeita os guias da documentação.

**A Solução:** Empregamos um framework chamado **TDP (Task-Decoupled Planning)** através de uma cadeia de 3 Agentes isolados:
1.  **🔍 Pesquisador:** Foca estritamente em podar e comprimir a documentação, descartando ruído e mantendo apenas contratos.
2.  **🧠 Planejador:** Utiliza o modelo PTCF (Persona, Task, Context, Format) para ditar a arquitetura do código sem escrever sintaxe executável.
3.  **💻 Executor:** Recebe um plano de ação super afunilado e foca *100% da sua inferência latente* na geração precisa e limpa de código.
4.  **🛡️ Sandbox:** Um ambiente host executável captura o código. Caso a compilação falhe, engatilha-se um *Loop de Auto-Reparo (Self-Repair)* automático com base no erro logado (`stderr`).

---

## 🏗️ Estrutura do Monorepo Híbrido

Para garantir a pontuação máxima de *"End to End Quality"*, pivotamos a arquitetura de uma CLI para um servidor com UI em tempo real, através de conexões SSE.

```text
/project
├── backend/              # Motor Multiagente em Node.js (Express + Zod + GenAI)
│   ├── src/agents/       # A lógica de extração, arquitetura e geração (Pesquisador, Planejador, Executor)
│   ├── src/core/         # Contratos estritos Zod e o mecanismo Sandbox (`child_process.exec`)
│   └── src/server.ts     # Ponto de acesso HTTP streamando as yields da state machine via SSE
├── frontend/             # Interface visual (React Vite + Tailwind) consumindo SSE (A ser desenvolvido)
└── package.json          # Orquestrador global 
```

---

## ⚙️ Como Inicializar (Zero-Fricção)

Atualmente, apenas a API **Backend** está implementada (Fase 3 completa). 

**Pré-requisitos:** Node.js (v18+) e uma chave `GEMINI_API_KEY`.

```bash
# 1. Entre no diretório do motor
cd backend

# 2. Configure as variáveis de ambiente
cp .env.example .env
# > Adicione sua chave: GEMINI_API_KEY=AIza...

# 3. Instale as dependências
npm install

# 4. Inicie o servidor via tsx
npm run dev
```

O servidor começará a escutar na porta `3000`. O endpoint core para streamar o andamento dos agentes é acionado via GET na rota `http://localhost:3000/api/stream?prompt=...&document=...`.

---

## 🔗 Links e Recursos Úteis
*   👉 **[Leia as Teses e Arquitetura no Diretório /spec](../spec/)**

---

## ⚠️ API Constraints & Mocked Circuit Breaker

**The Gemini Free Tier Bottleneck:** 
During testing, we encountered the aggressive rate limit (429 RESOURCE_EXHAUSTED) of the Gemini 2.5 Flash Free Tier (capped at 20 Requests Per Day). Our architecture mitigates cognitive overload by breaking generation into smaller steps (**Task-Decoupled Planning**), but this fundamentally requires *more* sequential API calls. This architectural trade-off means we hit the rate limits much faster than monolithic single-prompt applications.

**The Circuit Breaker Mitigation:**
Devido ao rigoroso limite de 20 Requests Per Day no Free Tier do Gemini 2.5 Flash, a equipe implementou um Circuit Breaker. Se a cota esgotar durante a avaliação da banca, o sistema fará fallback elegante para uma Demonstração Simulada, protegendo a estabilidade da UI/UX e evitando crashes fatais de rede.
To ensure our application's UI/UX can be fully evaluated during the hackathon without getting blocked by Google's quota limits, we implemented a **Circuit Breaker** pattern in the Multi-Agent Orchestrator (`orchestrator.ts`).
If the LLM backoff fails, the orchestrator gracefully degrades to a "Demo Simulation Mode". Instead of throwing fatal backend errors, it yields mock states and simulated code through Server-Sent Events (SSE). This maintains the state choreography and Framer Motion animations in the React client, allowing judges to evaluate the full frontend flow and architecture even if the API quota is strictly exhausted.
