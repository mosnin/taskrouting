"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { TaskCard } from "@/components/tasks/task-card";
import { TaskDetailDrawer } from "@/components/tasks/task-detail-drawer";
import { WorkspaceContext } from "@/hooks/use-workspace";
import { cn } from "@/lib/utils";

const STATUS_COLUMNS = [
  { key: "BACKLOG", label: "Backlog", color: "bg-zinc-400" },
  { key: "TODO", label: "Todo", color: "bg-blue-500" },
  { key: "IN_PROGRESS", label: "In Progress", color: "bg-yellow-500" },
  { key: "IN_REVIEW", label: "In Review", color: "bg-purple-500" },
  { key: "DONE", label: "Done", color: "bg-emerald-500" },
] as const;

interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  ownerType: string;
  ownerId?: string | null;
  queueId?: string | null;
  dueAt?: Date | null;
  approvalState: string;
  requiredCapabilities: string[];
  createdAt: Date;
  updatedAt: Date;
  order: number;
}

interface Queue {
  id: string;
  name: string;
  description?: string | null;
  requiredCapabilities: string[];
  taskCount: number;
}

interface SheetBoardClientProps {
  project: { id: string; name: string };
  sheet: {
    id: string;
    name: string;
    description?: string | null;
    tasks: Task[];
  };
  queues: Queue[];
  workspaceId: string;
  userId: string;
}

export function SheetBoardClient({
  project,
  sheet,
  queues,
  workspaceId,
  userId,
}: SheetBoardClientProps) {
  const router = useRouter();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const queueNames = new Map(queues.map((q) => [q.id, q.name]));

  // Group tasks by status
  const tasksByStatus = new Map<string, Task[]>();
  for (const col of STATUS_COLUMNS) {
    tasksByStatus.set(col.key, []);
  }
  for (const task of sheet.tasks) {
    const list = tasksByStatus.get(task.status);
    if (list) {
      list.push(task);
    } else {
      // If status isn't in our columns (e.g., CANCELLED), skip or put in backlog
      tasksByStatus.get("BACKLOG")?.push(task);
    }
  }

  const selectedTask = selectedTaskId
    ? sheet.tasks.find((t) => t.id === selectedTaskId)
    : null;

  return (
    <WorkspaceContext.Provider value={{ workspaceId, userId }}>
      <div>
        <PageHeader
          title={sheet.name}
          description={sheet.description ?? `Task sheet in ${project.name}`}
          action={
            <Link href={`/projects/${project.id}`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to {project.name}
              </Button>
            </Link>
          }
        />

        {/* Board columns */}
        <div className="px-8 py-6">
          <div className="flex gap-4 overflow-x-auto pb-4">
            {STATUS_COLUMNS.map((col) => {
              const columnTasks = tasksByStatus.get(col.key) ?? [];
              return (
                <div
                  key={col.key}
                  className="flex w-72 shrink-0 flex-col rounded-lg border border-border bg-white"
                >
                  {/* Column header */}
                  <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
                    <div
                      className={cn("h-2 w-2 rounded-full", col.color)}
                    />
                    <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
                      {col.label}
                    </span>
                    <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                      {columnTasks.length}
                    </span>
                  </div>

                  {/* Column tasks */}
                  <div className="flex-1 space-y-2 p-2">
                    {columnTasks.length === 0 ? (
                      <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                        No tasks
                      </p>
                    ) : (
                      columnTasks.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          queueName={
                            task.queueId
                              ? queueNames.get(task.queueId)
                              : undefined
                          }
                          onClick={() => setSelectedTaskId(task.id)}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Task detail drawer */}
        {selectedTask && (
          <TaskDetailDrawer
            task={{
              ...selectedTask,
              subtasks: [],
              comments: [],
              artifacts: [],
            }}
            queues={queues}
            onClose={() => setSelectedTaskId(null)}
            onUpdate={() => router.refresh()}
          />
        )}
      </div>
    </WorkspaceContext.Provider>
  );
}
