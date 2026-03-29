"use client";

import * as React from "react";
import { Plus, Brain, Search, Loader2, FileText, ClipboardList, Lightbulb, Code, BookOpen, FlaskConical, Newspaper, Link2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MemoryNodeCard } from "@/components/memory/memory-node-card";
import { useWorkspace } from "@/hooks/use-workspace";
import { listMemoryNodes, searchMemory, createMemoryNode } from "@/actions/memory";

const MEMORY_TYPES = [
  "DOCUMENT",
  "CHECKLIST",
  "DECISION",
  "SPEC",
  "RUNBOOK",
  "RESEARCH",
  "MEETING_NOTES",
  "REFERENCE",
] as const;

const typeChipConfig: Record<string, { icon: React.ElementType; color: string; bg: string; activeBg: string; ring: string }> = {
  DOCUMENT: { icon: FileText, color: "text-blue-600", bg: "bg-blue-50", activeBg: "bg-blue-100", ring: "ring-blue-300" },
  CHECKLIST: { icon: ClipboardList, color: "text-emerald-600", bg: "bg-emerald-50", activeBg: "bg-emerald-100", ring: "ring-emerald-300" },
  DECISION: { icon: Lightbulb, color: "text-amber-600", bg: "bg-amber-50", activeBg: "bg-amber-100", ring: "ring-amber-300" },
  SPEC: { icon: Code, color: "text-violet-600", bg: "bg-violet-50", activeBg: "bg-violet-100", ring: "ring-violet-300" },
  RUNBOOK: { icon: BookOpen, color: "text-orange-600", bg: "bg-orange-50", activeBg: "bg-orange-100", ring: "ring-orange-300" },
  RESEARCH: { icon: FlaskConical, color: "text-cyan-600", bg: "bg-cyan-50", activeBg: "bg-cyan-100", ring: "ring-cyan-300" },
  MEETING_NOTES: { icon: Newspaper, color: "text-pink-600", bg: "bg-pink-50", activeBg: "bg-pink-100", ring: "ring-pink-300" },
  REFERENCE: { icon: Link2, color: "text-purple-600", bg: "bg-purple-50", activeBg: "bg-purple-100", ring: "ring-purple-300" },
};

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState(value);
  React.useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function MemoryPage() {
  const { workspaceId } = useWorkspace();
  const [nodes, setNodes] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [typeFilter, setTypeFilter] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [dialogOpen, setDialogOpen] = React.useState(false);

  // Create form state
  const [title, setTitle] = React.useState("");
  const [type, setType] = React.useState<string>("DOCUMENT");
  const [content, setContent] = React.useState("");
  const [projectId, setProjectId] = React.useState("");
  const [taskId, setTaskId] = React.useState("");
  const [tagsInput, setTagsInput] = React.useState("");
  const [creating, setCreating] = React.useState(false);
  const [createError, setCreateError] = React.useState<string | null>(null);

  const debouncedSearch = useDebounce(searchQuery, 300);

  const fetchNodes = React.useCallback(async () => {
    try {
      setLoading(true);
      const filters: { type?: string } = {};
      if (typeFilter !== "all") {
        filters.type = typeFilter;
      }
      const result = await listMemoryNodes(workspaceId, filters);
      setNodes(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load memory");
    } finally {
      setLoading(false);
    }
  }, [workspaceId, typeFilter]);

  React.useEffect(() => {
    if (!debouncedSearch.trim()) {
      fetchNodes();
      return;
    }
    let cancelled = false;
    async function doSearch() {
      try {
        setLoading(true);
        const result = await searchMemory(workspaceId, debouncedSearch.trim());
        if (!cancelled) {
          // Apply type filter client-side when searching
          const filtered = typeFilter !== "all"
            ? result.filter((n: any) => n.type === typeFilter)
            : result;
          setNodes(filtered);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Search failed");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    doSearch();
    return () => { cancelled = true; };
  }, [debouncedSearch, workspaceId, typeFilter, fetchNodes]);

  async function handleCreate() {
    if (!title.trim()) {
      setCreateError("Title is required");
      return;
    }
    if (!content.trim()) {
      setCreateError("Content is required");
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      await createMemoryNode({
        title: title.trim(),
        type: type as any,
        content: content.trim(),
        projectId: projectId.trim() || undefined,
        taskId: taskId.trim() || undefined,
        workspaceId,
      });
      setDialogOpen(false);
      setTitle("");
      setType("DOCUMENT");
      setContent("");
      setProjectId("");
      setTaskId("");
      setTagsInput("");
      fetchNodes();
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : "Failed to create note"
      );
    } finally {
      setCreating(false);
    }
  }

  function toggleTypeFilter(t: string) {
    setTypeFilter((prev) => (prev === t ? "all" : t));
  }

  return (
    <div>
      <PageHeader
        title="Shared Memory"
        description="Knowledge base shared across agents and team members."
        action={
          <Button onClick={() => setDialogOpen(true)} size="sm">
            <Plus className="h-3.5 w-3.5" />
            New Note
          </Button>
        }
      />

      <div className="px-8 py-6">
        {/* Search bar */}
        <div className="mb-4 animate-fade-in">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search memory nodes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Type filter chips */}
        <div className="mb-6 flex flex-wrap gap-2 animate-fade-in" style={{ animationDelay: "50ms", animationFillMode: "both" }}>
          <button
            onClick={() => setTypeFilter("all")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-inset transition-all duration-150",
              typeFilter === "all"
                ? "bg-foreground text-background ring-foreground shadow-sm"
                : "bg-muted/50 text-muted-foreground ring-border hover:bg-muted"
            )}
          >
            All types
          </button>
          {MEMORY_TYPES.map((t) => {
            const config = typeChipConfig[t];
            const Icon = config.icon;
            const isActive = typeFilter === t;
            return (
              <button
                key={t}
                onClick={() => toggleTypeFilter(t)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-inset transition-all duration-150",
                  isActive
                    ? cn(config.activeBg, config.color, config.ring, "shadow-sm")
                    : "bg-muted/50 text-muted-foreground ring-border hover:bg-muted"
                )}
              >
                <Icon className={cn("h-3 w-3", isActive ? config.color : "text-muted-foreground")} />
                {t.replace(/_/g, " ")}
              </button>
            );
          })}
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-8 text-center animate-fade-in">
            <p className="text-sm text-destructive">{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={fetchNodes}
            >
              Retry
            </Button>
          </div>
        ) : nodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-20 animate-fade-in">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100">
              <Brain className="h-7 w-7 text-purple-500" />
            </div>
            <h3 className="mt-5 text-base font-semibold text-foreground">
              {searchQuery || typeFilter !== "all" ? "No matching notes" : "No memory nodes yet"}
            </h3>
            <p className="mt-1.5 max-w-sm text-center text-sm text-muted-foreground">
              {searchQuery
                ? "Try adjusting your search or filter."
                : "Create your first shared memory note to build your team's knowledge base."}
            </p>
            {searchQuery || typeFilter !== "all" ? (
              <Button
                variant="outline"
                size="sm"
                className="mt-5"
                onClick={() => {
                  setSearchQuery("");
                  setTypeFilter("all");
                }}
              >
                Clear filters
              </Button>
            ) : (
              <Button
                size="sm"
                className="mt-5"
                onClick={() => setDialogOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                Create your first note
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {nodes.map((node, index) => (
              <div
                key={node.id}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 40}ms`, animationFillMode: "both" }}
              >
                <MemoryNodeCard node={node} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New Memory Note</DialogTitle>
            <DialogDescription>
              Add a shared knowledge node to the workspace memory.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mem-title">Title</Label>
              <Input
                id="mem-title"
                placeholder="e.g. Deployment Runbook"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <div className="flex flex-wrap gap-2">
                {MEMORY_TYPES.map((t) => {
                  const config = typeChipConfig[t];
                  const Icon = config.icon;
                  const isActive = type === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium ring-1 ring-inset transition-all duration-150",
                        isActive
                          ? cn(config.activeBg, config.color, config.ring, "shadow-sm")
                          : "bg-muted/50 text-muted-foreground ring-border hover:bg-muted"
                      )}
                    >
                      <Icon className={cn("h-3 w-3", isActive ? config.color : "text-muted-foreground")} />
                      {t.replace(/_/g, " ")}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mem-content">Content</Label>
              <Textarea
                id="mem-content"
                placeholder="Write the content of this memory node..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
                className="resize-none"
              />
              <p className="text-[11px] text-muted-foreground">
                {content.length.toLocaleString()} / 100,000 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mem-tags">Tags</Label>
              <Input
                id="mem-tags"
                placeholder="Comma-separated tags, e.g. deploy, ci, infra"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
              />
              {tagsInput && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {tagsInput.split(",").filter(t => t.trim()).map((tag, i) => (
                    <span
                      key={i}
                      className="text-[10px] text-muted-foreground bg-muted rounded-full px-2 py-0.5"
                    >
                      #{tag.trim()}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="mem-project">
                  Project ID <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="mem-project"
                  placeholder="UUID"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mem-task">
                  Task ID <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="mem-task"
                  placeholder="UUID"
                  value={taskId}
                  onChange={(e) => setTaskId(e.target.value)}
                />
              </div>
            </div>

            {createError && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2">
                <p className="text-sm text-destructive">{createError}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {creating ? "Creating..." : "Create Note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
