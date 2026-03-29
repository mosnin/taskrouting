"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Key,
  ClipboardList,
  Activity,
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
import { getAgent } from "@/actions/agent";
import { listRunLogs } from "@/actions/audit";
import { relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const statusConfig: Record<
  string,
  { color: string; textColor: string; label: string }
> = {
  ONLINE: { color: "bg-emerald-500", textColor: "text-emerald-700", label: "Online" },
  OFFLINE: { color: "bg-zinc-400", textColor: "text-zinc-500", label: "Offline" },
  BUSY: { color: "bg-amber-500", textColor: "text-amber-700", label: "Busy" },
  ERROR: { color: "bg-red-500", textColor: "text-red-700", label: "Error" },
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

  return (
    <div>
      <PageHeader
        title={agent.name}
        description={agent.description ?? undefined}
        action={
          <Button variant="ghost" size="sm" onClick={() => router.push("/agents")}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        }
      />

      <div className="px-8 py-6">
        {/* Agent meta */}
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={cn("h-2.5 w-2.5 rounded-full", status.color)} />
            <span className={cn("text-sm font-medium", status.textColor)}>
              {status.label}
            </span>
          </div>
          {agent.lastSeenAt && (
            <span className="text-sm text-muted-foreground">
              Last seen {relativeTime(agent.lastSeenAt)}
            </span>
          )}
        </div>

        {/* Capabilities */}
        {agent.capabilities.length > 0 && (
          <div className="mb-6">
            <h3 className="mb-2 text-sm font-medium text-muted-foreground">
              Capabilities
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {agent.capabilities.map((cap: string) => (
                <Badge key={cap} variant="secondary">
                  {cap}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="tokens">
          <TabsList>
            <TabsTrigger value="tokens" className="gap-1.5">
              <Key className="h-3.5 w-3.5" />
              Tokens
            </TabsTrigger>
            <TabsTrigger value="claims" className="gap-1.5">
              <ClipboardList className="h-3.5 w-3.5" />
              Claims
            </TabsTrigger>
            <TabsTrigger value="activity" className="gap-1.5">
              <Activity className="h-3.5 w-3.5" />
              Activity
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tokens" className="mt-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-medium">API Tokens</h3>
              <Button size="sm" onClick={() => setTokenDialogOpen(true)}>
                <Plus className="h-4 w-4" />
                Create Token
              </Button>
            </div>
            <TokenList
              tokens={agent.tokens ?? []}
              workspaceId={workspaceId}
            />
          </TabsContent>

          <TabsContent value="claims" className="mt-4">
            <h3 className="mb-4 text-sm font-medium">Claims</h3>
            {agent.claims && agent.claims.length > 0 ? (
              <div className="divide-y divide-border rounded-lg border">
                {agent.claims.map((claim: any) => (
                  <div
                    key={claim.id}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {claim.task?.title ?? `Task ${claim.taskId.slice(0, 8)}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Queue: {claim.queue?.name ?? claim.queueId.slice(0, 8)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={
                          claim.status === "ACTIVE"
                            ? "default"
                            : claim.status === "COMPLETED"
                              ? "secondary"
                              : "outline"
                        }
                        className="text-[11px]"
                      >
                        {claim.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {relativeTime(claim.claimedAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <ClipboardList className="h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  No claims yet
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="activity" className="mt-4">
            <h3 className="mb-4 text-sm font-medium">Recent Activity</h3>
            {runLogs.length > 0 ? (
              <div className="rounded-lg border">
                {runLogs.map((entry) => (
                  <RunLogEntry key={entry.id} entry={entry} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <Activity className="h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  No activity recorded
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
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
