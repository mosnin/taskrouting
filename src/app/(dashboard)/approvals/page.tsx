"use client";

import * as React from "react";
import { CheckCircle2, XCircle, Clock, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useWorkspace } from "@/hooks/use-workspace";
import { listPendingApprovals, reviewApproval } from "@/actions/approval";
import { relativeTime } from "@/lib/format";

export default function ApprovalsPage() {
  const { workspaceId } = useWorkspace();
  const [pending, setPending] = React.useState<any[]>([]);
  const [reviewed, setReviewed] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Deny dialog state
  const [denyId, setDenyId] = React.useState<string | null>(null);
  const [denyNote, setDenyNote] = React.useState("");
  const [processing, setProcessing] = React.useState<string | null>(null);

  const fetchApprovals = React.useCallback(async () => {
    try {
      setLoading(true);
      const result = await listPendingApprovals(workspaceId);
      setPending(result.filter((a: any) => a.status === "PENDING"));
      setReviewed(result.filter((a: any) => a.status !== "PENDING"));
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load approvals"
      );
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  React.useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  async function handleApprove(approvalId: string) {
    setProcessing(approvalId);
    try {
      const result = await reviewApproval(approvalId, "APPROVED", workspaceId);
      // Move from pending to reviewed
      setPending((prev) => prev.filter((a) => a.id !== approvalId));
      setReviewed((prev) => [{ ...result, status: "APPROVED" }, ...prev]);
    } catch {
      // Error handling
    } finally {
      setProcessing(null);
    }
  }

  async function handleDeny(approvalId: string) {
    setProcessing(approvalId);
    try {
      const result = await reviewApproval(
        approvalId,
        "DENIED",
        workspaceId,
        denyNote.trim() || undefined
      );
      setPending((prev) => prev.filter((a) => a.id !== approvalId));
      setReviewed((prev) => [{ ...result, status: "DENIED" }, ...prev]);
      setDenyId(null);
      setDenyNote("");
    } catch {
      // Error handling
    } finally {
      setProcessing(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Approvals"
        description="Review and approve agent actions that require human oversight."
      />

      <div className="px-8 py-6">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={fetchApprovals}
            >
              Retry
            </Button>
          </div>
        ) : (
          <Tabs defaultValue="pending">
            <TabsList>
              <TabsTrigger value="pending" className="gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Pending
                {pending.length > 0 && (
                  <Badge
                    variant="default"
                    className="ml-1 h-5 min-w-5 justify-center rounded-full px-1.5 text-[10px]"
                  >
                    {pending.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="reviewed" className="gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Reviewed
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="mt-4">
              {pending.length === 0 ? (
                <EmptyState
                  icon={ShieldCheck}
                  title="No pending approvals"
                  description="All caught up. Agent actions requiring review will appear here."
                />
              ) : (
                <div className="space-y-3">
                  {pending.map((approval) => (
                    <div
                      key={approval.id}
                      className="rounded-lg border bg-card p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="text-sm font-semibold">
                            {approval.task?.title ?? "Unknown Task"}
                          </h3>
                          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                            <span>
                              Requested by{" "}
                              {approval.requestedByType.toLowerCase()}:
                              {approval.requestedById.slice(0, 8)}
                            </span>
                            <span>{relativeTime(approval.createdAt)}</span>
                            {approval.task?.priority && (
                              <Badge
                                variant="outline"
                                className="text-[10px]"
                              >
                                {approval.task.priority}
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {denyId === approval.id ? (
                            <div className="flex items-center gap-2">
                              <Input
                                placeholder="Reason (optional)"
                                value={denyNote}
                                onChange={(e) => setDenyNote(e.target.value)}
                                className="h-8 w-48 text-xs"
                                onKeyDown={(e) => {
                                  if (e.key === "Enter")
                                    handleDeny(approval.id);
                                  if (e.key === "Escape") {
                                    setDenyId(null);
                                    setDenyNote("");
                                  }
                                }}
                              />
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeny(approval.id)}
                                disabled={processing === approval.id}
                              >
                                {processing === approval.id
                                  ? "..."
                                  : "Confirm Deny"}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setDenyId(null);
                                  setDenyNote("");
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleApprove(approval.id)}
                                disabled={processing === approval.id}
                              >
                                <CheckCircle2 className="h-4 w-4" />
                                {processing === approval.id
                                  ? "..."
                                  : "Approve"}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setDenyId(approval.id)}
                                disabled={processing === approval.id}
                              >
                                <XCircle className="h-4 w-4" />
                                Deny
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="reviewed" className="mt-4">
              {reviewed.length === 0 ? (
                <EmptyState
                  icon={CheckCircle2}
                  title="No reviewed approvals"
                  description="Reviewed approvals will appear here."
                />
              ) : (
                <div className="space-y-3">
                  {reviewed.map((approval) => (
                    <div
                      key={approval.id}
                      className="rounded-lg border bg-card p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="text-sm font-semibold">
                            {approval.task?.title ?? "Unknown Task"}
                          </h3>
                          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                            <span>
                              Requested by{" "}
                              {approval.requestedByType?.toLowerCase() ?? "unknown"}:
                              {approval.requestedById?.slice(0, 8) ?? ""}
                            </span>
                            <span>{relativeTime(approval.createdAt)}</span>
                          </div>
                          {approval.decisionNote && (
                            <p className="mt-2 text-xs text-muted-foreground italic">
                              &ldquo;{approval.decisionNote}&rdquo;
                            </p>
                          )}
                        </div>
                        <Badge
                          variant={
                            approval.status === "APPROVED"
                              ? "default"
                              : "destructive"
                          }
                        >
                          {approval.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
