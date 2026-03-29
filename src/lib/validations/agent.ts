import { z } from "zod";

export const createAgentSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  capabilities: z.array(z.string().min(1)).min(1, "At least one capability is required"),
  allowedQueueIds: z.array(z.string().uuid()).optional(),
});

export const createAgentTokenSchema = z.object({
  name: z.string().min(1).max(200),
  scopes: z
    .array(z.string().min(1))
    .min(1, "At least one scope is required"),
  expiresAt: z.string().datetime().optional(),
});

export type CreateAgentInput = z.infer<typeof createAgentSchema>;
export type CreateAgentTokenInput = z.infer<typeof createAgentTokenSchema>;
