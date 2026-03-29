import { db } from "@/lib/db";
import { agentTokens, agents, workspaces } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { emitEvent } from "@/lib/events";
import { generateToken, hashToken } from "@/lib/crypto";

export async function createToken(
  agentId: string,
  userId: string,
  data: { name: string; scopes: string[]; expiresAt?: Date }
) {
  const rawToken = generateToken();
  const tokenHash = hashToken(rawToken);

  const [agent] = await db
    .select({ workspaceId: agents.workspaceId })
    .from(agents)
    .where(eq(agents.id, agentId))
    .limit(1);
  if (!agent) throw new Error("Agent not found");

  const [token] = await db
    .insert(agentTokens)
    .values({
      agentId,
      tokenHash,
      name: data.name,
      scopes: data.scopes,
      expiresAt: data.expiresAt,
    })
    .returning();

  await emitEvent({
    workspaceId: agent.workspaceId,
    eventType: "token_created",
    actorType: "USER",
    actorId: userId,
    entityType: "agent_token",
    entityId: token.id,
    metadata: { agentId, name: data.name, scopes: data.scopes },
  });

  // Return the raw token - this is the only time it is available
  return { ...token, rawToken };
}

export async function verifyToken(rawToken: string) {
  const tokenHash = hashToken(rawToken);

  const results = await db
    .select({
      token: agentTokens,
      agent: agents,
      workspace: workspaces,
    })
    .from(agentTokens)
    .innerJoin(agents, eq(agentTokens.agentId, agents.id))
    .innerJoin(workspaces, eq(agents.workspaceId, workspaces.id))
    .where(eq(agentTokens.tokenHash, tokenHash))
    .limit(1);

  const result = results[0];
  if (!result) return null;
  if (result.token.status !== "ACTIVE") return null;
  if (result.token.expiresAt && result.token.expiresAt < new Date()) return null;

  // Update lastUsedAt in the background - don't await
  db.update(agentTokens)
    .set({ lastUsedAt: new Date(), updatedAt: new Date() })
    .where(eq(agentTokens.id, result.token.id))
    .catch(() => {
      // Best-effort update, don't fail verification
    });

  return {
    tokenId: result.token.id,
    agentId: result.token.agentId,
    scopes: result.token.scopes,
    agent: result.agent,
    workspace: result.workspace,
  };
}

export async function revokeToken(tokenId: string, userId: string) {
  const [token] = await db
    .update(agentTokens)
    .set({ status: "REVOKED", updatedAt: new Date() })
    .where(eq(agentTokens.id, tokenId))
    .returning();
  if (!token) throw new Error("Token not found");

  const [agent] = await db
    .select({ workspaceId: agents.workspaceId })
    .from(agents)
    .where(eq(agents.id, token.agentId))
    .limit(1);

  await emitEvent({
    workspaceId: agent!.workspaceId,
    eventType: "token_revoked",
    actorType: "USER",
    actorId: userId,
    entityType: "agent_token",
    entityId: token.id,
    metadata: { agentId: token.agentId },
  });

  return token;
}

export async function listTokens(agentId: string) {
  return db
    .select({
      id: agentTokens.id,
      agentId: agentTokens.agentId,
      name: agentTokens.name,
      scopes: agentTokens.scopes,
      status: agentTokens.status,
      lastUsedAt: agentTokens.lastUsedAt,
      expiresAt: agentTokens.expiresAt,
      createdAt: agentTokens.createdAt,
      updatedAt: agentTokens.updatedAt,
    })
    .from(agentTokens)
    .where(eq(agentTokens.agentId, agentId))
    .orderBy(desc(agentTokens.createdAt));
}
