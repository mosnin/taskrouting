import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emitEvent } from "@/lib/events";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { workspaceId, projectId, name, description } = body;

  const sheet = await prisma.taskSheet.create({
    data: {
      workspaceId,
      projectId,
      name,
      description: description || null,
    },
  });

  await emitEvent({
    workspaceId,
    eventType: "task_sheet_created",
    actorType: "USER",
    actorId: session.user.id,
    entityType: "TaskSheet",
    entityId: sheet.id,
    metadata: { name: sheet.name },
  });

  return NextResponse.json({ sheet });
}
