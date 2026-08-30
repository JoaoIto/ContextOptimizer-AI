import { z } from "zod";

export const MetricsSchema = z.object({
  tokensSaved: z.number().optional(),
  totalCost: z.number().optional(),
  wallClockLatencyMs: z.number().optional(),
  originalTokens: z.number().optional(),
  optimizedTokens: z.number().optional(),
  compressionRatio: z.string().optional(),
  estimatedSavings: z.string().optional(),
  agentBreakdown: z.object({
    researcher: z.number(),
    planner: z.number(),
    executor: z.number(),
  }).optional(),
  monolithicAccuracy: z.string().optional(),
  tdpAccuracy: z.string().optional(),
  hallucinationDrop: z.string().optional(),
});

export const ExecutionStatusSchema = z.enum([
  "INITIALIZED",
  "RETRYING_API",
  "RESEARCH_STREAMING",
  "RESEARCH_COMPLETED",
  "FAILED_RESEARCH",
  "PLANNING_STREAMING",
  "PLANNING_COMPLETED",
  "FAILED_PLANNING",
  "CODE_STREAMING",
  "CODE_GENERATED",
  "FAILED_CODING",
  "SUCCESS_VERIFIED",
  "FAILED_COMPILATION",
  "TIMEOUT_EXPIRED",
  "VALIDATION_EXCEPTION",
  "QUOTA_EXCEEDED"
]);

export const AgentStateSchema = z.object({
  rawUserPrompt: z.string(),
  rawDocumentContext: z.string(),
  compressedContext: z.string().optional(),
  extractedSources: z.array(z.string()).optional(),
  ptcfMetaPrompt: z.string().optional(),
  plannerMessage: z.string().optional(),
  executorMessage: z.string().optional(),
  generatedCode: z.string().optional(),
  streamingResearchChunk: z.string().optional(),
  streamingPlanChunk: z.string().optional(),
  streamingCodeChunk: z.string().optional(),
  executionStatus: ExecutionStatusSchema,
  sandboxCompilationPassed: z.boolean().default(false),
  errorFeedbackLog: z.string().optional(),
  metrics: MetricsSchema.optional()
});

export type Metrics = z.infer<typeof MetricsSchema>;
export type ExecutionStatus = z.infer<typeof ExecutionStatusSchema>;
export type AgentState = z.infer<typeof AgentStateSchema>;
