import { db } from "@/lib/db";
import { workspaces, workspaceMembers, queues, users } from "@/lib/db/schema";
import { eq, desc, asc } from "drizzle-orm";
import { emitEvent } from "@/lib/events";
import { uniqueSlug } from "@/lib/crypto";

export async function createWorkspace(
  userId: string,
  name: string
) {
  const slug = uniqueSlug(name);

  const workspace = await db.transaction(async (tx) => {
    const [ws] = await tx.insert(workspaces).values({ name, slug }).returning();

    await tx.insert(workspaceMembers).values({
      workspaceId: ws.id,
      userId,
      role: "OWNER",
    });

    // Create default queues
    await tx.insert(queues).values([
      { workspaceId: ws.id, name: "Default", description: "Default task queue" },
      { workspaceId: ws.id, name: "Triage", description: "Incoming tasks awaiting triage" },
      { workspaceId: ws.id, name: "Urgent", description: "High-priority tasks requiring immediate attention" },
    ]);

    return ws;
  });

  await emitEvent({
    workspaceId: workspace.id,
    eventType: "workspace_created",
    actorType: "USER",
    actorId: userId,
    entityType: "workspace",
    entityId: workspace.id,
    metadata: { name, slug },
  });

  return workspace;
}

export async function getWorkspace(workspaceId: string) {
  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);
  if (!workspace) throw new Error("Workspace not found");
  return workspace;
}

export async function getWorkspaceBySlug(slug: string) {
  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.slug, slug))
    .limit(1);
  if (!workspace) throw new Error("Workspace not found");
  return workspace;
}

export async function getUserWorkspaces(userId: string) {
  const memberships = await db
    .select({
      workspace: workspaces,
      role: workspaceMembers.role,
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(eq(workspaceMembers.userId, userId))
    .orderBy(desc(workspaceMembers.createdAt));

  return memberships.map((m) => ({
    ...m.workspace,
    role: m.role,
  }));
}

export async function getWorkspaceMembers(workspaceId: string) {
  return db
    .select({
      member: workspaceMembers,
      user: users,
    })
    .from(workspaceMembers)
    .innerJoin(users, eq(workspaceMembers.userId, users.id))
    .where(eq(workspaceMembers.workspaceId, workspaceId))
    .orderBy(asc(workspaceMembers.createdAt));
}

export async function updateWorkspace(
  workspaceId: string,
  data: { name?: string }
) {
  const [updated] = await db
    .update(workspaces)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(workspaces.id, workspaceId))
    .returning();
  if (!updated) throw new Error("Workspace not found");
  return updated;
}
