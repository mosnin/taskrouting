"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, Inbox, Zap, Loader2 } from "lucide-react";
import { TaskCard } from "@/components/tasks/task-card";
import { getQueueTasks } from "@/actions/queue";
import { useWorkspace } from "@/hooks/use-workspace";

interface QueueCardProps {
  queue: {
    id: string;
    name: string;
    description?: string | null;
    requiredCapabilities: string[];
    taskCount: number;
  };
  onTaskClick?: (taskId: string) => void;
}

export function QueueCard({ queue, onTaskClick }: QueueCardProps) {
  const { workspaceId } = useWorkspace();
  const [expanded, setExpanded] = React.useState(false);
  const [tasks, setTasks] = React.useState<Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    ownerType: string;
    ownerId?: string | null;
    queueId?: string | null;
    dueAt?: Date | null;
  }> | null>(null);
  const [isPending, startTransition] = React.useTransition();

  const taskCount = queue.taskCount;
  const maxDepth = 20;
  const depthPct = Math.min((taskCount / maxDepth) * 100, 100);
  const depthColor = depthPct > 80 ? "bg-red-500" : depthPct > 50 ? "bg-amber-500" : "bg-emerald-500";

  function handleToggle() {
    if (!expanded && tasks === null) {
      startTransition(async () => {
        const fetchedTasks = await getQueueTasks(queue.id, workspaceId);
        setTasks(fetchedTasks);
      });
    }
    setExpanded(!expanded);
  }

  return (
    <div className="rounded-xl border bg-card shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-all duration-200 overflow-hidden">
      <button
        onClick={handleToggle}
        className="w-full flex items-center gap-4 p-4 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 p-2.5 shrink-0">
          <Inbox className="h-4 w-4 text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm">{queue.name}</h3>
            <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5 tabular-nums">
              {taskCount} task{taskCount !== 1 ? "s" : ""}
            </span>
          </div>
          {queue.description && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{queue.description}</p>
          )}

          {/* Capabilities */}
          {queue.requiredCapabilities.length > 0 && (
            <div className="flex items-center gap-1 mt-2">
              <Zap className="h-3 w-3 text-purple-500 shrink-0" />
              <div className="flex gap-1 flex-wrap">
                {queue.requiredCapabilities.map((cap) => (
                  <span
                    key={cap}
                    className="inline-flex items-center rounded-md bg-purple-50 px-1.5 py-0.5 text-[10px] font-medium text-purple-700 ring-1 ring-inset ring-purple-200"
                  >
                    {cap}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Depth bar */}
          <div className="flex items-center gap-2 mt-2">
            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all duration-500", depthColor)}
                style={{ width: `${depthPct}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">{Math.round(depthPct)}%</span>
          </div>
        </div>

        <div className="shrink-0 text-muted-foreground">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t px-4 py-3 bg-muted/20 animate-fade-in">
          {isPending ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : tasks && tasks.length > 0 ? (
            <div className="space-y-2">
              {tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  queueName={queue.name}
                  onClick={onTaskClick}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No tasks in queue</p>
          )}
        </div>
      )}
    </div>
  );
}
