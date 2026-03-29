import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { approvals, tasks, workspaceMembers } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const memberships = await db
    .select({ workspaceId: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, user.id));
  if (!memberships.length) return NextResponse.json({ approvals: [] });

  const workspaceId = memberships[0].workspaceId;
  const rows = await db
    .select({
      id: approvals.id,
      taskId: approvals.taskId,
      requestedByType: approvals.requestedByType,
      requestedById: approvals.requestedById,
      reviewerId: approvals.reviewerId,
      status: approvals.status,
      decisionNote: approvals.decisionNote,
      createdAt: approvals.createdAt,
      updatedAt: approvals.updatedAt,
      taskTitle: tasks.title,
      taskStatus: tasks.status,
    })
    .from(approvals)
    .innerJoin(tasks, eq(approvals.taskId, tasks.id))
    .where(eq(tasks.workspaceId, workspaceId))
    .orderBy(desc(approvals.createdAt))
    .limit(50);

  const formatted = rows.map((r) => ({
    id: r.id,
    taskId: r.taskId,
    requestedByType: r.requestedByType,
    requestedById: r.requestedById,
    reviewerId: r.reviewerId,
    status: r.status,
    decisionNote: r.decisionNote,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    task: { id: r.taskId, title: r.taskTitle, status: r.taskStatus },
  }));

  return NextResponse.json({ approvals: formatted });
}
