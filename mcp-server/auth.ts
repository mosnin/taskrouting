import { createHash } from "crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface AgentContext {
  agentId: string;
  agentName: string;
  workspaceId: string;
  scopes: string[];
  capabilities: string[];
  allowedQueueIds: string[];
}

/** Verify an agent token and return the agent context */
export async function verifyAgentToken(rawToken: string): Promise<AgentContext | null> {
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");

  const agentToken = await prisma.agentToken.findUnique({
    where: { tokenHash },
    include: {
      agent: true,
    },
  });

  if (!agentToken) return null;
  if (agentToken.status !== "ACTIVE") return null;
  if (agentToken.expiresAt && agentToken.expiresAt < new Date()) return null;

  // Update last used
  await prisma.agentToken.update({
    where: { id: agentToken.id },
    data: { lastUsedAt: new Date() },
  });

  // Update agent last seen
  await prisma.agent.update({
    where: { id: agentToken.agent.id },
    data: { lastSeenAt: new Date(), status: "ONLINE" },
  });

  return {
    agentId: agentToken.agent.id,
    agentName: agentToken.agent.name,
    workspaceId: agentToken.agent.workspaceId,
    scopes: agentToken.scopes,
    capabilities: agentToken.agent.capabilities,
    allowedQueueIds: agentToken.agent.allowedQueueIds,
  };
}

export function hasScope(ctx: AgentContext, scope: string): boolean {
  return ctx.scopes.includes("*") || ctx.scopes.includes(scope);
}

export { prisma };
