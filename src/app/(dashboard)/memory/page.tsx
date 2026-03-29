"use client";

import * as React from "react";
import { Plus, Brain, Search } from "lucide-react";
import { PageHeader } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
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
  const [creating, setCreating] = React.useState(false);
  const [createError, setCreateError] = React.useState<string | null>(null);

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
    fetchNodes();
  }, [fetchNodes]);

  async function handleSearch() {
    if (!searchQuery.trim()) {
      fetchNodes();
      return;
    }
    try {
      setLoading(true);
      const result = await searchMemory(workspaceId, searchQuery.trim());
      setNodes(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }

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
      fetchNodes();
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : "Failed to create note"
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Shared Memory"
        description="Knowledge base shared across agents and team members."
        action={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            New Note
          </Button>
        }
      />

      <div className="px-8 py-6">
        {/* Filters */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search memory nodes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-9"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {MEMORY_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-52 rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center">
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
          <EmptyState
            icon={Brain}
            title="No memory nodes"
            description={
              searchQuery
                ? "No results found. Try a different search."
                : "Create your first shared memory note."
            }
            action={
              !searchQuery
                ? {
                    label: "New Note",
                    onClick: () => setDialogOpen(true),
                  }
                : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {nodes.map((node) => (
              <MemoryNodeCard key={node.id} node={node} />
            ))}
          </div>
        )}
      </div>

      {/* Create dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
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
              <Label htmlFor="mem-type">Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MEMORY_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mem-content">Content</Label>
              <Textarea
                id="mem-content"
                placeholder="Write the content of this memory node..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
              />
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
              <p className="text-sm text-destructive">{createError}</p>
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
              {creating ? "Creating..." : "Create Note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
