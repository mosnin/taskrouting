"use server";

import { revalidatePath } from "next/cache";
import { requireWorkspaceRole } from "@/lib/auth";
import * as agentService from "@/lib/services/agent";
import * as tokenService from "@/lib/services/agent-token";
import { z } from "zod";

const createAgentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(2000).optional(),
  capabilities: z.array(z.string()),
  allowedQueueIds: z.array(z.string().uuid()).optional(),
  workspaceId: z.string().uuid(),
});

export async function createAgent(data: z.infer<typeof createAgentSchema>) {
  const parsed = createAgentSchema.parse(data);
  const { session } = await requireWorkspaceRole(parsed.workspaceId, ["OWNER", "ADMIN"]);
  const agent = await agentService.createAgent(parsed.workspaceId, session.user.id, {
    name: parsed.name,
    description: parsed.description,
    capabilities: parsed.capabilities,
    allowedQueueIds: parsed.allowedQueueIds,
  });
  revalidatePath("/agents");
  return agent;
}

const createTokenSchema = z.object({
  agentId: z.string().uuid(),
  name: z.string().min(1).max(100),
  scopes: z.array(z.string()),
  expiresAt: z.string().datetime().optional(),
  workspaceId: z.string().uuid(),
});

export async function createAgentToken(data: z.infer<typeof createTokenSchema>) {
  const parsed = createTokenSchema.parse(data);
  const { session } = await requireWorkspaceRole(parsed.workspaceId, ["OWNER", "ADMIN"]);
  // Returns { token: AgentToken, rawToken: string }
  const result = await tokenService.createToken(parsed.agentId, session.user.id, {
    name: parsed.name,
    scopes: parsed.scopes,
    expiresAt: parsed.expiresAt ? new Date(parsed.expiresAt) : undefined,
  });
  revalidatePath(`/agents/${parsed.agentId}`);
  return result;
}

export async function revokeAgentToken(tokenId: string, workspaceId: string) {
  const { session } = await requireWorkspaceRole(workspaceId, ["OWNER", "ADMIN"]);
  await tokenService.revokeToken(tokenId, session.user.id);
  revalidatePath("/agents");
}

export async function listAgents(workspaceId: string) {
  await requireWorkspaceRole(workspaceId, ["OWNER", "ADMIN", "MEMBER", "VIEWER"]);
  return agentService.listAgents(workspaceId);
}

export async function getAgent(agentId: string, workspaceId: string) {
  await requireWorkspaceRole(workspaceId, ["OWNER", "ADMIN", "MEMBER", "VIEWER"]);
  return agentService.getAgent(agentId);
}

export async function deleteAgent(agentId: string, workspaceId: string) {
  await requireWorkspaceRole(workspaceId, ["OWNER", "ADMIN"]);
  await agentService.deleteAgent(agentId);
  revalidatePath("/agents");
}
