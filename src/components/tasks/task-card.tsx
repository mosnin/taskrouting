"use client";

import { cn } from "@/lib/utils";
import { TaskStatusBadge } from "./task-status-badge";
import { TaskPriorityBadge } from "./task-priority-badge";
import { Bot, Calendar, Inbox, User } from "lucide-react";

interface TaskCardProps {
  task: {
    id: string;
    title: string;
    status: string;
    priority: string;
    ownerType: string;
    ownerId?: string | null;
    queueId?: string | null;
    dueAt?: string | Date | null;
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

export function TaskCard({ task, queueName, onClick, className }: TaskCardProps) {
  const ownerInfo = ownerTypeIcon[task.ownerType] ?? ownerTypeIcon.UNASSIGNED;
  const OwnerIcon = ownerInfo.icon;

  const dueDate = task.dueAt
    ? new Date(task.dueAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <button
      type="button"
      onClick={() => onClick?.(task.id)}
      className={cn(
        "group flex w-full flex-col gap-2 rounded-lg border border-border bg-white p-3 text-left transition-colors hover:border-zinc-300 hover:bg-zinc-50/50",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-foreground leading-snug">
          {task.title}
        </p>
        <TaskPriorityBadge priority={task.priority} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <TaskStatusBadge status={task.status} />

        {queueName && (
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <Inbox className="h-3 w-3" />
            {queueName}
          </span>
        )}

        <span
          className={cn(
            "inline-flex items-center gap-1 text-[11px]",
            task.ownerType === "UNASSIGNED"
              ? "text-muted-foreground"
              : task.ownerType === "AGENT"
                ? "text-violet-600"
                : "text-foreground"
          )}
        >
          <OwnerIcon className="h-3 w-3" />
          {ownerInfo.label}
        </span>

        {dueDate && (
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {dueDate}
          </span>
        )}
      </div>
    </button>
  );
}
