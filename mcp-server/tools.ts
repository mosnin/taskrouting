import { eq, and, inArray, or, ilike, desc, isNull, sql } from "drizzle-orm";
import { type AgentContext, hasScope } from "./auth.js";
import { db } from "./db.js";
import {
  queues,
  tasks,
  claims,
  runLogs,
  artifacts,
  memoryNodes,
  approvals,
  taskComments,
  agents,
} from "../src/lib/db/schema.js";

// Tool definitions for the MCP server
export function getToolDefinitions() {
  return [
    {
      name: "list_available_queues",
      description: "List queues available to this agent based on permissions and capabilities",
      inputSchema: {
        type: "object" as const,
        properties: {},
      },
    },
    {
      name: "claim_task",
      description: "Claim a task from a queue. The task will be assigned to this agent.",
      inputSchema: {
        type: "object" as const,
        properties: {
          taskId: { type: "string", description: "The task ID to claim" },
          queueId: { type: "string", description: "The queue ID the task is in" },
        },
        required: ["taskId", "queueId"],
      },
    },
    {
      name: "update_task_status",
      description: "Update the status of a claimed task",
      inputSchema: {
        type: "object" as const,
        properties: {
          taskId: { type: "string", description: "The task ID" },
          status: {
            type: "string",
            enum: ["IN_PROGRESS", "IN_REVIEW", "DONE"],
            description: "New status",
          },
        },
        required: ["taskId", "status"],
      },
    },
    {
      name: "submit_artifact",
      description: "Submit an artifact (file, code, document) for a task",
      inputSchema: {
        type: "object" as const,
        properties: {
          taskId: { type: "string", description: "The task ID" },
          name: { type: "string", description: "Artifact name" },
          type: { type: "string", description: "Artifact type (code, document, image, data, other)" },
          content: { type: "string", description: "Artifact content" },
          url: { type: "string", description: "Optional URL reference" },
        },
        required: ["taskId", "name", "type", "content"],
      },
    },
    {
      name: "create_memory_node",
      description: "Create a shared memory note linked to the workspace",
      inputSchema: {
        type: "object" as const,
        properties: {
          title: { type: "string", description: "Title of the memory note" },
          content: { type: "string", description: "Content (markdown supported)" },
          type: {
            type: "string",
            enum: ["DOCUMENT", "CHECKLIST", "DECISION", "SPEC", "RUNBOOK", "RESEARCH", "MEETING_NOTES", "REFERENCE"],
            description: "Type of memory node",
          },
          projectId: { type: "string", description: "Optional linked project ID" },
          taskId: { type: "string", description: "Optional linked task ID" },
        },
        required: ["title", "content", "type"],
      },
    },
    {
      name: "update_memory_node",
      description: "Update an existing memory node",
      inputSchema: {
        type: "object" as const,
        properties: {
          nodeId: { type: "string", description: "The memory node ID" },
          title: { type: "string", description: "New title" },
          content: { type: "string", description: "New content" },
        },
        required: ["nodeId"],
      },
    },
    {
      name: "search_memory",
      description: "Search shared memory nodes by keyword",
      inputSchema: {
        type: "object" as const,
        properties: {
          query: { type: "string", description: "Search query" },
        },
        required: ["query"],
      },
    },
    {
      name: "request_approval",
      description: "Request human approval for a task",
      inputSchema: {
        type: "object" as const,
        properties: {
          taskId: { type: "string", description: "The task requiring approval" },
        },
        required: ["taskId"],
      },
    },
    {
      name: "add_task_comment",
      description: "Add a comment to a task",
      inputSchema: {
        type: "object" as const,
        properties: {
          taskId: { type: "string", description: "The task ID" },
          content: { type: "string", description: "Comment content" },
        },
        required: ["taskId", "content"],
      },
    },
    {
      name: "heartbeat",
      description: "Send a heartbeat to indicate the agent is alive and working",
      inputSchema: {
        type: "object" as const,
        properties: {
          status: { type: "string", description: "Optional status message" },
        },
      },
    },
  ];
}

/** Execute a tool call */
export async function executeTool(
  ctx: AgentContext,
  toolName: string,
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const text = (msg: string) => ({ content: [{ type: "text" as const, text: msg }] });

  switch (toolName) {
    case "list_available_queues": {
      if (!hasScope(ctx, "queues:read")) return text("Permission denied: missing queues:read scope");

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

      // Get task counts per queue
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
            availableTasks: Number(taskCountResult[0]?.count ?? 0),
          };
        })
      );

      return text(JSON.stringify(result, null, 2));
    }

    case "claim_task": {
      if (!hasScope(ctx, "tasks:claim")) return text("Permission denied: missing tasks:claim scope");

      const { taskId, queueId } = args as { taskId: string; queueId: string };

      // Verify queue access
      if (ctx.allowedQueueIds.length > 0 && !ctx.allowedQueueIds.includes(queueId)) {
        return text("Permission denied: agent does not have access to this queue");
      }

      // Check for existing active claim
      const [existingClaim] = await db
        .select()
        .from(claims)
        .where(and(eq(claims.taskId, taskId), eq(claims.status, "ACTIVE")))
        .limit(1);
      if (existingClaim) {
        return text("Task already has an active claim");
      }

      // Verify task is in the queue and claimable
      const [task] = await db
        .select()
        .from(tasks)
        .where(
          and(
            eq(tasks.id, taskId),
            eq(tasks.queueId, queueId),
            inArray(tasks.status, ["TODO", "BACKLOG"]),
            isNull(tasks.deletedAt)
          )
        )
        .limit(1);
      if (!task) {
        return text("Task not found or not claimable");
      }

      // Check capabilities
      if (task.requiredCapabilities.length > 0) {
        const hasAllCaps = task.requiredCapabilities.every((cap) =>
          ctx.capabilities.includes(cap)
        );
        if (!hasAllCaps) {
          return text(`Missing required capabilities: ${task.requiredCapabilities.join(", ")}`);
        }
      }

      // Create claim and update task
      const [claim] = await db
        .insert(claims)
        .values({ agentId: ctx.agentId, taskId, queueId })
        .returning();

      await db
        .update(tasks)
        .set({ status: "IN_PROGRESS", ownerType: "AGENT", ownerId: ctx.agentId })
        .where(eq(tasks.id, taskId));

      await db.insert(runLogs).values({
        workspaceId: ctx.workspaceId,
        eventType: "task_claimed",
        actorType: "AGENT",
        actorId: ctx.agentId,
        entityType: "Task",
        entityId: taskId,
        metadata: { claimId: claim.id, queueId },
      });

      return text(JSON.stringify({ claimId: claim.id, taskId, status: "claimed" }));
    }

    case "update_task_status": {
      if (!hasScope(ctx, "tasks:write")) return text("Permission denied: missing tasks:write scope");

      const { taskId, status } = args as { taskId: string; status: string };

      // Verify agent has active claim
      const [claim] = await db
        .select()
        .from(claims)
        .where(
          and(
            eq(claims.taskId, taskId),
            eq(claims.agentId, ctx.agentId),
            eq(claims.status, "ACTIVE")
          )
        )
        .limit(1);
      if (!claim) {
        return text("No active claim found for this task");
      }

      await db
        .update(tasks)
        .set({ status: status as any })
        .where(eq(tasks.id, taskId));

      if (status === "DONE") {
        await db
          .update(claims)
          .set({ status: "COMPLETED", releasedAt: new Date() })
          .where(eq(claims.id, claim.id));
      }

      await db.insert(runLogs).values({
        workspaceId: ctx.workspaceId,
        eventType: status === "DONE" ? "task_completed" : "task_updated",
        actorType: "AGENT",
        actorId: ctx.agentId,
        entityType: "Task",
        entityId: taskId,
        metadata: { status, claimId: claim.id },
      });

      return text(JSON.stringify({ taskId, status: "updated", newStatus: status }));
    }

    case "submit_artifact": {
      if (!hasScope(ctx, "artifacts:write")) return text("Permission denied: missing artifacts:write scope");

      const { taskId, name, type, content, url } = args as any;

      const [artifact] = await db
        .insert(artifacts)
        .values({
          taskId,
          agentId: ctx.agentId,
          name,
          type,
          content,
          url: url || null,
        })
        .returning();

      await db.insert(runLogs).values({
        workspaceId: ctx.workspaceId,
        eventType: "artifact_submitted",
        actorType: "AGENT",
        actorId: ctx.agentId,
        entityType: "Artifact",
        entityId: artifact.id,
        metadata: { taskId, name, type },
      });

      return text(JSON.stringify({ artifactId: artifact.id, status: "submitted" }));
    }

    case "create_memory_node": {
      if (!hasScope(ctx, "memory:write")) return text("Permission denied: missing memory:write scope");

      const { title, content, type, projectId, taskId } = args as any;

      const [node] = await db
        .insert(memoryNodes)
        .values({
          workspaceId: ctx.workspaceId,
          title,
          content,
          type,
          projectId: projectId || null,
          taskId: taskId || null,
          agentId: ctx.agentId,
          createdBy: ctx.agentId,
          updatedBy: ctx.agentId,
        })
        .returning();

      await db.insert(runLogs).values({
        workspaceId: ctx.workspaceId,
        eventType: "memory_created",
        actorType: "AGENT",
        actorId: ctx.agentId,
        entityType: "MemoryNode",
        entityId: node.id,
        metadata: { title, type },
      });

      return text(JSON.stringify({ nodeId: node.id, status: "created" }));
    }

    case "update_memory_node": {
      if (!hasScope(ctx, "memory:write")) return text("Permission denied: missing memory:write scope");

      const { nodeId, title, content } = args as any;

      const [node] = await db
        .update(memoryNodes)
        .set({
          ...(title ? { title } : {}),
          ...(content ? { content } : {}),
          updatedBy: ctx.agentId,
          version: sql`${memoryNodes.version} + 1`,
        })
        .where(eq(memoryNodes.id, nodeId))
        .returning();

      await db.insert(runLogs).values({
        workspaceId: ctx.workspaceId,
        eventType: "memory_updated",
        actorType: "AGENT",
        actorId: ctx.agentId,
        entityType: "MemoryNode",
        entityId: node.id,
      });

      return text(JSON.stringify({ nodeId: node.id, version: node.version, status: "updated" }));
    }

    case "search_memory": {
      if (!hasScope(ctx, "memory:read")) return text("Permission denied: missing memory:read scope");

      const { query } = args as { query: string };

      const nodes = await db
        .select({
          id: memoryNodes.id,
          title: memoryNodes.title,
          type: memoryNodes.type,
          content: memoryNodes.content,
          projectId: memoryNodes.projectId,
          taskId: memoryNodes.taskId,
          updatedAt: memoryNodes.updatedAt,
        })
        .from(memoryNodes)
        .where(
          and(
            eq(memoryNodes.workspaceId, ctx.workspaceId),
            isNull(memoryNodes.deletedAt),
            or(
              ilike(memoryNodes.title, `%${query}%`),
              ilike(memoryNodes.content, `%${query}%`)
            )
          )
        )
        .orderBy(desc(memoryNodes.updatedAt))
        .limit(20);

      return text(JSON.stringify(nodes, null, 2));
    }

    case "request_approval": {
      if (!hasScope(ctx, "approvals:write")) return text("Permission denied: missing approvals:write scope");

      const { taskId } = args as { taskId: string };

      const [approval] = await db
        .insert(approvals)
        .values({
          taskId,
          requestedByType: "AGENT",
          requestedById: ctx.agentId,
        })
        .returning();

      await db
        .update(tasks)
        .set({ approvalState: "PENDING" })
        .where(eq(tasks.id, taskId));

      await db.insert(runLogs).values({
        workspaceId: ctx.workspaceId,
        eventType: "approval_requested",
        actorType: "AGENT",
        actorId: ctx.agentId,
        entityType: "Approval",
        entityId: approval.id,
        metadata: { taskId },
      });

      return text(JSON.stringify({ approvalId: approval.id, status: "pending" }));
    }

    case "add_task_comment": {
      if (!hasScope(ctx, "tasks:write")) return text("Permission denied: missing tasks:write scope");

      const { taskId, content } = args as { taskId: string; content: string };

      const [comment] = await db
        .insert(taskComments)
        .values({
          taskId,
          actorType: "AGENT",
          actorId: ctx.agentId,
          content,
        })
        .returning();

      await db.insert(runLogs).values({
        workspaceId: ctx.workspaceId,
        eventType: "comment_added",
        actorType: "AGENT",
        actorId: ctx.agentId,
        entityType: "TaskComment",
        entityId: comment.id,
        metadata: { taskId },
      });

      return text(JSON.stringify({ commentId: comment.id, status: "added" }));
    }

    case "heartbeat": {
      const { status: statusMsg } = args as { status?: string };

      await db
        .update(agents)
        .set({ lastSeenAt: new Date(), status: "ONLINE" })
        .where(eq(agents.id, ctx.agentId));

      await db.insert(runLogs).values({
        workspaceId: ctx.workspaceId,
        eventType: "agent_heartbeat",
        actorType: "AGENT",
        actorId: ctx.agentId,
        entityType: "Agent",
        entityId: ctx.agentId,
        metadata: statusMsg ? { status: statusMsg } : undefined,
      });

      return text(JSON.stringify({ status: "alive", timestamp: new Date().toISOString() }));
    }

    default:
      return text(`Unknown tool: ${toolName}`);
  }
}
