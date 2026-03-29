"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Key,
  ClipboardList,
  Activity,
  Bot,
  Trash2,
  AlertTriangle,
  Clock,
  Zap,
  Shield,
} from "lucide-react";
import { PageHeader } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { TokenList } from "@/components/agents/token-list";
import { TokenCreateDialog } from "@/components/agents/token-create-dialog";
import { RunLogEntry } from "@/components/audit/run-log-entry";
import { useWorkspace } from "@/hooks/use-workspace";
import { getAgent, deleteAgent } from "@/actions/agent";
import { listRunLogs } from "@/actions/audit";
import { relativeTime, absoluteTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const statusConfig: Record<
  string,
  { color: string; textColor: string; label: string; dot: string; bg: string }
> = {
  ONLINE: { color: "bg-emerald-500", textColor: "text-emerald-700", label: "Online", dot: "bg-emerald-500", bg: "bg-emerald-50" },
  OFFLINE: { color: "bg-zinc-400", textColor: "text-zinc-500", label: "Offline", dot: "bg-zinc-400", bg: "bg-zinc-50" },
  BUSY: { color: "bg-amber-500", textColor: "text-amber-700", label: "Busy", dot: "bg-amber-500", bg: "bg-amber-50" },
  ERROR: { color: "bg-red-500", textColor: "text-red-700", label: "Error", dot: "bg-red-500", bg: "bg-red-50" },
};

export default function AgentDetailPage() {
  const params = useParams<{ agentId: string }>();
  const router = useRouter();
  const { workspaceId } = useWorkspace();
  const [agent, setAgent] = React.useState<any>(null);
  const [runLogs, setRunLogs] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [tokenDialogOpen, setTokenDialogOpen] = React.useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const fetchAgent = React.useCallback(async () => {
    try {
      setLoading(true);
      const [agentData, logsData] = await Promise.all([
        getAgent(params.agentId, workspaceId),
        listRunLogs(workspaceId, {
          entityType: "agent",
          entityId: params.agentId,
          limit: 20,
        }),
      ]);
      setAgent(agentData);
      setRunLogs(logsData.items ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load agent");
    } finally {
      setLoading(false);
    }
  }, [params.agentId, workspaceId]);

  React.useEffect(() => {
    fetchAgent();
  }, [fetchAgent]);

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteAgent(params.agentId, workspaceId);
      router.push("/agents");
    } catch {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  if (loading) {
    return (
      <div>
        <div className="border-b border-border bg-background px-8 py-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="mt-2 h-4 w-96" />
        </div>
        <div className="px-8 py-6">
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div>
        <PageHeader title="Agent" />
        <div className="px-8 py-6">
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center">
            <p className="text-sm text-destructive">
              {error ?? "Agent not found"}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => router.push("/agents")}
            >
              Back to Agents
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const status = statusConfig[agent.status] ?? statusConfig.OFFLINE;
  const claimCount = agent.claims?.length ?? 0;
  const tokenCount = agent.tokens?.length ?? 0;

  return (
    <div className="animate-fade-in">
      {/* Gradient Header */}
      <div className="relative overflow-hidden border-b border-border bg-gradient-to-r from-violet-500/5 via-indigo-500/5 to-purple-500/5">
        <div className="px-8 py-8">
          <div className="flex items-center gap-2 mb-4">
            <Button variant="ghost" size="sm" onClick={() => router.push("/agents")} className="gap-1.5 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              Back to Agents
            </Button>
          </div>

          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {/* Agent avatar with status indicator */}
              <div className="relative">
                <div className="rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 p-4 shadow-lg shadow-violet-500/20">
                  <Bot className="h-8 w-8 text-white" />
                </div>
                <div className={cn(
                  "absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-[3px] border-white",
                  status.dot,
                  agent.status === "ONLINE" && "animate-pulse"
                )} />
              </div>

              <div>
                <h1 className="text-2xl font-semibold tracking-tight">{agent.name}</h1>
                {agent.description && (
                  <p className="mt-1 text-sm text-muted-foreground max-w-lg">{agent.description}</p>
                )}
                <div className="mt-2 flex items-center gap-3">
                  <div className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium", status.bg, status.textColor)}>
                    <div className={cn("h-1.5 w-1.5 rounded-full", status.dot)} />
                    {status.label}
                  </div>
                  {agent.lastSeenAt && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Last seen {relativeTime(agent.lastSeenAt)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick stats */}
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-2xl font-semibold">{claimCount}</div>
                <div className="text-xs text-muted-foreground">Active Claims</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold">{tokenCount}</div>
                <div className="text-xs text-muted-foreground">Tokens</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold">{agent.capabilities.length}</div>
                <div className="text-xs text-muted-foreground">Capabilities</div>
              </div>
            </div>
          </div>

          {/* Capabilities */}
          {agent.capabilities.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {agent.capabilities.map((cap: string) => (
                <span
                  key={cap}
                  className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-200"
                >
                  <Zap className="h-3 w-3" />
                  {cap}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="px-8 py-6">
        {/* Tabs */}
        <Tabs defaultValue="tokens">
          <TabsList className="mb-6 bg-muted/50 p-1">
            <TabsTrigger value="tokens" className="gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Key className="h-3.5 w-3.5" />
              Tokens
              {tokenCount > 0 && (
                <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">{tokenCount}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="claims" className="gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <ClipboardList className="h-3.5 w-3.5" />
              Claims
              {claimCount > 0 && (
                <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">{claimCount}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="activity" className="gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Activity className="h-3.5 w-3.5" />
              Activity
              {runLogs.length > 0 && (
                <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">{runLogs.length}</span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tokens">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">API Tokens</h3>
                <p className="text-xs text-muted-foreground">Manage authentication tokens for this agent</p>
              </div>
              <Button size="sm" onClick={() => setTokenDialogOpen(true)} className="gap-1.5">
                <Plus className="h-4 w-4" />
                Create Token
              </Button>
            </div>
            <TokenList
              tokens={agent.tokens ?? []}
              workspaceId={workspaceId}
            />
          </TabsContent>

          <TabsContent value="claims">
            <div className="mb-4">
              <h3 className="text-sm font-semibold">Claim Timeline</h3>
              <p className="text-xs text-muted-foreground">Tasks currently claimed by this agent</p>
            </div>
            {agent.claims && agent.claims.length > 0 ? (
              <div className="space-y-3">
                {agent.claims.map((claim: any, index: number) => (
                  <div
                    key={claim.id}
                    className="group relative flex items-start gap-4 rounded-xl border bg-card p-4 transition-all hover:shadow-sm"
                  >
                    {/* Timeline connector */}
                    {index < agent.claims.length - 1 && (
                      <div className="absolute left-[1.65rem] top-12 h-[calc(100%+0.25rem)] w-px bg-border" />
                    )}
                    {/* Timeline dot */}
                    <div className={cn(
                      "relative z-10 mt-0.5 h-3 w-3 shrink-0 rounded-full border-2 border-white shadow-sm",
                      claim.status === "ACTIVE" ? "bg-violet-500" : claim.status === "COMPLETED" ? "bg-emerald-500" : "bg-zinc-400"
                    )} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium truncate">
                            {claim.task?.title ?? `Task ${claim.taskId.slice(0, 8)}`}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Queue: {claim.queue?.name ?? claim.queueId.slice(0, 8)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge
                            variant={
                              claim.status === "ACTIVE"
                                ? "default"
                                : claim.status === "COMPLETED"
                                  ? "secondary"
                                  : "outline"
                            }
                            className="text-[10px]"
                          >
                            {claim.status}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {relativeTime(claim.claimedAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-12 text-center rounded-xl border border-dashed">
                <div className="rounded-full bg-muted p-3">
                  <ClipboardList className="h-6 w-6 text-muted-foreground/50" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">No claims yet</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">This agent hasn&apos;t claimed any tasks</p>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="activity">
            <div className="mb-4">
              <h3 className="text-sm font-semibold">Recent Activity</h3>
              <p className="text-xs text-muted-foreground">Audit log of actions performed by this agent</p>
            </div>
            {runLogs.length > 0 ? (
              <div className="rounded-xl border overflow-hidden">
                {runLogs.map((entry) => (
                  <RunLogEntry key={entry.id} entry={entry} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-12 text-center rounded-xl border border-dashed">
                <div className="rounded-full bg-muted p-3">
                  <Activity className="h-6 w-6 text-muted-foreground/50" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">No activity recorded</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Activity will appear here as the agent processes tasks</p>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Danger Zone */}
        <div className="mt-12 rounded-xl border border-red-200 bg-red-50/50 p-6">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-red-100 p-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-red-900">Danger Zone</h3>
              <p className="mt-1 text-xs text-red-700/80">
                Deleting this agent will revoke all tokens and release any active claims. This action cannot be undone.
              </p>
              {!showDeleteConfirm ? (
                <Button
                  variant="destructive"
                  size="sm"
                  className="mt-3 gap-1.5"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete Agent
                </Button>
              ) : (
                <div className="mt-3 flex items-center gap-2">
                  <p className="text-xs text-red-700 font-medium">Are you sure? This cannot be undone.</p>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    {deleting ? "Deleting..." : "Yes, Delete"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deleting}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <TokenCreateDialog
        open={tokenDialogOpen}
        onOpenChange={(open) => {
          setTokenDialogOpen(open);
          if (!open) fetchAgent();
        }}
        agentId={params.agentId}
        workspaceId={workspaceId}
      />
    </div>
  );
}
