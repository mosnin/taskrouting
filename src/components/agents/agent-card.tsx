"use client";

import { cn } from "@/lib/utils";
import { Bot, Activity, Clock, MoreHorizontal } from "lucide-react";
import Link from "next/link";

interface AgentCardProps {
  agent: {
    id: string;
    name: string;
    description?: string | null;
    status: string;
    capabilities: string[];
    lastSeenAt?: string | null;
    _count?: { claims?: number; tokens?: number };
  };
}

const statusConfig: Record<string, { label: string; color: string; dot: string; bg: string }> = {
  ONLINE: { label: "Online", color: "text-emerald-600", dot: "bg-emerald-500", bg: "bg-emerald-50" },
  BUSY: { label: "Busy", color: "text-amber-600", dot: "bg-amber-500", bg: "bg-amber-50" },
  OFFLINE: { label: "Offline", color: "text-zinc-400", dot: "bg-zinc-400", bg: "bg-zinc-50" },
  ERROR: { label: "Error", color: "text-red-600", dot: "bg-red-500", bg: "bg-red-50" },
};

function relativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function AgentCard({ agent }: AgentCardProps) {
  const config = statusConfig[agent.status] || statusConfig.OFFLINE;
  const claimCount = agent._count?.claims ?? 0;

  return (
    <Link href={`/agents/${agent.id}`}>
      <div className="group rounded-xl border bg-card p-5 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-all duration-200 hover:border-primary/20 cursor-pointer">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 p-2.5">
                <Bot className="h-5 w-5 text-white" />
              </div>
              {/* Status dot */}
              <div className={cn(
                "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white",
                config.dot,
                agent.status === "ONLINE" && "animate-pulse"
              )} />
            </div>
            <div>
              <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">{agent.name}</h3>
              <span className={cn("text-xs font-medium", config.color)}>{config.label}</span>
            </div>
          </div>
          <button className="opacity-0 group-hover:opacity-100 transition-opacity rounded-lg p-1.5 hover:bg-muted">
            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Description */}
        {agent.description && (
          <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{agent.description}</p>
        )}

        {/* Capabilities */}
        {agent.capabilities.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {agent.capabilities.slice(0, 3).map((cap) => (
              <span
                key={cap}
                className="inline-flex items-center rounded-md bg-purple-50 px-1.5 py-0.5 text-[10px] font-medium text-purple-700 ring-1 ring-inset ring-purple-200"
              >
                {cap}
              </span>
            ))}
            {agent.capabilities.length > 3 && (
              <span className="text-[10px] text-muted-foreground self-center">
                +{agent.capabilities.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Stats row */}
        <div className="flex items-center gap-4 pt-3 border-t text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Activity className="h-3 w-3" />
            <span>{claimCount} claims</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{relativeTime(agent.lastSeenAt)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
