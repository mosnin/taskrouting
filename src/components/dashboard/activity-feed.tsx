"use client";

import { cn } from "@/lib/utils";
import {
  CheckCircle2, AlertCircle, Bot, User, Zap, FileText,
  GitBranch, Shield, Inbox, Brain
} from "lucide-react";

interface ActivityItem {
  id: string;
  eventType: string;
  entityType: string;
  entityId: string;
  actorType: string;
  actorId: string;
  message: string;
  createdAt: string;
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

const eventColors: Record<string, string> = {
  task_created: "bg-blue-100 text-blue-600",
  task_updated: "bg-blue-100 text-blue-600",
  task_routed: "bg-purple-100 text-purple-600",
  claim_created: "bg-amber-100 text-amber-600",
  claim_completed: "bg-emerald-100 text-emerald-600",
  approval_requested: "bg-orange-100 text-orange-600",
  approval_granted: "bg-emerald-100 text-emerald-600",
  approval_denied: "bg-red-100 text-red-600",
  agent_registered: "bg-violet-100 text-violet-600",
  memory_created: "bg-pink-100 text-pink-600",
  workspace_created: "bg-indigo-100 text-indigo-600",
  project_created: "bg-cyan-100 text-cyan-600",
};

function relativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <div className="space-y-1">
      {items.map((item, i) => {
        const Icon = eventIcons[item.eventType] || Zap;
        const colorClass = eventColors[item.eventType] || "bg-gray-100 text-gray-600";
        return (
          <div
            key={item.id}
            className="flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/50 transition-colors group animate-fade-in"
            style={{ animationDelay: `${i * 30}ms` }}
          >
            <div className={cn("rounded-lg p-1.5 shrink-0 mt-0.5", colorClass)}>
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm leading-snug">
                {item.message || item.eventType.replace(/_/g, " ")}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] text-muted-foreground">
                  {item.actorType === "AGENT" ? "Agent" : "User"}
                </span>
                <span className="text-[11px] text-muted-foreground">·</span>
                <span className="text-[11px] text-muted-foreground">
                  {relativeTime(item.createdAt)}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
