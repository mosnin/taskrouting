import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emitEvent } from "@/lib/events";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const agent = await prisma.agent.findUnique({
    where: { id },
    include: {
      tokens: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          tokenHash: true,
          scopes: true,
          status: true,
          lastUsedAt: true,
          expiresAt: true,
          createdAt: true,
        },
      },
      claims: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          task: { select: { id: true, title: true, status: true } },
          queue: { select: { id: true, name: true } },
        },
      },
    },
  });

  // Mask token hashes (show first 8 chars)
  if (agent?.tokens) {
    agent.tokens = agent.tokens.map((t: any) => ({
      ...t,
      tokenHash: t.tokenHash.slice(0, 8) + "..." ,
    }));
  }

  return NextResponse.json({ agent });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: session.user.id },
    select: { workspaceId: true },
  });
  if (!memberships.length) return NextResponse.json({ error: "No workspace" }, { status: 400 });

  const workspaceId = memberships[0].workspaceId;
  const body = await request.json();
  const { name, description, capabilities } = body;

  const queues = await prisma.queue.findMany({
    where: { workspaceId, deletedAt: null },
    select: { id: true },
  });

  const agent = await prisma.agent.create({
    data: {
      workspaceId,
      name,
      description: description || null,
      capabilities: capabilities || [],
      allowedQueueIds: queues.map((q) => q.id),
    },
  });

  await emitEvent({
    workspaceId,
    eventType: "agent_connected",
    actorType: "USER",
    actorId: session.user.id,
    entityType: "Agent",
    entityId: agent.id,
    metadata: { name: agent.name },
  });

  return NextResponse.json({ agent });
}
