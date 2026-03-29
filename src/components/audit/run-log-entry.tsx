"use client";

import { cn } from "@/lib/utils";
import {
  CheckCircle2, AlertCircle, Bot, User, Zap, FileText,
  GitBranch, Shield, Inbox, Brain, ChevronDown, ChevronRight
} from "lucide-react";
import * as React from "react";

interface RunLogEntryProps {
  entry: {
    id: string;
    eventType: string;
    entityType?: string | null;
    entityId?: string | null;
    actorType: string;
    actorId?: string | null;
    message?: string | null;
    metadata?: any;
    createdAt: string;
  };
  showLine?: boolean;
}

const eventIcons: Record<string, React.ElementType> = {
  task_created: FileText,
  task_updated: FileText,
  task_routed: Inbox,
  claim_created: Bot,
  claim_completed: CheckCircle2,
  approval_requested: Shield,
  approval_granted: CheckCircle2,
  approval_denied: AlertCircle,
  agent_registered: Bot,
  memory_created: Brain,
  workspace_created: Zap,
  project_created: GitBranch,
};

const eventColors: Record<string, { bg: string; text: string }> = {
  task_created: { bg: "bg-blue-100", text: "text-blue-600" },
  task_updated: { bg: "bg-blue-100", text: "text-blue-600" },
  task_routed: { bg: "bg-purple-100", text: "text-purple-600" },
  claim_created: { bg: "bg-amber-100", text: "text-amber-600" },
  claim_completed: { bg: "bg-emerald-100", text: "text-emerald-600" },
  approval_requested: { bg: "bg-orange-100", text: "text-orange-600" },
  approval_granted: { bg: "bg-emerald-100", text: "text-emerald-600" },
  approval_denied: { bg: "bg-red-100", text: "text-red-600" },
  agent_registered: { bg: "bg-violet-100", text: "text-violet-600" },
  memory_created: { bg: "bg-pink-100", text: "text-pink-600" },
  workspace_created: { bg: "bg-indigo-100", text: "text-indigo-600" },
  project_created: { bg: "bg-cyan-100", text: "text-cyan-600" },
};

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function RunLogEntry({ entry, showLine = true }: RunLogEntryProps) {
  const [expanded, setExpanded] = React.useState(false);
  const Icon = eventIcons[entry.eventType] || Zap;
  const colors = eventColors[entry.eventType] || { bg: "bg-gray-100", text: "text-gray-600" };
  const hasMetadata = entry.metadata && Object.keys(entry.metadata).length > 0;

  return (
    <div className="flex gap-3 group">
      {/* Timeline dot + line */}
      <div className="flex flex-col items-center">
        <div className={cn("rounded-lg p-1.5 shrink-0 ring-4 ring-background z-10", colors.bg)}>
          <Icon className={cn("h-3.5 w-3.5", colors.text)} />
        </div>
        {showLine && <div className="w-px flex-1 bg-border mt-1" />}
      </div>

      {/* Content */}
      <div className="pb-6 flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-medium leading-snug">
              {entry.message || entry.eventType.replace(/_/g, " ")}
            </p>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              <span className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                entry.actorType === "AGENT"
                  ? "bg-violet-50 text-violet-700"
                  : "bg-blue-50 text-blue-700"
              )}>
                {entry.actorType === "AGENT" ? "Agent" : "User"}
              </span>
              {entry.entityType && (
                <span className="bg-muted rounded-full px-2 py-0.5 text-[10px]">
                  {entry.entityType}
                </span>
              )}
              <span>{relativeTime(entry.createdAt)}</span>
            </div>
          </div>

          {hasMetadata && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted transition-colors"
            >
              {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>

        {expanded && hasMetadata && (
          <pre className="mt-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground overflow-x-auto animate-fade-in">
            {JSON.stringify(entry.metadata, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
