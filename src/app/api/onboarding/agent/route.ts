import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateToken, hashToken } from "@/lib/crypto";
import { emitEvent } from "@/lib/events";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceId, name, capabilities } = await request.json();
  if (!workspaceId || !name) {
    return NextResponse.json({ error: "workspaceId and name required" }, { status: 400 });
  }

  // Verify membership
  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: session.user.id } },
  });
  if (!member || !["OWNER", "ADMIN"].includes(member.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Get all queue IDs for the workspace
  const queues = await prisma.queue.findMany({
    where: { workspaceId, deletedAt: null },
    select: { id: true },
  });

  // Create agent
  const agent = await prisma.agent.create({
    data: {
      workspaceId,
      name,
      capabilities: capabilities || [],
      allowedQueueIds: queues.map((q) => q.id),
    },
  });

  // Create token
  const rawToken = `tr_${generateToken()}`;
  const tokenHash = hashToken(rawToken);

  await prisma.agentToken.create({
    data: {
      agentId: agent.id,
      tokenHash,
      name: `${name} default token`,
      scopes: ["*"],
    },
  });

  await emitEvent({
    workspaceId,
    eventType: "token_created",
    actorType: "USER",
    actorId: session.user.id,
    entityType: "Agent",
    entityId: agent.id,
    metadata: { agentName: name },
  });

  return NextResponse.json({ agentId: agent.id, rawToken });
}
