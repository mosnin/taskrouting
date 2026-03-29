import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emitEvent } from "@/lib/events";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { approvalId, status, note } = await request.json();

  const approval = await prisma.approval.update({
    where: { id: approvalId },
    data: {
      status,
      reviewerId: session.user.id,
      decisionNote: note || null,
    },
    include: { task: true },
  });

  // Update task approval state
  await prisma.task.update({
    where: { id: approval.taskId },
    data: { approvalState: status },
  });

  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: session.user.id },
    select: { workspaceId: true },
  });

  if (memberships.length > 0) {
    await emitEvent({
      workspaceId: memberships[0].workspaceId,
      eventType: status === "APPROVED" ? "approval_granted" : "approval_denied",
      actorType: "USER",
      actorId: session.user.id,
      entityType: "Approval",
      entityId: approval.id,
      metadata: { taskId: approval.taskId, status },
    });
  }

  return NextResponse.json({ approval });
}
