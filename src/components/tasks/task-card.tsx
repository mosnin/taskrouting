"use client";

import { cn } from "@/lib/utils";
import { TaskStatusBadge } from "./task-status-badge";
import { TaskPriorityBadge } from "./task-priority-badge";
import { Bot, Calendar, Inbox, User, AlertTriangle } from "lucide-react";

interface TaskCardProps {
  task: {
    id: string;
    title: string;
    description?: string | null;
    status: string;
    priority: string;
    ownerType: string;
    ownerId?: string | null;
    queueId?: string | null;
    dueAt?: string | Date | null;
    subtasks?: { id: string; status: string }[];
  };
  queueName?: string;
  onClick?: (taskId: string) => void;
  className?: string;
}

const ownerTypeIcon: Record<string, { icon: typeof User; label: string }> = {
  USER: { icon: User, label: "Human" },
  AGENT: { icon: Bot, label: "Agent" },
  UNASSIGNED: { icon: User, label: "Unassigned" },
};

function getDueDateInfo(dueAt: string | Date) {
  const now = new Date();
  const due = new Date(dueAt);
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  const formatted = due.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  if (diffDays < 0) {
    return { label: formatted, className: "text-red-600 bg-red-50", overdue: true };
  }
  if (diffDays <= 2) {
    return { label: formatted, className: "text-amber-600 bg-amber-50", overdue: false };
  }
  return { label: formatted, className: "text-muted-foreground", overdue: false };
}

export function TaskCard({ task, queueName, onClick, className }: TaskCardProps) {
  const ownerInfo = ownerTypeIcon[task.ownerType] ?? ownerTypeIcon.UNASSIGNED;
  const OwnerIcon = ownerInfo.icon;

  const dueDateInfo = task.dueAt ? getDueDateInfo(task.dueAt) : null;

  // Subtask progress
  const subtasks = task.subtasks ?? [];
  const doneCount = subtasks.filter((s) => s.status === "DONE").length;
  const totalSubtasks = subtasks.length;
  const progressPct = totalSubtasks > 0 ? (doneCount / totalSubtasks) * 100 : 0;

  return (
    <button
      type="button"
      onClick={() => onClick?.(task.id)}
      className={cn(
        "group flex w-full flex-col gap-2.5 rounded-lg border border-border bg-white p-4 text-left",
        "transition-all duration-200",
        "hover:border-zinc-300 hover:bg-zinc-50/50 hover:-translate-y-px hover:shadow-md",
        "active:translate-y-0 active:shadow-sm",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-foreground leading-snug group-hover:text-primary transition-colors">
          {task.title}
        </p>
        <TaskPriorityBadge priority={task.priority} />
      </div>

      {task.description && (
        <p className="text-xs text-muted-foreground line-clamp-1">{task.description}</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <TaskStatusBadge status={task.status} />

        {queueName && (
          <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-muted-foreground">
            <Inbox className="h-3 w-3" />
            {queueName}
          </span>
        )}

        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]",
            task.ownerType === "UNASSIGNED"
              ? "text-muted-foreground bg-zinc-100"
              : task.ownerType === "AGENT"
                ? "text-violet-700 bg-violet-50"
                : "text-foreground bg-zinc-100"
          )}
        >
          <OwnerIcon className="h-3 w-3" />
          {ownerInfo.label}
        </span>

        {dueDateInfo && (
          <span className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]",
            dueDateInfo.className
          )}>
            {dueDateInfo.overdue ? <AlertTriangle className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
            {dueDateInfo.label}
          </span>
        )}
      </div>

      {/* Subtask progress bar */}
      {totalSubtasks > 0 && (
        <div className="flex items-center gap-2 pt-1">
          <div className="flex-1 h-1.5 rounded-full bg-zinc-100 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-300",
                progressPct === 100 ? "bg-emerald-500" : "bg-blue-500"
              )}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="text-[10px] text-muted-foreground font-medium shrink-0">
            {doneCount}/{totalSubtasks}
          </span>
        </div>
      )}
    </button>
  );
}
