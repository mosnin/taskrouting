import { prisma, type AgentContext, hasScope } from "./auth.js";

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

    const where: any = { workspaceId: ctx.workspaceId, deletedAt: null };
    if (ctx.allowedQueueIds.length > 0) {
      where.id = { in: ctx.allowedQueueIds };
    }

    const queues = await prisma.queue.findMany({
      where,
      include: {
        _count: {
          select: {
            tasks: { where: { status: { in: ["TODO", "BACKLOG"] }, deletedAt: null } },
          },
        },
      },
    });

    return {
      uri,
      mimeType: "application/json",
      text: JSON.stringify(
        queues.map((q) => ({
          id: q.id,
          name: q.name,
          description: q.description,
          requiredCapabilities: q.requiredCapabilities,
          pendingTasks: q._count.tasks,
        }))
      ),
    };
  }

  if (uri.startsWith("taskrouting://queue/")) {
    if (!hasScope(ctx, "queues:read")) throw new Error("Permission denied");

    const queueId = parts[1];
    const tasks = await prisma.task.findMany({
      where: {
        queueId,
        workspaceId: ctx.workspaceId,
        status: { in: ["TODO", "BACKLOG"] },
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        requiredCapabilities: true,
        dueAt: true,
        createdAt: true,
      },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
      take: 50,
    });

    return { uri, mimeType: "application/json", text: JSON.stringify(tasks) };
  }

  if (uri.startsWith("taskrouting://task/")) {
    if (!hasScope(ctx, "tasks:read")) throw new Error("Permission denied");

    const taskId = parts[1];
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        subtasks: { orderBy: { order: "asc" } },
        artifacts: { orderBy: { createdAt: "desc" } },
        comments: { orderBy: { createdAt: "asc" }, take: 50 },
        claims: { where: { status: "ACTIVE" } },
        project: { select: { id: true, name: true } },
        queue: { select: { id: true, name: true } },
      },
    });

    if (!task || task.workspaceId !== ctx.workspaceId) {
      throw new Error("Task not found");
    }

    return { uri, mimeType: "application/json", text: JSON.stringify(task) };
  }

  if (uri.startsWith("taskrouting://project/")) {
    if (!hasScope(ctx, "tasks:read")) throw new Error("Permission denied");

    const projectId = parts[1];
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        taskSheets: {
          where: { deletedAt: null },
          include: {
            _count: { select: { tasks: true } },
          },
        },
        _count: {
          select: { tasks: { where: { deletedAt: null } } },
        },
      },
    });

    if (!project || project.workspaceId !== ctx.workspaceId) {
      throw new Error("Project not found");
    }

    return { uri, mimeType: "application/json", text: JSON.stringify(project) };
  }

  if (uri === "taskrouting://memory") {
    if (!hasScope(ctx, "memory:read")) throw new Error("Permission denied");

    const nodes = await prisma.memoryNode.findMany({
      where: { workspaceId: ctx.workspaceId, deletedAt: null },
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: {
        id: true,
        title: true,
        type: true,
        content: true,
        projectId: true,
        taskId: true,
        updatedAt: true,
        version: true,
      },
    });

    return { uri, mimeType: "application/json", text: JSON.stringify(nodes) };
  }

  if (uri === "taskrouting://agent/claims") {
    const claims = await prisma.claim.findMany({
      where: { agentId: ctx.agentId, status: "ACTIVE" },
      include: {
        task: {
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
            priority: true,
          },
        },
        queue: { select: { id: true, name: true } },
      },
    });

    return { uri, mimeType: "application/json", text: JSON.stringify(claims) };
  }

  throw new Error(`Unknown resource: ${uri}`);
}
