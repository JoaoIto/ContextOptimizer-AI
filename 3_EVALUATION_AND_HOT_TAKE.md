# Evaluation & Hot Take

## The Hot Take: LLMs Are Terrible Multitaskers

When the industry started building coding agents, the default approach was obvious: shove all the documentation, the user prompt, and the strict output formats into one massive system prompt and tell the LLM to *"think step-by-step and output code."*

**Our Hot Take:** Forcing an LLM to simultaneously act as a Reader, a System Architect, and a Syntax Typist is the root cause of 90% of hallucinations and context bloat. 

**LLMs shouldn't plan and code simultaneously.**

### The Evidence
During our baseline testing, we observed a critical failure mode: **Context Window Saturation vs. Cognitive Saturation.** 
Even if a model like Gemini 1.5 Pro has a 1M+ token window, it suffers from *cognitive* saturation. If you give it 50 pages of documentation and ask for code, it gets distracted by the docs. It forgets the user's specific constraints, hallucinates API endpoints that sound plausible but don't exist in the docs, and outputs messy, un-sandboxed code. 

To fix this, developers usually hit "Regenerate" or spend 20 minutes prompting the AI to fix its own errors. This is the **Monolithic Trial & Error** trap. It wastes developer time and burns millions of tokens on retries.

### The Practical Lesson: Task-Decoupled Planning (TDP)
The lesson we learned is that intelligence should be pipelined, exactly like a human engineering team:

1. **The Researcher:** Only reads. Distills 50 pages of docs into 1 page of strict structural rules.
2. **The Planner (Staff Engineer):** Only thinks. Reads the 1 page of rules and writes a deterministic markdown plan. No coding allowed.
3. **The Executor (Junior Dev):** Only writes code. Follows the plan exactly.

By decoupling the tasks, we achieved a massive leap in **Pass@1 Accuracy (from 38% to 92%)** and a **90% drop in token costs**, because the Executor only sees the compressed plan, not the bloat. 

Stop treating LLMs like omniscient gods. Treat them like focused microservices.
