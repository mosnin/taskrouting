import { createHash } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "./db.js";
import { agents, agentTokens } from "../src/lib/db/schema.js";

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

  const [agentToken] = await db
    .select()
    .from(agentTokens)
    .where(eq(agentTokens.tokenHash, tokenHash))
    .limit(1);

  if (!agentToken) return null;
  if (agentToken.status !== "ACTIVE") return null;
  if (agentToken.expiresAt && agentToken.expiresAt < new Date()) return null;

  // Get the agent
  const [agent] = await db
    .select()
    .from(agents)
    .where(eq(agents.id, agentToken.agentId))
    .limit(1);

  if (!agent) return null;

  // Update last used
  await db
    .update(agentTokens)
    .set({ lastUsedAt: new Date() })
    .where(eq(agentTokens.id, agentToken.id));

  // Update agent last seen
  await db
    .update(agents)
    .set({ lastSeenAt: new Date(), status: "ONLINE" })
    .where(eq(agents.id, agent.id));

  return {
    agentId: agent.id,
    agentName: agent.name,
    workspaceId: agent.workspaceId,
    scopes: agentToken.scopes,
    capabilities: agent.capabilities,
    allowedQueueIds: agent.allowedQueueIds,
  };
}

export function hasScope(ctx: AgentContext, scope: string): boolean {
  return ctx.scopes.includes("*") || ctx.scopes.includes(scope);
}
