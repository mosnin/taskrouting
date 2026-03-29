import { prisma } from "@/lib/prisma";
import { emitEvent } from "@/lib/events";
import { generateToken, hashToken } from "@/lib/crypto";

export async function createToken(
  agentId: string,
  userId: string,
  data: { name: string; scopes: string[]; expiresAt?: Date }
) {
  const rawToken = generateToken();
  const tokenHash = hashToken(rawToken);

  const agent = await prisma.agent.findUniqueOrThrow({
    where: { id: agentId },
    select: { workspaceId: true },
  });

  const token = await prisma.agentToken.create({
    data: {
      agentId,
      tokenHash,
      name: data.name,
      scopes: data.scopes,
      expiresAt: data.expiresAt,
    },
  });

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

  const token = await prisma.agentToken.findUnique({
    where: { tokenHash },
    include: {
      agent: {
        include: {
          workspace: true,
        },
      },
    },
  });

  if (!token) return null;
  if (token.status !== "ACTIVE") return null;
  if (token.expiresAt && token.expiresAt < new Date()) return null;

  // Update lastUsedAt in the background — don't await
  prisma.agentToken
    .update({
      where: { id: token.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {
      // Best-effort update, don't fail verification
    });

  return {
    tokenId: token.id,
    agentId: token.agentId,
    scopes: token.scopes,
    agent: token.agent,
    workspace: token.agent.workspace,
  };
}

export async function revokeToken(tokenId: string, userId: string) {
  const token = await prisma.agentToken.update({
    where: { id: tokenId },
    data: { status: "REVOKED" },
    include: {
      agent: { select: { workspaceId: true } },
    },
  });

  await emitEvent({
    workspaceId: token.agent.workspaceId,
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
  return prisma.agentToken.findMany({
    where: { agentId },
    select: {
      id: true,
      agentId: true,
      name: true,
      scopes: true,
      status: true,
      lastUsedAt: true,
      expiresAt: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}
