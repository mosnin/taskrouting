import { db } from "@/lib/db";
import { agents, agentTokens, claims } from "@/lib/db/schema";
import type { AgentStatus } from "@/lib/db/schema";
import { eq, and, isNull, desc } from "drizzle-orm";

export async function createAgent(
  workspaceId: string,
  userId: string,
  data: {
    name: string;
    description?: string;
    capabilities: string[];
    allowedQueueIds?: string[];
  }
) {
  const [agent] = await db
    .insert(agents)
    .values({
      workspaceId,
      name: data.name,
      description: data.description,
      capabilities: data.capabilities,
      allowedQueueIds: data.allowedQueueIds ?? [],
    })
    .returning();
  return agent;
}

export async function getAgent(agentId: string) {
  const [agent] = await db
    .select()
    .from(agents)
    .where(eq(agents.id, agentId))
    .limit(1);
  if (!agent) throw new Error("Agent not found");

  const [activeTokens, activeClaims] = await Promise.all([
    db
      .select()
      .from(agentTokens)
      .where(and(eq(agentTokens.agentId, agentId), eq(agentTokens.status, "ACTIVE")))
      .orderBy(desc(agentTokens.createdAt)),
    db
      .select()
      .from(claims)
      .where(and(eq(claims.agentId, agentId), eq(claims.status, "ACTIVE")))
      .orderBy(desc(claims.createdAt))
      .limit(10),
  ]);

  return {
    ...agent,
    tokens: activeTokens,
    claims: activeClaims,
  };
}

export async function listAgents(workspaceId: string) {
  return db
    .select()
    .from(agents)
    .where(and(eq(agents.workspaceId, workspaceId), isNull(agents.deletedAt)))
    .orderBy(desc(agents.createdAt));
}

export async function updateAgentStatus(agentId: string, status: AgentStatus) {
  const [updated] = await db
    .update(agents)
    .set({
      status,
      lastSeenAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(agents.id, agentId))
    .returning();
  if (!updated) throw new Error("Agent not found");
  return updated;
}

export async function deleteAgent(agentId: string) {
  const [updated] = await db
    .update(agents)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(agents.id, agentId))
    .returning();
  if (!updated) throw new Error("Agent not found");
  return updated;
}
