"use client";

import { cn } from "@/lib/utils";

interface StatusData {
  status: string;
  count: number;
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  BACKLOG: { label: "Backlog", color: "bg-zinc-500", bg: "bg-zinc-100" },
  TODO: { label: "To Do", color: "bg-blue-500", bg: "bg-blue-100" },
  IN_PROGRESS: { label: "In Progress", color: "bg-amber-500", bg: "bg-amber-100" },
  IN_REVIEW: { label: "In Review", color: "bg-purple-500", bg: "bg-purple-100" },
  DONE: { label: "Done", color: "bg-emerald-500", bg: "bg-emerald-100" },
  CANCELLED: { label: "Cancelled", color: "bg-red-500", bg: "bg-red-100" },
};

export function TaskStatusChart({ data }: { data: StatusData[] }) {
  const total = data.reduce((sum, d) => sum + d.count, 0) || 1;

  return (
    <div className="space-y-3">
      {/* Stacked bar */}
      <div className="flex h-3 rounded-full overflow-hidden bg-muted">
        {data
          .filter((d) => d.count > 0)
          .map((d) => {
            const config = statusConfig[d.status] || { label: d.status, color: "bg-gray-400", bg: "bg-gray-100" };
            const pct = (d.count / total) * 100;
            return (
              <div
                key={d.status}
                className={cn("transition-all duration-500", config.color)}
                style={{ width: `${pct}%` }}
                title={`${config.label}: ${d.count}`}
              />
            );
          })}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-2">
        {data.map((d) => {
          const config = statusConfig[d.status] || { label: d.status, color: "bg-gray-400", bg: "bg-gray-100" };
          return (
            <div key={d.status} className="flex items-center gap-2 text-sm">
              <div className={cn("h-2.5 w-2.5 rounded-full", config.color)} />
              <span className="text-muted-foreground">{config.label}</span>
              <span className="ml-auto font-medium tabular-nums">{d.count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
