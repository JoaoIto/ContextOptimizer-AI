import { z } from 'zod';

export const UserInputSchema = z.object({
  documentContext: z.string().optional(),
  userQuery: z.string().min(3, "Prompt vazio.")
});
