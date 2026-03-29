"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { relativeTime } from "@/lib/format";

interface MemoryNodeCardProps {
  node: {
    id: string;
    title: string;
    type: string;
    content: string;
    version: number;
    updatedAt: Date | string;
    project?: { name: string } | null;
    task?: { title: string } | null;
  };
  onClick?: () => void;
}

const typeColors: Record<string, string> = {
  DOCUMENT: "bg-blue-100 text-blue-800",
  CHECKLIST: "bg-emerald-100 text-emerald-800",
  DECISION: "bg-violet-100 text-violet-800",
  SPEC: "bg-amber-100 text-amber-800",
  RUNBOOK: "bg-orange-100 text-orange-800",
  RESEARCH: "bg-cyan-100 text-cyan-800",
  MEETING_NOTES: "bg-pink-100 text-pink-800",
  REFERENCE: "bg-zinc-100 text-zinc-800",
};

export function MemoryNodeCard({ node, onClick }: MemoryNodeCardProps) {
  const preview =
    node.content.length > 200
      ? node.content.slice(0, 200) + "..."
      : node.content;

  const typeLabel = node.type.replace(/_/g, " ");
  const typeColor = typeColors[node.type] ?? "bg-zinc-100 text-zinc-800";

  return (
    <Card
      className="cursor-pointer shadow-sm transition-shadow hover:shadow-md"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-semibold">{node.title}</CardTitle>
          <Badge
            variant="secondary"
            className={`shrink-0 text-[11px] font-medium ${typeColor}`}
          >
            {typeLabel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="line-clamp-3 text-sm text-muted-foreground">{preview}</p>

        <div className="flex flex-wrap gap-2">
          {node.project && (
            <span className="text-xs text-muted-foreground">
              Project: {node.project.name}
            </span>
          )}
          {node.task && (
            <span className="text-xs text-muted-foreground">
              Task: {node.task.title}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>v{node.version}</span>
          <span>Updated {relativeTime(node.updatedAt)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
