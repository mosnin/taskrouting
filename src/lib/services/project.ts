import { db } from "@/lib/db";
import { projects, taskSheets } from "@/lib/db/schema";
import type { ProjectStatus } from "@/lib/db/schema";
import { eq, and, isNull, desc, asc } from "drizzle-orm";
import { emitEvent } from "@/lib/events";

export async function createProject(
  workspaceId: string,
  userId: string,
  data: { name: string; description?: string }
) {
  const [project] = await db
    .insert(projects)
    .values({
      workspaceId,
      name: data.name,
      description: data.description,
    })
    .returning();

  await emitEvent({
    workspaceId,
    eventType: "project_created",
    actorType: "USER",
    actorId: userId,
    entityType: "project",
    entityId: project.id,
    metadata: { name: data.name },
  });

  return project;
}

export async function getProject(projectId: string) {
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  if (!project) throw new Error("Project not found");

  const sheets = await db
    .select()
    .from(taskSheets)
    .where(and(eq(taskSheets.projectId, projectId), isNull(taskSheets.deletedAt)))
    .orderBy(asc(taskSheets.order));

  return { ...project, taskSheets: sheets };
}

export async function listProjects(workspaceId: string) {
  return db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.workspaceId, workspaceId),
        eq(projects.status, "ACTIVE"),
        isNull(projects.deletedAt)
      )
    )
    .orderBy(desc(projects.createdAt));
}

export async function updateProject(
  projectId: string,
  userId: string,
  data: { name?: string; description?: string; status?: ProjectStatus }
) {
  const [project] = await db
    .update(projects)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(projects.id, projectId))
    .returning();
  if (!project) throw new Error("Project not found");

  await emitEvent({
    workspaceId: project.workspaceId,
    eventType: "project_updated",
    actorType: "USER",
    actorId: userId,
    entityType: "project",
    entityId: project.id,
    metadata: { updatedFields: Object.keys(data) },
  });

  return project;
}
