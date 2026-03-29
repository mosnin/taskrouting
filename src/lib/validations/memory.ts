import { z } from "zod";

export const createMemoryNodeSchema = z.object({
  title: z.string().min(1).max(500),
  content: z.string().min(1).max(100000),
  type: z.enum([
    "DOCUMENT",
    "CHECKLIST",
    "DECISION",
    "SPEC",
    "RUNBOOK",
    "RESEARCH",
    "MEETING_NOTES",
    "REFERENCE",
  ]),
  projectId: z.string().uuid().optional(),
  taskId: z.string().uuid().optional(),
  agentId: z.string().uuid().optional(),
});

export const updateMemoryNodeSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  content: z.string().min(1).max(100000).optional(),
});

export type CreateMemoryNodeInput = z.infer<typeof createMemoryNodeSchema>;
export type UpdateMemoryNodeInput = z.infer<typeof updateMemoryNodeSchema>;
