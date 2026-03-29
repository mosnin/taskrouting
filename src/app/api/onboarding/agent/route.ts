import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { agents, agentTokens, queues, workspaceMembers } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { generateToken, hashToken } from "@/lib/crypto";
import { emitEvent } from "@/lib/events";

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceId, name, capabilities } = await request.json();
  if (!workspaceId || !name) {
    return NextResponse.json({ error: "workspaceId and name required" }, { status: 400 });
  }

  // Verify membership
  const [member] = await db
    .select()
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, user.id)
      )
    )
    .limit(1);
  if (!member || !["OWNER", "ADMIN"].includes(member.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Get all queue IDs for the workspace
  const queueRows = await db
    .select({ id: queues.id })
    .from(queues)
    .where(and(eq(queues.workspaceId, workspaceId), isNull(queues.deletedAt)));

  // Create agent
  const [agent] = await db
    .insert(agents)
    .values({
      workspaceId,
      name,
      capabilities: capabilities || [],
      allowedQueueIds: queueRows.map((q) => q.id),
    })
    .returning();

  // Create token
  const rawToken = `tr_${generateToken()}`;
  const tokenHash = hashToken(rawToken);

  await db.insert(agentTokens).values({
    agentId: agent.id,
    tokenHash,
    name: `${name} default token`,
    scopes: ["*"],
  });

  await emitEvent({
    workspaceId,
    eventType: "token_created",
    actorType: "USER",
    actorId: user.id,
    entityType: "Agent",
    entityId: agent.id,
    metadata: { agentName: name },
  });

  return NextResponse.json({ agentId: agent.id, rawToken });
}
