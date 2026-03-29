import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emitEvent } from "@/lib/events";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { workspaceId, projectId, taskSheetId, title, description, priority, queueId } = body;

  const task = await prisma.task.create({
    data: {
      workspaceId,
      projectId,
      taskSheetId: taskSheetId || null,
      title,
      description: description || null,
      priority: priority || "MEDIUM",
      queueId: queueId || null,
      status: "TODO",
    },
  });

  await emitEvent({
    workspaceId,
    eventType: "task_created",
    actorType: "USER",
    actorId: session.user.id,
    entityType: "Task",
    entityId: task.id,
    metadata: { title: task.title },
  });

  return NextResponse.json({ task });
}
