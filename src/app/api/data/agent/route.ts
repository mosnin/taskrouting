import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { agents, agentTokens, claims, tasks, queues, workspaceMembers } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { emitEvent } from "@/lib/events";

export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const [agent] = await db.select().from(agents).where(eq(agents.id, id)).limit(1);
  if (!agent) return NextResponse.json({ agent: null });

  const tokens = await db
    .select({
      id: agentTokens.id,
      name: agentTokens.name,
      tokenHash: agentTokens.tokenHash,
      scopes: agentTokens.scopes,
      status: agentTokens.status,
      lastUsedAt: agentTokens.lastUsedAt,
      expiresAt: agentTokens.expiresAt,
      createdAt: agentTokens.createdAt,
    })
    .from(agentTokens)
    .where(eq(agentTokens.agentId, id))
    .orderBy(desc(agentTokens.createdAt));

  const claimRows = await db
    .select({
      id: claims.id,
      status: claims.status,
      claimedAt: claims.claimedAt,
      releasedAt: claims.releasedAt,
      createdAt: claims.createdAt,
      taskId: tasks.id,
      taskTitle: tasks.title,
      taskStatus: tasks.status,
      queueId: queues.id,
      queueName: queues.name,
    })
    .from(claims)
    .innerJoin(tasks, eq(claims.taskId, tasks.id))
    .innerJoin(queues, eq(claims.queueId, queues.id))
    .where(eq(claims.agentId, id))
    .orderBy(desc(claims.createdAt))
    .limit(20);

  // Mask token hashes (show first 8 chars)
  const maskedTokens = tokens.map((t) => ({
    ...t,
    tokenHash: t.tokenHash.slice(0, 8) + "...",
  }));

  const formattedClaims = claimRows.map((c) => ({
    id: c.id,
    status: c.status,
    claimedAt: c.claimedAt,
    releasedAt: c.releasedAt,
    createdAt: c.createdAt,
    task: { id: c.taskId, title: c.taskTitle, status: c.taskStatus },
    queue: { id: c.queueId, name: c.queueName },
  }));

  return NextResponse.json({
    agent: { ...agent, tokens: maskedTokens, claims: formattedClaims },
  });
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const memberships = await db
    .select({ workspaceId: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, user.id));
  if (!memberships.length) return NextResponse.json({ error: "No workspace" }, { status: 400 });

  const workspaceId = memberships[0].workspaceId;
  const body = await request.json();
  const { name, description, capabilities } = body;

  const queueRows = await db
    .select({ id: queues.id })
    .from(queues)
    .where(and(eq(queues.workspaceId, workspaceId), eq(queues.deletedAt, null!)));

  const [agent] = await db
    .insert(agents)
    .values({
      workspaceId,
      name,
      description: description || null,
      capabilities: capabilities || [],
      allowedQueueIds: queueRows.map((q) => q.id),
    })
    .returning();

  await emitEvent({
    workspaceId,
    eventType: "agent_connected",
    actorType: "USER",
    actorId: user.id,
    entityType: "Agent",
    entityId: agent.id,
    metadata: { name: agent.name },
  });

  return NextResponse.json({ agent });
}
