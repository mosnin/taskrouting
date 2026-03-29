import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { queues, workspaceMembers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { emitEvent } from "@/lib/events";

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
  const { name, description, requiredCapabilities } = body;

  const [queue] = await db
    .insert(queues)
    .values({
      workspaceId,
      name,
      description: description || null,
      requiredCapabilities: requiredCapabilities || [],
    })
    .returning();

  await emitEvent({
    workspaceId,
    eventType: "queue_created",
    actorType: "USER",
    actorId: user.id,
    entityType: "Queue",
    entityId: queue.id,
    metadata: { name: queue.name },
  });

  return NextResponse.json({ queue });
}
