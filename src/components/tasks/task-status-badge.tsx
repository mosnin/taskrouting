"use client";

import { cn } from "@/lib/utils";

const statusConfig: Record<string, { label: string; className: string }> = {
  BACKLOG: {
    label: "Backlog",
    className: "bg-zinc-100 text-zinc-600 border-zinc-200",
  },
  TODO: {
    label: "Todo",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  IN_PROGRESS: {
    label: "In Progress",
    className: "bg-yellow-50 text-yellow-700 border-yellow-200",
  },
  IN_REVIEW: {
    label: "In Review",
    className: "bg-purple-50 text-purple-700 border-purple-200",
  },
  DONE: {
    label: "Done",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  CANCELLED: {
    label: "Cancelled",
    className: "bg-red-50 text-red-700 border-red-200",
  },
};

interface TaskStatusBadgeProps {
  status: string;
  className?: string;
}

export function TaskStatusBadge({ status, className }: TaskStatusBadgeProps) {
  const config = statusConfig[status] ?? {
    label: status,
    className: "bg-zinc-100 text-zinc-600 border-zinc-200",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium leading-tight",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
