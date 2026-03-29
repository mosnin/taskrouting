"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/ui/empty-state";
import { WorkspaceContext } from "@/hooks/use-workspace";
import { createProject } from "@/actions/project";
import { FolderKanban, Plus, Search, Grid3X3, List, Calendar, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Project {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  createdAt: string | Date;
  updatedAt?: string | Date;
  _count?: { tasks?: number; taskSheets?: number };
}

function relativeTime(dateStr: string | Date): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const projectColors = [
  "from-violet-500 to-purple-600",
  "from-blue-500 to-indigo-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-pink-500 to-rose-600",
  "from-cyan-500 to-blue-600",
];

function ProjectCard({ project, index, view }: { project: Project; index: number; view: "grid" | "list" }) {
  const router = useRouter();
  const gradient = projectColors[index % projectColors.length];
  const sheetCount = project._count?.taskSheets ?? 0;
  const taskCount = project._count?.tasks ?? 0;
  const updatedAt = project.updatedAt ?? project.createdAt;

  if (view === "list") {
    return (
      <Card
        className="group cursor-pointer overflow-hidden hover:border-primary/20 transition-all duration-200 animate-fade-in"
        style={{ animationDelay: `${index * 30}ms` }}
        onClick={() => router.push(`/projects/${project.id}`)}
      >
        <div className="flex items-center gap-4 p-4">
          <div className={cn("rounded-lg bg-gradient-to-br p-2 shrink-0", gradient)}>
            <FolderKanban className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm group-hover:text-primary transition-colors truncate">{project.name}</h3>
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200 capitalize shrink-0">
                {project.status.toLowerCase()}
              </span>
            </div>
            {project.description && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">{project.description}</p>
            )}
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0">
            <span>{taskCount} task{taskCount !== 1 ? "s" : ""}</span>
            <span>{sheetCount} sheet{sheetCount !== 1 ? "s" : ""}</span>
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{relativeTime(updatedAt)}</span>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground/0 group-hover:text-muted-foreground transition-all group-hover:translate-x-0.5 shrink-0" />
        </div>
      </Card>
    );
  }

  return (
    <Card
      className="group cursor-pointer overflow-hidden hover:border-primary/20 transition-all duration-200 animate-fade-in hover:-translate-y-0.5 hover:shadow-md"
      style={{ animationDelay: `${index * 50}ms` }}
      onClick={() => router.push(`/projects/${project.id}`)}
    >
      {/* Color bar */}
      <div className={cn("h-1.5 bg-gradient-to-r", gradient)} />

      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={cn("rounded-lg bg-gradient-to-br p-2", gradient)}>
              <FolderKanban className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">{project.name}</h3>
              <p className="text-xs text-muted-foreground capitalize">{project.status.toLowerCase()}</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground/0 group-hover:text-muted-foreground transition-all group-hover:translate-x-0.5" />
        </div>

        {project.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{project.description}</p>
        )}

        <div className="flex items-center gap-3 pt-3 border-t text-xs text-muted-foreground">
          <span>{taskCount} task{taskCount !== 1 ? "s" : ""}</span>
          <span className="text-border">|</span>
          <span>{sheetCount} sheet{sheetCount !== 1 ? "s" : ""}</span>
          <span className="ml-auto flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {relativeTime(updatedAt)}
          </span>
        </div>
      </div>
    </Card>
  );
}

export function ProjectsPageClient({
  projects,
  workspaceId,
  userId,
}: {
  projects: Project[];
  workspaceId: string;
  userId: string;
}) {
  const [showCreate, setShowCreate] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const [search, setSearch] = React.useState("");
  const [view, setView] = React.useState<"grid" | "list">("grid");
  const router = useRouter();

  const filtered = projects.filter(
    (p) => !search || p.name.toLowerCase().includes(search.toLowerCase())
  );

  function handleCreate(formData: FormData) {
    formData.set("workspaceId", workspaceId);
    startTransition(async () => {
      try {
        await createProject(formData);
        setShowCreate(false);
        router.refresh();
      } catch (err) {
        console.error("Failed to create project:", err);
      }
    });
  }

  return (
    <WorkspaceContext.Provider value={{ workspaceId, userId }}>
      <div className="animate-fade-in">
        <PageHeader
          title="Projects"
          description="Organize work into projects and task sheets"
          action={
            <Button onClick={() => setShowCreate(true)} size="sm" className="gap-2">
              <Plus className="h-3.5 w-3.5" />
              New Project
            </Button>
          }
        />

        <div className="px-8 py-6 space-y-6">
          {/* Toolbar */}
          {projects.length > 0 && (
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search projects..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex items-center border rounded-lg p-0.5 bg-muted/30">
                <button
                  onClick={() => setView("grid")}
                  className={cn(
                    "rounded-md p-1.5 transition-colors",
                    view === "grid" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Grid3X3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setView("list")}
                  className={cn(
                    "rounded-md p-1.5 transition-colors",
                    view === "list" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Project Grid */}
          {filtered.length > 0 ? (
            <div className={cn(
              view === "grid"
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                : "flex flex-col gap-2"
            )}>
              {filtered.map((project, i) => (
                <ProjectCard key={project.id} project={project} index={i} view={view} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={FolderKanban}
              title={search ? "No projects found" : "No projects yet"}
              description={search ? "Try a different search term" : "Create your first project to start organizing work"}
              action={!search ? {
                label: "Create Project",
                onClick: () => setShowCreate(true),
              } : undefined}
            />
          )}
        </div>

        {/* Create dialog */}
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Project</DialogTitle>
            </DialogHeader>
            <form action={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="project-name">Name</Label>
                <Input id="project-name" name="name" placeholder="e.g., Backend API v2" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project-description">Description</Label>
                <Textarea id="project-description" name="description" placeholder="What is this project about?" rows={3} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Creating..." : "Create Project"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </WorkspaceContext.Provider>
  );
}
