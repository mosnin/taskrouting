"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Loader2, FileSpreadsheet } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TaskCard } from "@/components/tasks/task-card";
import { TaskCreateForm } from "@/components/tasks/task-create-form";
import { TaskDetailDrawer } from "@/components/tasks/task-detail-drawer";
import { WorkspaceContext } from "@/hooks/use-workspace";
import { createTaskSheet } from "@/actions/task-sheet";
import { cn } from "@/lib/utils";

interface TaskSheet {
  id: string;
  name: string;
  description?: string | null;
}

interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  ownerType: string;
  ownerId?: string | null;
  queueId?: string | null;
  taskSheetId?: string | null;
  dueAt?: Date | null;
  approvalState: string;
  requiredCapabilities: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface Queue {
  id: string;
  name: string;
  description?: string | null;
  requiredCapabilities: string[];
  taskCount: number;
}

interface Project {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  workspaceId: string;
  taskSheets: TaskSheet[];
}

interface ProjectDetailClientProps {
  project: Project;
  tasks: Task[];
  queues: Queue[];
  workspaceId: string;
  userId: string;
}

export function ProjectDetailClient({
  project,
  tasks,
  queues,
  workspaceId,
  userId,
}: ProjectDetailClientProps) {
  const router = useRouter();
  const [activeSheetId, setActiveSheetId] = useState<string | null>(null);
  const [sheetDialogOpen, setSheetDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Filter tasks by selected sheet
  const filteredTasks = activeSheetId
    ? tasks.filter((t) => t.taskSheetId === activeSheetId)
    : tasks;

  // Build a queue name lookup
  const queueNames = new Map(queues.map((q) => [q.id, q.name]));

  // Selected task detail (simplified: we use the list data since full getTask would need server call)
  const selectedTask = selectedTaskId
    ? tasks.find((t) => t.id === selectedTaskId)
    : null;

  function handleCreateSheet(formData: FormData) {
    formData.set("workspaceId", workspaceId);
    formData.set("projectId", project.id);
    startTransition(async () => {
      try {
        await createTaskSheet(formData);
        setSheetDialogOpen(false);
        router.refresh();
      } catch (err) {
        console.error("Failed to create task sheet:", err);
      }
    });
  }

  return (
    <WorkspaceContext.Provider value={{ workspaceId, userId }}>
      <div>
        <PageHeader
          title={project.name}
          description={project.description ?? undefined}
          action={
            <div className="flex items-center gap-2">
              <Link href="/projects">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back
                </Button>
              </Link>
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
                {project.status}
              </span>
            </div>
          }
        />

        <div className="px-8 py-6">
          {/* Tabs: Task Sheets */}
          <div className="flex items-center gap-1 border-b border-border pb-0">
            <button
              type="button"
              onClick={() => setActiveSheetId(null)}
              className={cn(
                "relative px-3 py-2 text-sm font-medium transition-colors",
                !activeSheetId
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              All Tasks
              {!activeSheetId && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground rounded-full" />
              )}
            </button>

            {project.taskSheets.map((sheet) => (
              <button
                key={sheet.id}
                type="button"
                onClick={() => setActiveSheetId(sheet.id)}
                className={cn(
                  "relative px-3 py-2 text-sm font-medium transition-colors",
                  activeSheetId === sheet.id
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {sheet.name}
                {activeSheetId === sheet.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground rounded-full" />
                )}
              </button>
            ))}

            {/* Add Task Sheet */}
            <Dialog open={sheetDialogOpen} onOpenChange={setSheetDialogOpen}>
              <DialogTrigger asChild>
                <button
                  type="button"
                  className="ml-1 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Task Sheet</DialogTitle>
                  <DialogDescription>
                    Create a new sheet to organize tasks within this project.
                  </DialogDescription>
                </DialogHeader>
                <form action={handleCreateSheet} className="space-y-4">
                  <div>
                    <label
                      htmlFor="sheet-name"
                      className="block text-sm font-medium text-foreground"
                    >
                      Name
                    </label>
                    <input
                      id="sheet-name"
                      name="name"
                      type="text"
                      required
                      className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                      placeholder="Sheet name"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="sheet-description"
                      className="block text-sm font-medium text-foreground"
                    >
                      Description
                    </label>
                    <textarea
                      id="sheet-description"
                      name="description"
                      rows={2}
                      className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                      placeholder="Optional description..."
                    />
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setSheetDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isPending}>
                      {isPending && (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      )}
                      Create Sheet
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            {/* View full sheet */}
            {activeSheetId && (
              <Link
                href={`/projects/${project.id}/sheets/${activeSheetId}`}
                className="ml-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <FileSpreadsheet className="inline h-3.5 w-3.5 mr-0.5" />
                Board view
              </Link>
            )}
          </div>

          {/* Action bar */}
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {filteredTasks.length} task{filteredTasks.length !== 1 ? "s" : ""}
            </p>
            <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-3.5 w-3.5" />
                  Add Task
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Task</DialogTitle>
                  <DialogDescription>
                    Add a new task to this project.
                  </DialogDescription>
                </DialogHeader>
                <TaskCreateForm
                  projectId={project.id}
                  taskSheetId={activeSheetId ?? undefined}
                  queues={queues}
                  onSuccess={() => {
                    setTaskDialogOpen(false);
                    router.refresh();
                  }}
                  onCancel={() => setTaskDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>

          {/* Task list */}
          <div className="mt-4">
            {filteredTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-white py-12">
                <p className="text-sm text-muted-foreground">
                  No tasks yet. Create one to get started.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    queueName={
                      task.queueId ? queueNames.get(task.queueId) : undefined
                    }
                    onClick={() => setSelectedTaskId(task.id)}
                  />
                ))}
              </div>
            )}
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
