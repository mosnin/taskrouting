"use client";

import * as React from "react";
import { Plus, Bot } from "lucide-react";
import { PageHeader } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AgentCard } from "@/components/agents/agent-card";
import { useWorkspace } from "@/hooks/use-workspace";
import { listAgents, createAgent } from "@/actions/agent";

export default function AgentsPage() {
  const { workspaceId } = useWorkspace();
  const [agents, setAgents] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  // Create form state
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [capabilities, setCapabilities] = React.useState("");
  const [allowedQueues, setAllowedQueues] = React.useState("");
  const [creating, setCreating] = React.useState(false);
  const [createError, setCreateError] = React.useState<string | null>(null);

  const fetchAgents = React.useCallback(async () => {
    try {
      setLoading(true);
      const result = await listAgents(workspaceId);
      setAgents(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load agents");
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  React.useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  async function handleCreate() {
    if (!name.trim()) {
      setCreateError("Name is required");
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const caps = capabilities
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);
      const queues = allowedQueues
        .split(",")
        .map((q) => q.trim())
        .filter(Boolean);
      await createAgent({
        name: name.trim(),
        description: description.trim() || undefined,
        capabilities: caps,
        allowedQueueIds: queues.length > 0 ? queues : undefined,
        workspaceId,
      });
      setDialogOpen(false);
      setName("");
      setDescription("");
      setCapabilities("");
      setAllowedQueues("");
      fetchAgents();
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : "Failed to create agent"
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Agents"
        description="Manage AI agents that process tasks from queues."
        action={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Register Agent
          </Button>
        }
      />

      <div className="px-8 py-6">
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={fetchAgents}
            >
              Retry
            </Button>
          </div>
        ) : agents.length === 0 ? (
          <EmptyState
            icon={Bot}
            title="No agents registered"
            description="Register your first agent to start processing tasks."
            action={{
              label: "Register Agent",
              onClick: () => setDialogOpen(true),
            }}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Register Agent</DialogTitle>
            <DialogDescription>
              Create a new agent to claim and process tasks from queues.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="agent-name">Name</Label>
              <Input
                id="agent-name"
                placeholder="e.g. code-review-bot"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="agent-desc">Description</Label>
              <Textarea
                id="agent-desc"
                placeholder="What does this agent do?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="agent-caps">Capabilities</Label>
              <Input
                id="agent-caps"
                placeholder="code-review, testing, deployment (comma-separated)"
                value={capabilities}
                onChange={(e) => setCapabilities(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated list of capabilities this agent can fulfill.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="agent-queues">
                Allowed Queue IDs{" "}
                <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="agent-queues"
                placeholder="Queue UUIDs, comma-separated"
                value={allowedQueues}
                onChange={(e) => setAllowedQueues(e.target.value)}
              />
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
              {creating ? "Creating..." : "Register"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
