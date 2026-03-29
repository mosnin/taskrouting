"use client";

import * as React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { updateTask } from "@/actions/task";
import { PageHeader } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { TaskDetailDrawer } from "@/components/tasks/task-detail-drawer";
import { WorkspaceContext } from "@/hooks/use-workspace";
import { cn } from "@/lib/utils";
import { ArrowLeft, GripVertical } from "lucide-react";

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

const COLUMNS = [
  { id: "BACKLOG", label: "Backlog", dotColor: "bg-zinc-400" },
  { id: "TODO", label: "To Do", dotColor: "bg-blue-500" },
  { id: "IN_PROGRESS", label: "In Progress", dotColor: "bg-amber-500" },
  { id: "IN_REVIEW", label: "In Review", dotColor: "bg-purple-500" },
  { id: "DONE", label: "Done", dotColor: "bg-emerald-500" },
];

const priorityColors: Record<string, string> = {
  URGENT: "text-red-600 bg-red-50 border-red-200",
  HIGH: "text-orange-600 bg-orange-50 border-orange-200",
  MEDIUM: "text-blue-600 bg-blue-50 border-blue-200",
  LOW: "text-zinc-600 bg-zinc-50 border-zinc-200",
};

function SortableTaskCard({
  task,
  queueName,
  onClick,
}: {
  task: Task;
  queueName?: string;
  onClick: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { type: "task", task } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group rounded-lg border bg-card p-3 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-all duration-150 cursor-grab active:cursor-grabbing",
        isDragging && "opacity-50 shadow-lg rotate-[2deg] scale-105"
      )}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        // Only open drawer if not dragging
        if (!isDragging) onClick();
      }}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="h-4 w-4 text-muted-foreground/40 mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-snug truncate">{task.title}</p>
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium",
                priorityColors[task.priority] || "text-zinc-600 bg-zinc-50 border-zinc-200"
              )}
            >
              {task.priority}
            </span>
            {task.ownerType === "AGENT" && (
              <span className="inline-flex items-center rounded-full bg-violet-50 border border-violet-200 px-1.5 py-0.5 text-[10px] font-medium text-violet-600">
                Agent
              </span>
            )}
            {queueName && (
              <span className="text-[10px] text-muted-foreground truncate">
                {queueName}
              </span>
            )}
          </div>
          {task.requiredCapabilities.length > 0 && (
            <div className="flex items-center gap-1 mt-1.5 flex-wrap">
              {task.requiredCapabilities.slice(0, 2).map((cap) => (
                <span
                  key={cap}
                  className="inline-flex items-center rounded-md bg-purple-50 px-1 py-0.5 text-[9px] font-medium text-purple-700 ring-1 ring-inset ring-purple-200"
                >
                  {cap}
                </span>
              ))}
              {task.requiredCapabilities.length > 2 && (
                <span className="text-[9px] text-muted-foreground">
                  +{task.requiredCapabilities.length - 2}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TaskCardOverlay({ task }: { task: Task }) {
  return (
    <div className="rounded-lg border bg-card p-3 shadow-xl rotate-[3deg] scale-105 opacity-90">
      <p className="text-sm font-medium">{task.title}</p>
      <div className="flex items-center gap-1.5 mt-2">
        <span
          className={cn(
            "inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium",
            priorityColors[task.priority] || "text-zinc-600 bg-zinc-50 border-zinc-200"
          )}
        >
          {task.priority}
        </span>
      </div>
    </div>
  );
}

export function SheetBoardClient({
  project,
  sheet,
  queues,
  workspaceId,
  userId,
}: SheetBoardClientProps) {
  const [tasks, setTasks] = React.useState<Task[]>(sheet.tasks);
  const [activeTask, setActiveTask] = React.useState<Task | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const router = useRouter();

  const queueNames = new Map(queues.map((q) => [q.id, q.name]));

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const tasksByColumn = React.useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const col of COLUMNS) {
      map[col.id] = tasks.filter((t) => t.status === col.id);
    }
    // Put tasks with unknown statuses into backlog
    for (const task of tasks) {
      if (!COLUMNS.find((c) => c.id === task.status)) {
        map["BACKLOG"].push(task);
      }
    }
    return map;
  }, [tasks]);

  function handleDragStart(event: DragStartEvent) {
    const task = tasks.find((t) => t.id === event.active.id);
    if (task) setActiveTask(task);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Check if dropped on a column or on a task within a column
    const targetColumn = COLUMNS.find((c) => c.id === overId);
    const targetTask = tasks.find((t) => t.id === overId);
    const newStatus = targetColumn?.id || targetTask?.status;

    if (!newStatus) return;

    const task = tasks.find((t) => t.id === activeId);
    if (!task || task.status === newStatus) return;

    const previousStatus = task.status;

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === activeId ? { ...t, status: newStatus } : t))
    );

    // Persist via the server action (takes an object, not FormData)
    try {
      await updateTask({
        taskId: activeId,
        workspaceId,
        status: newStatus as any,
      });
    } catch {
      // Revert on failure
      setTasks((prev) =>
        prev.map((t) =>
          t.id === activeId ? { ...t, status: previousStatus } : t
        )
      );
    }
  }

  const selectedTask = selectedTaskId
    ? tasks.find((t) => t.id === selectedTaskId)
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

        <div className="px-8 py-6">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-4 overflow-x-auto pb-4 min-h-[calc(100vh-12rem)]">
              {COLUMNS.map((col) => {
                const columnTasks = tasksByColumn[col.id] || [];
                return (
                  <div
                    key={col.id}
                    id={col.id}
                    className="flex flex-col w-72 shrink-0"
                  >
                    {/* Column header */}
                    <div className="flex items-center gap-2 px-2 py-2 mb-2 sticky top-0 z-10">
                      <div className={cn("h-2.5 w-2.5 rounded-full", col.dotColor)} />
                      <span className="text-sm font-medium">{col.label}</span>
                      <span className="ml-auto text-xs text-muted-foreground tabular-nums bg-muted rounded-full px-2 py-0.5">
                        {columnTasks.length}
                      </span>
                    </div>

                    {/* Drop zone */}
                    <SortableContext
                      id={col.id}
                      items={columnTasks.map((t) => t.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="flex-1 space-y-2 p-1 rounded-xl bg-muted/30 min-h-[120px]">
                        {columnTasks.map((task) => (
                          <SortableTaskCard
                            key={task.id}
                            task={task}
                            queueName={
                              task.queueId
                                ? queueNames.get(task.queueId)
                                : undefined
                            }
                            onClick={() => setSelectedTaskId(task.id)}
                          />
                        ))}
                        {columnTasks.length === 0 && (
                          <div className="flex items-center justify-center h-24 text-xs text-muted-foreground border border-dashed rounded-lg">
                            Drop tasks here
                          </div>
                        )}
                      </div>
                    </SortableContext>
                  </div>
                );
              })}
            </div>

            <DragOverlay>
              {activeTask ? <TaskCardOverlay task={activeTask} /> : null}
            </DragOverlay>
          </DndContext>
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
