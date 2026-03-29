"use client";

import { cn } from "@/lib/utils";

const priorityConfig: Record<string, { label: string; className: string }> = {
  URGENT: {
    label: "Urgent",
    className: "bg-red-50 text-red-700 border-red-200",
  },
  HIGH: {
    label: "High",
    className: "bg-orange-50 text-orange-700 border-orange-200",
  },
  MEDIUM: {
    label: "Medium",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  LOW: {
    label: "Low",
    className: "bg-zinc-100 text-zinc-600 border-zinc-200",
  },
};

interface TaskPriorityBadgeProps {
  priority: string;
  className?: string;
}

export function TaskPriorityBadge({
  priority,
  className,
}: TaskPriorityBadgeProps) {
  const config = priorityConfig[priority] ?? {
    label: priority,
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
