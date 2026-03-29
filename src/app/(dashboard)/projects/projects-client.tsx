"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FolderKanban, Plus, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createProject } from "@/actions/project";
import { WorkspaceContext } from "@/hooks/use-workspace";

interface Project {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  createdAt: Date;
  _count?: { tasks: number };
}

interface ProjectsPageClientProps {
  projects: Project[];
  workspaceId: string;
  userId: string;
}

export function ProjectsPageClient({
  projects,
  workspaceId,
  userId,
}: ProjectsPageClientProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleCreate(formData: FormData) {
    formData.set("workspaceId", workspaceId);
    startTransition(async () => {
      try {
        await createProject(formData);
        setDialogOpen(false);
        router.refresh();
      } catch (err) {
        console.error("Failed to create project:", err);
      }
    });
  }

  return (
    <WorkspaceContext.Provider value={{ workspaceId, userId }}>
      <div>
        <PageHeader
          title="Projects"
          description="Organize tasks into projects and task sheets."
          action={
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-3.5 w-3.5" />
                  New Project
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Project</DialogTitle>
                  <DialogDescription>
                    Add a new project to your workspace.
                  </DialogDescription>
                </DialogHeader>
                <form action={handleCreate} className="space-y-4">
                  <div>
                    <label
                      htmlFor="project-name"
                      className="block text-sm font-medium text-foreground"
                    >
                      Name
                    </label>
                    <input
                      id="project-name"
                      name="name"
                      type="text"
                      required
                      className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                      placeholder="Project name"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="project-description"
                      className="block text-sm font-medium text-foreground"
                    >
                      Description
                    </label>
                    <textarea
                      id="project-description"
                      name="description"
                      rows={3}
                      className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                      placeholder="Describe the project..."
                    />
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isPending}>
                      {isPending && (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      )}
                      Create
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          }
        />

        <div className="px-8 py-6">
          {projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-white py-16">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100">
                <FolderKanban className="h-6 w-6 text-zinc-400" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-foreground">
                No projects yet
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Create your first project to start organizing tasks.
              </p>
              <Button
                size="sm"
                className="mt-4"
                onClick={() => setDialogOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                New Project
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <Card
                  key={project.id}
                  className="cursor-pointer shadow-sm transition-colors hover:border-zinc-300 hover:bg-zinc-50/50"
                  onClick={() => router.push(`/projects/${project.id}`)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">{project.name}</CardTitle>
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
                        {project.status}
                      </span>
                    </div>
                    {project.description && (
                      <CardDescription className="line-clamp-2">
                        {project.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>
                        {project._count?.tasks ?? 0} tasks
                      </span>
                      <span>
                        Created{" "}
                        {new Date(project.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </WorkspaceContext.Provider>
  );
}
