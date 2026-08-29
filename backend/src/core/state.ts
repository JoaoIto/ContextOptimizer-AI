import { z } from "zod";

export const MetricsSchema = z.object({
  tokensSaved: z.number(),
  totalCost: z.number(),
  wallClockLatencyMs: z.number(),
});

export const ExecutionStatusSchema = z.enum([
  "INITIALIZED",
  "RESEARCH_COMPLETED",
  "FAILED_RESEARCH",
  "PLANNING_COMPLETED",
  "FAILED_PLANNING",
  "CODE_GENERATED",
  "FAILED_CODING",
  "SUCCESS_VERIFIED",
  "FAILED_COMPILATION",
  "TIMEOUT_EXPIRED",
  "VALIDATION_EXCEPTION"
]);

export const AgentStateSchema = z.object({
  rawUserPrompt: z.string(),
  rawDocumentContext: z.string(),
  compressedContext: z.string().optional(),
  ptcfMetaPrompt: z.string().optional(),
  generatedCode: z.string().optional(),
  executionStatus: ExecutionStatusSchema,
  sandboxCompilationPassed: z.boolean().default(false),
  errorFeedbackLog: z.string().optional(),
  metrics: MetricsSchema.optional()
});

export type Metrics = z.infer<typeof MetricsSchema>;
export type ExecutionStatus = z.infer<typeof ExecutionStatusSchema>;
export type AgentState = z.infer<typeof AgentStateSchema>;
