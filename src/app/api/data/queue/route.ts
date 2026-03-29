import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emitEvent } from "@/lib/events";

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
  const { name, description, requiredCapabilities } = body;

  const queue = await prisma.queue.create({
    data: {
      workspaceId,
      name,
      description: description || null,
      requiredCapabilities: requiredCapabilities || [],
    },
  });

  await emitEvent({
    workspaceId,
    eventType: "queue_created",
    actorType: "USER",
    actorId: session.user.id,
    entityType: "Queue",
    entityId: queue.id,
    metadata: { name: queue.name },
  });

  return NextResponse.json({ queue });
}
