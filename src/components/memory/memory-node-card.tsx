"use client";

import { cn } from "@/lib/utils";
import { Brain, FileText, Code, Lightbulb, AlertTriangle, Bookmark, Link2, MessagesSquare, ClipboardList, BookOpen, FlaskConical, Newspaper } from "lucide-react";

interface MemoryNodeCardProps {
  node: {
    id: string;
    type: string;
    title: string;
    content: string;
    version: number;
    updatedAt: Date | string;
    project?: { name: string } | null;
    task?: { title: string } | null;
  };
  onClick?: () => void;
}

const typeConfig: Record<string, { icon: React.ElementType; color: string; bg: string; ring: string }> = {
  DOCUMENT: { icon: FileText, color: "text-blue-600", bg: "bg-blue-50", ring: "ring-blue-200" },
  DECISION: { icon: Lightbulb, color: "text-amber-600", bg: "bg-amber-50", ring: "ring-amber-200" },
  CHECKLIST: { icon: ClipboardList, color: "text-emerald-600", bg: "bg-emerald-50", ring: "ring-emerald-200" },
  SPEC: { icon: Code, color: "text-violet-600", bg: "bg-violet-50", ring: "ring-violet-200" },
  RUNBOOK: { icon: BookOpen, color: "text-orange-600", bg: "bg-orange-50", ring: "ring-orange-200" },
  RESEARCH: { icon: FlaskConical, color: "text-cyan-600", bg: "bg-cyan-50", ring: "ring-cyan-200" },
  MEETING_NOTES: { icon: Newspaper, color: "text-pink-600", bg: "bg-pink-50", ring: "ring-pink-200" },
  REFERENCE: { icon: Link2, color: "text-purple-600", bg: "bg-purple-50", ring: "ring-purple-200" },
};

function relativeTime(dateInput: Date | string): string {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  const diff = Date.now() - date.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export function MemoryNodeCard({ node, onClick }: MemoryNodeCardProps) {
  const config = typeConfig[node.type] || typeConfig.DOCUMENT;
  const Icon = config.icon;
  const typeLabel = node.type.replace(/_/g, " ");

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl border bg-card p-4 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:border-primary/20 transition-all duration-200 group"
    >
      <div className="flex items-start gap-3">
        <div className={cn("rounded-lg p-2 ring-1 shrink-0", config.bg, config.ring)}>
          <Icon className={cn("h-4 w-4", config.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">{node.title}</h3>
            <span className={cn(
              "shrink-0 inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ring-1",
              config.bg, config.color, config.ring
            )}>
              {typeLabel}
            </span>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{node.content}</p>

          {/* Meta */}
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span>v{node.version}</span>
            {node.project && (
              <>
                <span>·</span>
                <span className="truncate">{node.project.name}</span>
              </>
            )}
            {node.task && (
              <>
                <span>·</span>
                <span className="truncate">{node.task.title}</span>
              </>
            )}
            <span className="ml-auto">{relativeTime(node.updatedAt)}</span>
          </div>
        </div>
      </div>
    </button>
  );
}
