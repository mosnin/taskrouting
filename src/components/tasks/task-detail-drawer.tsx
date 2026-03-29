"use client";

import { useState, useTransition } from "react";
import { X, MessageSquare, FileText, Activity, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { TaskStatusBadge } from "./task-status-badge";
import { TaskPriorityBadge } from "./task-priority-badge";
import { CapabilityBadge } from "@/components/shared/capability-badge";
import { updateTask, addComment } from "@/actions/task";
import { useWorkspace } from "@/hooks/use-workspace";

interface Subtask {
  id: string;
  title: string;
  status: string;
}

interface Comment {
  id: string;
  actorType: string;
  actorId: string;
  content: string;
  createdAt: string | Date;
}

interface Artifact {
  id: string;
  name: string;
  type: string;
  url?: string | null;
  createdAt: string | Date;
}

interface Queue {
  id: string;
  name: string;
}

interface TaskDetail {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  ownerType: string;
  ownerId?: string | null;
  queueId?: string | null;
  approvalState: string;
  requiredCapabilities: string[];
  dueAt?: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  subtasks: Subtask[];
  comments: Comment[];
  artifacts: Artifact[];
}

interface RunLogEntry {
  id: string;
  eventType: string;
  actorType: string;
  actorId: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string | Date;
}

interface TaskDetailDrawerProps {
  task: TaskDetail;
  queues: Queue[];
  runLogs?: RunLogEntry[];
  onClose: () => void;
  onUpdate?: () => void;
}

const STATUSES = [
  "BACKLOG",
  "TODO",
  "IN_PROGRESS",
  "IN_REVIEW",
  "DONE",
  "CANCELLED",
] as const;

const PRIORITIES = ["URGENT", "HIGH", "MEDIUM", "LOW"] as const;

const approvalStateLabels: Record<string, { label: string; className: string }> = {
  NONE: { label: "None", className: "text-muted-foreground" },
  PENDING: { label: "Pending Approval", className: "text-yellow-600" },
  APPROVED: { label: "Approved", className: "text-emerald-600" },
  DENIED: { label: "Denied", className: "text-red-600" },
};

export function TaskDetailDrawer({
  task,
  queues,
  runLogs = [],
  onClose,
  onUpdate,
}: TaskDetailDrawerProps) {
  const { workspaceId } = useWorkspace();
  const [isPending, startTransition] = useTransition();
  const [commentText, setCommentText] = useState("");

  function handleStatusChange(newStatus: string) {
    startTransition(async () => {
      await updateTask({
        taskId: task.id,
        workspaceId,
        status: newStatus as (typeof STATUSES)[number],
      });
      onUpdate?.();
    });
  }

  function handlePriorityChange(newPriority: string) {
    startTransition(async () => {
      await updateTask({
        taskId: task.id,
        workspaceId,
        priority: newPriority as (typeof PRIORITIES)[number],
      });
      onUpdate?.();
    });
  }

  function handleQueueChange(newQueueId: string) {
    startTransition(async () => {
      await updateTask({
        taskId: task.id,
        workspaceId,
        queueId: newQueueId || null,
      });
      onUpdate?.();
    });
  }

  function handleAddComment() {
    if (!commentText.trim()) return;
    startTransition(async () => {
      await addComment(task.id, commentText.trim(), workspaceId);
      setCommentText("");
      onUpdate?.();
    });
  }

  const approvalInfo = approvalStateLabels[task.approvalState] ?? approvalStateLabels.NONE;

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l border-border bg-background shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <h2 className="text-base font-semibold text-foreground truncate pr-4">
          {task.title}
        </h2>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-6 px-6 py-5">
          {/* Description */}
          {task.description && (
            <div>
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Description
              </h3>
              <p className="mt-1.5 text-sm text-foreground whitespace-pre-wrap">
                {task.description}
              </p>
            </div>
          )}

          {/* Status & Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1.5">
                Status
              </label>
              <select
                value={task.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                disabled={isPending}
                className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1.5">
                Priority
              </label>
              <select
                value={task.priority}
                onChange={(e) => handlePriorityChange(e.target.value)}
                disabled={isPending}
                className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Queue Assignment */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1.5">
              Queue
            </label>
            <select
              value={task.queueId ?? ""}
              onChange={(e) => handleQueueChange(e.target.value)}
              disabled={isPending}
              className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">Unassigned</option>
              {queues.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.name}
                </option>
              ))}
            </select>
          </div>

          {/* Approval State */}
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Approval
            </h3>
            <p className={cn("mt-1 text-sm font-medium", approvalInfo.className)}>
              {approvalInfo.label}
            </p>
          </div>

          {/* Required Capabilities */}
          {task.requiredCapabilities.length > 0 && (
            <div>
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1.5">
                Required Capabilities
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {task.requiredCapabilities.map((cap) => (
                  <CapabilityBadge key={cap} capability={cap} />
                ))}
              </div>
            </div>
          )}

          {/* Subtasks */}
          <div>
            <h3 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <CheckSquare className="h-3.5 w-3.5" />
              Subtasks ({task.subtasks.length})
            </h3>
            {task.subtasks.length === 0 ? (
              <p className="mt-1.5 text-sm text-muted-foreground">
                No subtasks yet.
              </p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {task.subtasks.map((subtask) => (
                  <li
                    key={subtask.id}
                    className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5"
                  >
                    <div
                      className={cn(
                        "h-3 w-3 rounded-full border-2",
                        subtask.status === "DONE"
                          ? "border-emerald-500 bg-emerald-500"
                          : subtask.status === "IN_PROGRESS"
                            ? "border-yellow-500"
                            : "border-zinc-300"
                      )}
                    />
                    <span
                      className={cn(
                        "text-sm",
                        subtask.status === "DONE"
                          ? "text-muted-foreground line-through"
                          : "text-foreground"
                      )}
                    >
                      {subtask.title}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Comments */}
          <div>
            <h3 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <MessageSquare className="h-3.5 w-3.5" />
              Comments ({task.comments.length})
            </h3>
            {task.comments.length > 0 && (
              <div className="mt-2 space-y-3">
                {task.comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="rounded-md border border-border p-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-foreground">
                        {comment.actorType === "AGENT" ? "Agent" : "User"}{" "}
                        <span className="text-muted-foreground font-normal">
                          {comment.actorId.slice(0, 8)}
                        </span>
                      </span>
                      <time className="text-[11px] text-muted-foreground">
                        {new Date(comment.createdAt).toLocaleDateString()}
                      </time>
                    </div>
                    <p className="mt-1 text-sm text-foreground whitespace-pre-wrap">
                      {comment.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleAddComment();
                  }
                }}
                placeholder="Add a comment..."
                className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleAddComment}
                disabled={isPending || !commentText.trim()}
              >
                Send
              </Button>
            </div>
          </div>

          {/* Artifacts */}
          <div>
            <h3 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <FileText className="h-3.5 w-3.5" />
              Artifacts ({task.artifacts.length})
            </h3>
            {task.artifacts.length === 0 ? (
              <p className="mt-1.5 text-sm text-muted-foreground">
                No artifacts yet.
              </p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {task.artifacts.map((artifact) => (
                  <li
                    key={artifact.id}
                    className="flex items-center justify-between rounded-md border border-border px-2.5 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {artifact.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {artifact.type}
                      </p>
                    </div>
                    {artifact.url && (
                      <a
                        href={artifact.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline"
                      >
                        View
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Activity Log */}
          <div>
            <h3 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <Activity className="h-3.5 w-3.5" />
              Activity
            </h3>
            {runLogs.length === 0 ? (
              <p className="mt-1.5 text-sm text-muted-foreground">
                No activity yet.
              </p>
            ) : (
              <ul className="mt-2 space-y-2">
                {runLogs.map((log) => (
                  <li
                    key={log.id}
                    className="flex items-start gap-2 text-sm"
                  >
                    <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-300" />
                    <div className="flex-1">
                      <span className="font-medium text-foreground">
                        {log.eventType.replace(/_/g, " ")}
                      </span>
                      <span className="text-muted-foreground">
                        {" "}
                        by {log.actorType.toLowerCase()} {log.actorId.slice(0, 8)}
                      </span>
                      <time className="block text-[11px] text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString()}
                      </time>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
