"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { relativeTime } from "@/lib/format";

interface AgentCardProps {
  agent: {
    id: string;
    name: string;
    description?: string | null;
    status: "ONLINE" | "OFFLINE" | "BUSY" | "ERROR";
    capabilities: string[];
    lastSeenAt?: Date | string | null;
    _count?: { claims?: number };
  };
  activeClaims?: number;
}

const statusConfig: Record<
  string,
  { color: string; bg: string; label: string }
> = {
  ONLINE: { color: "bg-emerald-500", bg: "text-emerald-700", label: "Online" },
  OFFLINE: { color: "bg-zinc-400", bg: "text-zinc-500", label: "Offline" },
  BUSY: { color: "bg-amber-500", bg: "text-amber-700", label: "Busy" },
  ERROR: { color: "bg-red-500", bg: "text-red-700", label: "Error" },
};

export function AgentCard({ agent, activeClaims = 0 }: AgentCardProps) {
  const status = statusConfig[agent.status] ?? statusConfig.OFFLINE;

  return (
    <Link href={`/agents/${agent.id}`}>
      <Card className="shadow-sm transition-shadow hover:shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <CardTitle className="text-sm font-semibold">{agent.name}</CardTitle>
            <div className="flex items-center gap-1.5">
              <div className={cn("h-2 w-2 rounded-full", status.color)} />
              <span className={cn("text-xs font-medium", status.bg)}>
                {status.label}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {agent.description && (
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {agent.description}
            </p>
          )}

          {agent.capabilities.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {agent.capabilities.slice(0, 4).map((cap) => (
                <Badge
                  key={cap}
                  variant="secondary"
                  className="text-[11px] font-normal"
                >
                  {cap}
                </Badge>
              ))}
              {agent.capabilities.length > 4 && (
                <Badge variant="secondary" className="text-[11px] font-normal">
                  +{agent.capabilities.length - 4}
                </Badge>
              )}
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {activeClaims > 0
                ? `${activeClaims} active claim${activeClaims !== 1 ? "s" : ""}`
                : "No active claims"}
            </span>
            {agent.lastSeenAt && (
              <span>Seen {relativeTime(agent.lastSeenAt)}</span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
