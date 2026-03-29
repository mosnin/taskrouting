import { eq, and, inArray, isNull, asc, desc, sql } from "drizzle-orm";
import { type AgentContext, hasScope } from "./auth.js";
import { db } from "./db.js";
import {
  queues,
  tasks,
  subtasks,
  artifacts,
  taskComments,
  claims,
  projects,
  taskSheets,
  memoryNodes,
} from "../src/lib/db/schema.js";

export function getResourceDefinitions() {
  return [
    {
      uri: "taskrouting://queues",
      name: "Workspace Queues",
      description: "All queues available in the workspace",
      mimeType: "application/json",
    },
    {
      uri: "taskrouting://queue/{queueId}",
      name: "Queue Tasks",
      description: "Tasks in a specific queue",
      mimeType: "application/json",
    },
    {
      uri: "taskrouting://task/{taskId}",
      name: "Task Detail",
      description: "Full details of a task including subtasks, comments, and artifacts",
      mimeType: "application/json",
    },
    {
      uri: "taskrouting://project/{projectId}",
      name: "Project Summary",
      description: "Project overview with task sheets and task counts",
      mimeType: "application/json",
    },
    {
      uri: "taskrouting://memory",
      name: "Memory Nodes",
      description: "Shared memory nodes in the workspace",
      mimeType: "application/json",
    },
    {
      uri: "taskrouting://agent/claims",
      name: "Agent Claims",
      description: "Active claims for this agent",
      mimeType: "application/json",
    },
  ];
}

export async function readResource(
  ctx: AgentContext,
  uri: string
): Promise<{ uri: string; mimeType: string; text: string }> {
  // Parse URI
  const url = new URL(uri);
  const path = url.pathname.replace(/^\/\//, "");
  const parts = path.split("/");

  if (uri === "taskrouting://queues") {
    if (!hasScope(ctx, "queues:read")) throw new Error("Permission denied");

    const conditions = [
      eq(queues.workspaceId, ctx.workspaceId),
      isNull(queues.deletedAt),
    ];
    if (ctx.allowedQueueIds.length > 0) {
      conditions.push(inArray(queues.id, ctx.allowedQueueIds));
    }

    const queueRows = await db
      .select()
      .from(queues)
      .where(and(...conditions));

    const result = await Promise.all(
      queueRows.map(async (q) => {
        const taskCountResult = await db
          .select({ count: sql<number>`count(*)` })
          .from(tasks)
          .where(
            and(
              eq(tasks.queueId, q.id),
              inArray(tasks.status, ["TODO", "BACKLOG"]),
              isNull(tasks.deletedAt)
            )
          );
        return {
          id: q.id,
          name: q.name,
          description: q.description,
          requiredCapabilities: q.requiredCapabilities,
          pendingTasks: Number(taskCountResult[0]?.count ?? 0),
        };
      })
    );

    return {
      uri,
      mimeType: "application/json",
      text: JSON.stringify(result),
    };
  }

  if (uri.startsWith("taskrouting://queue/")) {
    if (!hasScope(ctx, "queues:read")) throw new Error("Permission denied");

    const queueId = parts[1];
    const taskRows = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        status: tasks.status,
        priority: tasks.priority,
        requiredCapabilities: tasks.requiredCapabilities,
        dueAt: tasks.dueAt,
        createdAt: tasks.createdAt,
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.queueId, queueId),
          eq(tasks.workspaceId, ctx.workspaceId),
          inArray(tasks.status, ["TODO", "BACKLOG"]),
          isNull(tasks.deletedAt)
        )
      )
      .orderBy(asc(tasks.priority), asc(tasks.createdAt))
      .limit(50);

    return { uri, mimeType: "application/json", text: JSON.stringify(taskRows) };
  }

  if (uri.startsWith("taskrouting://task/")) {
    if (!hasScope(ctx, "tasks:read")) throw new Error("Permission denied");

    const taskId = parts[1];
    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);

    if (!task || task.workspaceId !== ctx.workspaceId) {
      throw new Error("Task not found");
    }

    // Fetch related data in parallel
    const [subtaskRows, artifactRows, commentRows, claimRows] = await Promise.all([
      db.select().from(subtasks).where(eq(subtasks.taskId, taskId)).orderBy(asc(subtasks.order)),
      db.select().from(artifacts).where(eq(artifacts.taskId, taskId)).orderBy(desc(artifacts.createdAt)),
      db.select().from(taskComments).where(eq(taskComments.taskId, taskId)).orderBy(asc(taskComments.createdAt)).limit(50),
      db.select().from(claims).where(and(eq(claims.taskId, taskId), eq(claims.status, "ACTIVE"))),
    ]);

    // Fetch project and queue info if present
    let project = null;
    let queue = null;
    if (task.projectId) {
      const [p] = await db
        .select({ id: projects.id, name: projects.name })
        .from(projects)
        .where(eq(projects.id, task.projectId))
        .limit(1);
      project = p || null;
    }
    if (task.queueId) {
      const [q] = await db
        .select({ id: queues.id, name: queues.name })
        .from(queues)
        .where(eq(queues.id, task.queueId))
        .limit(1);
      queue = q || null;
    }

    const result = {
      ...task,
      subtasks: subtaskRows,
      artifacts: artifactRows,
      comments: commentRows,
      claims: claimRows,
      project,
      queue,
    };

    return { uri, mimeType: "application/json", text: JSON.stringify(result) };
  }

  if (uri.startsWith("taskrouting://project/")) {
    if (!hasScope(ctx, "tasks:read")) throw new Error("Permission denied");

    const projectId = parts[1];
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project || project.workspaceId !== ctx.workspaceId) {
      throw new Error("Project not found");
    }

    // Get task sheets with task counts
    const sheetRows = await db
      .select()
      .from(taskSheets)
      .where(and(eq(taskSheets.projectId, projectId), isNull(taskSheets.deletedAt)));

    const sheetsWithCounts = await Promise.all(
      sheetRows.map(async (s) => {
        const countResult = await db
          .select({ count: sql<number>`count(*)` })
          .from(tasks)
          .where(eq(tasks.taskSheetId, s.id));
        return { ...s, _count: { tasks: Number(countResult[0]?.count ?? 0) } };
      })
    );

    // Get total task count
    const totalCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(tasks)
      .where(and(eq(tasks.projectId, projectId), isNull(tasks.deletedAt)));

    const result = {
      ...project,
      taskSheets: sheetsWithCounts,
      _count: { tasks: Number(totalCountResult[0]?.count ?? 0) },
    };

    return { uri, mimeType: "application/json", text: JSON.stringify(result) };
  }

  if (uri === "taskrouting://memory") {
    if (!hasScope(ctx, "memory:read")) throw new Error("Permission denied");

    const nodes = await db
      .select({
        id: memoryNodes.id,
        title: memoryNodes.title,
        type: memoryNodes.type,
        content: memoryNodes.content,
        projectId: memoryNodes.projectId,
        taskId: memoryNodes.taskId,
        updatedAt: memoryNodes.updatedAt,
        version: memoryNodes.version,
      })
      .from(memoryNodes)
      .where(
        and(
          eq(memoryNodes.workspaceId, ctx.workspaceId),
          isNull(memoryNodes.deletedAt)
        )
      )
      .orderBy(desc(memoryNodes.updatedAt))
      .limit(50);

    return { uri, mimeType: "application/json", text: JSON.stringify(nodes) };
  }

  if (uri === "taskrouting://agent/claims") {
    const claimRows = await db
      .select()
      .from(claims)
      .where(and(eq(claims.agentId, ctx.agentId), eq(claims.status, "ACTIVE")));

    // Fetch task and queue info for each claim
    const result = await Promise.all(
      claimRows.map(async (c) => {
        const [task] = await db
          .select({
            id: tasks.id,
            title: tasks.title,
            description: tasks.description,
            status: tasks.status,
            priority: tasks.priority,
          })
          .from(tasks)
          .where(eq(tasks.id, c.taskId))
          .limit(1);

        const [queue] = await db
          .select({ id: queues.id, name: queues.name })
          .from(queues)
          .where(eq(queues.id, c.queueId))
          .limit(1);

        return { ...c, task: task || null, queue: queue || null };
      })
    );

    return { uri, mimeType: "application/json", text: JSON.stringify(result) };
  }

  throw new Error(`Unknown resource: ${uri}`);
}
