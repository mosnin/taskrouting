"use client";

import { useState, useTransition } from "react";
import { ChevronDown, ChevronRight, Inbox, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CapabilityBadge } from "@/components/shared/capability-badge";
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
  const [expanded, setExpanded] = useState(false);
  const [tasks, setTasks] = useState<Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    ownerType: string;
    ownerId?: string | null;
    queueId?: string | null;
    dueAt?: Date | null;
  }> | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    if (!expanded && tasks === null) {
      startTransition(async () => {
        const fetchedTasks = await getQueueTasks(queue.id, workspaceId);
        setTasks(fetchedTasks);
      });
    }
    setExpanded(!expanded);
  }

  // depth bar color based on task count
  const depthPercent = Math.min(queue.taskCount / 20, 1);
  const depthColor =
    depthPercent > 0.7
      ? "bg-red-500"
      : depthPercent > 0.4
        ? "bg-yellow-500"
        : "bg-emerald-500";

  return (
    <Card className="shadow-sm">
      <CardHeader
        className="cursor-pointer select-none"
        onClick={handleToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100">
              <Inbox className="h-4 w-4 text-zinc-500" />
            </div>
            <div>
              <CardTitle className="text-sm">{queue.name}</CardTitle>
              {queue.description && (
                <CardDescription className="mt-0.5">
                  {queue.description}
                </CardDescription>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Depth indicator */}
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-zinc-100">
                <div
                  className={cn("h-full rounded-full transition-all", depthColor)}
                  style={{ width: `${depthPercent * 100}%` }}
                />
              </div>
              <span className="text-xs font-medium text-muted-foreground tabular-nums">
                {queue.taskCount}
              </span>
            </div>
            {expanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Capabilities */}
        {queue.requiredCapabilities.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {queue.requiredCapabilities.map((cap) => (
              <CapabilityBadge key={cap} capability={cap} />
            ))}
          </div>
        )}
      </CardHeader>

      {/* Expandable task list */}
      {expanded && (
        <CardContent>
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
            <p className="py-4 text-center text-sm text-muted-foreground">
              No tasks in this queue.
            </p>
          )}
        </CardContent>
      )}
    </Card>
  );
}
