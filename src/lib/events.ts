import { prisma } from "./prisma";
import type { ActorType } from "@prisma/client";

export type EventType =
  | "task_created"
  | "task_updated"
  | "task_routed"
  | "task_claimed"
  | "task_released"
  | "task_completed"
  | "subtask_created"
  | "subtask_updated"
  | "artifact_submitted"
  | "comment_added"
  | "approval_requested"
  | "approval_granted"
  | "approval_denied"
  | "memory_created"
  | "memory_updated"
  | "integration_connected"
  | "integration_disconnected"
  | "external_event_received"
  | "writeback_succeeded"
  | "writeback_failed"
  | "agent_connected"
  | "agent_disconnected"
  | "agent_heartbeat"
  | "token_created"
  | "token_revoked"
  | "workspace_created"
  | "project_created"
  | "project_updated"
  | "queue_created"
  | "queue_updated"
  | "task_sheet_created";

interface EmitEventParams {
  workspaceId: string;
  eventType: EventType;
  actorType: ActorType;
  actorId: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}

// In-memory subscribers for SSE
type Subscriber = (event: EmitEventParams & { id: string; createdAt: Date }) => void;
const subscribers = new Map<string, Set<Subscriber>>();

/** Emit a domain event: writes to RunLog and notifies SSE subscribers */
export async function emitEvent(params: EmitEventParams) {
  const log = await prisma.runLog.create({
    data: {
      workspaceId: params.workspaceId,
      eventType: params.eventType,
      actorType: params.actorType,
      actorId: params.actorId,
      entityType: params.entityType,
      entityId: params.entityId,
      metadata: (params.metadata as any) ?? undefined,
    },
  });

  // Notify workspace subscribers
  const subs = subscribers.get(params.workspaceId);
  if (subs) {
    const payload = { ...params, id: log.id, createdAt: log.createdAt };
    for (const fn of subs) {
      try {
        fn(payload);
      } catch {
        // Don't let a subscriber error break the event flow
      }
    }
  }

  return log;
}

/** Subscribe to events for a workspace (used by SSE endpoint) */
export function subscribe(workspaceId: string, fn: Subscriber): () => void {
  if (!subscribers.has(workspaceId)) {
    subscribers.set(workspaceId, new Set());
  }
  subscribers.get(workspaceId)!.add(fn);
  return () => {
    subscribers.get(workspaceId)?.delete(fn);
    if (subscribers.get(workspaceId)?.size === 0) {
      subscribers.delete(workspaceId);
    }
  };
}
