"use client";

import * as React from "react";
import { User, Bot, Cpu, ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { relativeTime, absoluteTime } from "@/lib/format";

interface RunLogEntryProps {
  entry: {
    id: string;
    eventType: string;
    actorType: "USER" | "AGENT" | "SYSTEM";
    actorId: string;
    entityType: string;
    entityId: string;
    metadata?: Record<string, unknown> | null;
    createdAt: Date | string;
  };
}

const eventColors: Record<string, string> = {
  task_created: "bg-blue-100 text-blue-800",
  task_completed: "bg-emerald-100 text-emerald-800",
  task_claimed: "bg-violet-100 text-violet-800",
  task_released: "bg-amber-100 text-amber-800",
  approval_requested: "bg-orange-100 text-orange-800",
  approval_granted: "bg-emerald-100 text-emerald-800",
  approval_denied: "bg-red-100 text-red-800",
  agent_connected: "bg-cyan-100 text-cyan-800",
  agent_disconnected: "bg-zinc-100 text-zinc-800",
  integration_connected: "bg-indigo-100 text-indigo-800",
  integration_disconnected: "bg-zinc-100 text-zinc-800",
  workspace_created: "bg-blue-100 text-blue-800",
  memory_created: "bg-pink-100 text-pink-800",
  memory_updated: "bg-pink-100 text-pink-800",
};

const actorIcons: Record<string, React.ElementType> = {
  USER: User,
  AGENT: Bot,
  SYSTEM: Cpu,
};

export function RunLogEntry({ entry }: RunLogEntryProps) {
  const [expanded, setExpanded] = React.useState(false);

  const ActorIcon = actorIcons[entry.actorType] ?? Cpu;
  const eventColor =
    eventColors[entry.eventType] ?? "bg-zinc-100 text-zinc-800";
  const eventLabel = entry.eventType.replace(/_/g, " ");

  return (
    <div className="group border-b border-border px-4 py-3 transition-colors hover:bg-accent/30">
      <div className="flex items-start gap-3">
        {/* Timestamp */}
        <div className="w-20 shrink-0">
          <span
            className="text-xs text-muted-foreground"
            title={absoluteTime(entry.createdAt)}
          >
            {relativeTime(entry.createdAt)}
          </span>
        </div>

        {/* Event type */}
        <Badge
          variant="secondary"
          className={`shrink-0 text-[11px] font-medium ${eventColor}`}
        >
          {eventLabel}
        </Badge>

        {/* Actor */}
        <div className="flex items-center gap-1.5">
          <ActorIcon className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm text-foreground">
            {entry.actorType.toLowerCase()}:{entry.actorId.slice(0, 8)}
          </span>
        </div>

        {/* Entity */}
        <span className="text-sm text-muted-foreground">
          {entry.entityType}/{entry.entityId.slice(0, 8)}
        </span>

        {/* Expand metadata */}
        {entry.metadata && Object.keys(entry.metadata).length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="ml-auto flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
            <span>details</span>
          </button>
        )}
      </div>

      {expanded && entry.metadata && (
        <div className="mt-2 ml-20">
          <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs text-muted-foreground">
            {JSON.stringify(entry.metadata, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
