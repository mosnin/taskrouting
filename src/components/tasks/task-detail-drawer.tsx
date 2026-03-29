"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { X, MessageSquare, FileText, Activity, CheckSquare, Send, Bot, User } from "lucide-react";
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
  PENDING: { label: "Pending Approval", className: "text-yellow-600 bg-yellow-50" },
  APPROVED: { label: "Approved", className: "text-emerald-600 bg-emerald-50" },
  DENIED: { label: "Denied", className: "text-red-600 bg-red-50" },
};

function relativeTime(dateStr: string | Date): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

const statusGradients: Record<string, string> = {
  BACKLOG: "from-zinc-400 to-zinc-500",
  TODO: "from-blue-400 to-blue-500",
  IN_PROGRESS: "from-amber-400 to-amber-500",
  IN_REVIEW: "from-purple-400 to-purple-500",
  DONE: "from-emerald-400 to-emerald-500",
  CANCELLED: "from-red-400 to-red-500",
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
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  function handleTitleSave() {
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== task.title) {
      startTransition(async () => {
        await updateTask({
          taskId: task.id,
          workspaceId,
          title: trimmed,
        });
        onUpdate?.();
      });
    }
    setIsEditingTitle(false);
  }

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
  const gradient = statusGradients[task.status] ?? statusGradients.BACKLOG;

  // Subtask progress
  const doneSubtasks = task.subtasks.filter((s) => s.status === "DONE").length;
  const subtaskPct = task.subtasks.length > 0 ? (doneSubtasks / task.subtasks.length) * 100 : 0;

  return (
    <>
      {/* Backdrop with glassmorphism */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col bg-background shadow-2xl animate-slide-in border-l border-border">
        {/* Header with gradient accent */}
        <div className="relative">
          <div className={cn("h-1 bg-gradient-to-r", gradient)} />
          <div className="flex items-start justify-between px-6 py-4">
            <div className="flex-1 min-w-0 pr-4">
              {isEditingTitle ? (
                <input
                  ref={titleInputRef}
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onBlur={handleTitleSave}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleTitleSave();
                    if (e.key === "Escape") {
                      setEditTitle(task.title);
                      setIsEditingTitle(false);
                    }
                  }}
                  className="w-full text-base font-semibold text-foreground bg-transparent border-b-2 border-primary outline-none pb-0.5"
                />
              ) : (
                <h2
                  className="text-base font-semibold text-foreground truncate cursor-text hover:text-primary transition-colors"
                  onClick={() => {
                    setEditTitle(task.title);
                    setIsEditingTitle(true);
                  }}
                  title="Click to edit title"
                >
                  {task.title}
                </h2>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Updated {relativeTime(task.updatedAt)}
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-6 px-6 py-5">
            {/* Description */}
            {task.description && (
              <div className="rounded-lg bg-muted/30 p-4">
                <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                  Description
                </h3>
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
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
                  className="w-full rounded-lg border border-input bg-background px-2.5 py-2 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20 transition-shadow"
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
                  className="w-full rounded-lg border border-input bg-background px-2.5 py-2 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20 transition-shadow"
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
                className="w-full rounded-lg border border-input bg-background px-2.5 py-2 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20 transition-shadow"
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
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1.5">
                Approval
              </h3>
              <span className={cn(
                "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
                approvalInfo.className
              )}>
                {approvalInfo.label}
              </span>
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

            {/* Subtasks with progress */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <CheckSquare className="h-3.5 w-3.5" />
                  Subtasks ({task.subtasks.length})
                </h3>
                {task.subtasks.length > 0 && (
                  <span className="text-[11px] text-muted-foreground font-medium">
                    {doneSubtasks}/{task.subtasks.length} done
                  </span>
                )}
              </div>

              {/* Progress bar for subtasks */}
              {task.subtasks.length > 0 && (
                <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden mb-3">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      subtaskPct === 100 ? "bg-emerald-500" : "bg-blue-500"
                    )}
                    style={{ width: `${subtaskPct}%` }}
                  />
                </div>
              )}

              {task.subtasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No subtasks yet.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {task.subtasks.map((subtask) => (
                    <li
                      key={subtask.id}
                      className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2 transition-colors hover:bg-muted/30"
                    >
                      <div
                        className={cn(
                          "h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0",
                          subtask.status === "DONE"
                            ? "border-emerald-500 bg-emerald-500"
                            : subtask.status === "IN_PROGRESS"
                              ? "border-amber-400 bg-amber-50"
                              : "border-zinc-300"
                        )}
                      >
                        {subtask.status === "DONE" && (
                          <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
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

            {/* Comments - chat bubble style */}
            <div>
              <h3 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">
                <MessageSquare className="h-3.5 w-3.5" />
                Comments ({task.comments.length})
              </h3>
              {task.comments.length > 0 && (
                <div className="space-y-3">
                  {task.comments.map((comment) => {
                    const isAgent = comment.actorType === "AGENT";
                    return (
                      <div
                        key={comment.id}
                        className={cn(
                          "flex gap-2.5",
                          isAgent ? "flex-row" : "flex-row"
                        )}
                      >
                        {/* Avatar */}
                        <div className={cn(
                          "h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                          isAgent ? "bg-violet-100" : "bg-blue-100"
                        )}>
                          {isAgent ? (
                            <Bot className="h-3.5 w-3.5 text-violet-600" />
                          ) : (
                            <User className="h-3.5 w-3.5 text-blue-600" />
                          )}
                        </div>

                        {/* Bubble */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-foreground">
                              {isAgent ? "Agent" : "You"}
                            </span>
                            <time className="text-[11px] text-muted-foreground">
                              {relativeTime(comment.createdAt)}
                            </time>
                          </div>
                          <div className={cn(
                            "rounded-lg px-3 py-2 text-sm whitespace-pre-wrap",
                            isAgent
                              ? "bg-violet-50 text-violet-900 border border-violet-100"
                              : "bg-muted/50 text-foreground border border-border"
                          )}>
                            {comment.content}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Comment input */}
              <div className="mt-3 flex gap-2 items-end">
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
                  className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20 transition-shadow"
                />
                <Button
                  size="sm"
                  onClick={handleAddComment}
                  disabled={isPending || !commentText.trim()}
                  className="shrink-0"
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Artifacts */}
            <div>
              <h3 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                <FileText className="h-3.5 w-3.5" />
                Artifacts ({task.artifacts.length})
              </h3>
              {task.artifacts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No artifacts yet.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {task.artifacts.map((artifact) => (
                    <li
                      key={artifact.id}
                      className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 transition-colors hover:bg-muted/30"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {artifact.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {artifact.type} -- {relativeTime(artifact.createdAt)}
                        </p>
                      </div>
                      {artifact.url && (
                        <a
                          href={artifact.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                        >
                          View
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Activity Timeline with connected dots */}
            <div>
              <h3 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">
                <Activity className="h-3.5 w-3.5" />
                Activity
              </h3>
              {runLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No activity yet.
                </p>
              ) : (
                <div className="relative">
                  {/* Connecting line */}
                  <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />

                  <ul className="space-y-3">
                    {runLogs.map((log, index) => (
                      <li
                        key={log.id}
                        className="relative flex items-start gap-3 pl-0"
                      >
                        {/* Dot */}
                        <div className={cn(
                          "relative z-10 mt-1.5 h-[15px] w-[15px] rounded-full border-2 shrink-0",
                          index === 0
                            ? "border-primary bg-primary"
                            : "border-zinc-300 bg-background"
                        )} />

                        {/* Content */}
                        <div className="flex-1 min-w-0 pb-0.5">
                          <div className="flex items-baseline gap-1.5 flex-wrap">
                            <span className="text-sm font-medium text-foreground">
                              {log.eventType.replace(/_/g, " ")}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              by {log.actorType.toLowerCase()} {log.actorId.slice(0, 8)}
                            </span>
                          </div>
                          <time className="text-[11px] text-muted-foreground">
                            {relativeTime(log.createdAt)}
                          </time>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
