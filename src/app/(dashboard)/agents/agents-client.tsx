"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/ui/empty-state";
import { AgentCard } from "@/components/agents/agent-card";
import { WorkspaceContext } from "@/hooks/use-workspace";
import { createAgent } from "@/actions/agent";
import { Bot, Plus, Search } from "lucide-react";

interface Agent {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  capabilities: string[];
  lastSeenAt?: string | null;
  _count?: { claims?: number; tokens?: number };
}

export function AgentsPageClient({
  agents,
  workspaceId,
  userId,
}: {
  agents: Agent[];
  workspaceId: string;
  userId: string;
}) {
  const [showCreate, setShowCreate] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const router = useRouter();

  const filtered = agents.filter((a) => {
    const matchesSearch = !searchQuery || a.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusCounts: Record<string, number> = {
    all: agents.length,
    ONLINE: agents.filter((a) => a.status === "ONLINE").length,
    BUSY: agents.filter((a) => a.status === "BUSY").length,
    OFFLINE: agents.filter((a) => a.status === "OFFLINE").length,
    ERROR: agents.filter((a) => a.status === "ERROR").length,
  };

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const caps = formData.get("capabilities") as string;
    startTransition(async () => {
      await createAgent({
        workspaceId,
        name: formData.get("name") as string,
        description: (formData.get("description") as string) || undefined,
        capabilities: caps.split(",").map((c) => c.trim()).filter(Boolean),
      });
      setShowCreate(false);
      router.refresh();
    });
  }

  return (
    <WorkspaceContext.Provider value={{ workspaceId, userId }}>
      <div className="space-y-6 p-6 animate-fade-in">
        <PageHeader
          title="Agents"
          description="Manage AI agents connected to your workspace"
          action={
            <Button onClick={() => setShowCreate(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Register Agent
            </Button>
          }
        />

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search agents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-1 rounded-lg border p-1">
            {(["all", "ONLINE", "BUSY", "OFFLINE", "ERROR"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  statusFilter === status
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {status === "all" ? "All" : status.charAt(0) + status.slice(1).toLowerCase()}
                {" "}
                <span className="opacity-60">{statusCounts[status]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Bot}
            title={searchQuery ? "No agents found" : "No agents yet"}
            description={searchQuery ? "Try a different search" : "Register your first AI agent to start routing tasks"}
          />
        )}

        {/* Create dialog */}
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Register Agent</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input name="name" placeholder="e.g., Code Review Bot" required />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea name="description" placeholder="What does this agent do?" rows={3} />
              </div>
              <div className="space-y-2">
                <Label>Capabilities</Label>
                <Input name="capabilities" placeholder="code_review, testing, deployment" required />
                <p className="text-xs text-muted-foreground">Comma-separated list of capabilities</p>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Registering..." : "Register Agent"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </WorkspaceContext.Provider>
  );
}
