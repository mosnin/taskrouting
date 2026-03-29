"use client";

import * as React from "react";
import {
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  Bot,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  const [activeTab, setActiveTab] = React.useState<"pending" | "reviewed">("pending");

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

      <div className="px-8 py-6 space-y-6">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-8 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={fetchApprovals}
            >
              Retry
            </Button>
          </div>
        ) : (
          <>
            {/* Tab bar */}
            <div className="flex items-center gap-1 rounded-xl border bg-card p-1 shadow-[var(--shadow-card)] w-fit">
              <button
                onClick={() => setActiveTab("pending")}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                  activeTab === "pending"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Clock className="h-3.5 w-3.5" />
                Pending
                {pending.length > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                    {pending.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab("reviewed")}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                  activeTab === "reviewed"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Reviewed
                {reviewed.length > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
                    {reviewed.length}
                  </span>
                )}
              </button>
            </div>

            {/* Pending tab */}
            {activeTab === "pending" && (
              <div>
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
                        className="rounded-xl border bg-card p-5 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-all duration-200"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-sm font-semibold truncate">
                                {approval.task?.title ?? "Unknown Task"}
                              </h3>
                              {approval.task?.priority && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] shrink-0"
                                >
                                  {approval.task.priority}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700">
                                <Bot className="h-3 w-3" />
                                {approval.requestedByType?.toLowerCase()}:{approval.requestedById?.slice(0, 8)}
                              </span>
                              <span>{relativeTime(approval.createdAt)}</span>
                            </div>
                            {approval.reason && (
                              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                                {approval.reason}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {denyId === approval.id ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  placeholder="Reason (optional)"
                                  value={denyNote}
                                  onChange={(e) => setDenyNote(e.target.value)}
                                  className="h-8 w-48 text-xs"
                                  autoFocus
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
                                  {processing === approval.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    "Confirm"
                                  )}
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
                                  className="gap-1.5"
                                >
                                  {processing === approval.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                  )}
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setDenyId(approval.id)}
                                  disabled={processing === approval.id}
                                  className="gap-1.5"
                                >
                                  <XCircle className="h-3.5 w-3.5" />
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
              </div>
            )}

            {/* Reviewed tab */}
            {activeTab === "reviewed" && (
              <div>
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
                        className={cn(
                          "rounded-xl border bg-card p-5 shadow-[var(--shadow-card)] transition-all duration-200",
                          approval.status === "APPROVED"
                            ? "border-l-4 border-l-emerald-500"
                            : "border-l-4 border-l-red-500"
                        )}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-sm font-semibold truncate">
                                {approval.task?.title ?? "Unknown Task"}
                              </h3>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span>
                                Requested by{" "}
                                {approval.requestedByType?.toLowerCase() ?? "unknown"}:
                                {approval.requestedById?.slice(0, 8) ?? ""}
                              </span>
                              <span>{relativeTime(approval.createdAt)}</span>
                            </div>
                            {approval.decisionNote && (
                              <p className="mt-2 text-xs text-muted-foreground italic bg-muted/50 rounded-lg px-3 py-2">
                                &ldquo;{approval.decisionNote}&rdquo;
                              </p>
                            )}
                            {approval.decidedById && (
                              <p className="mt-2 text-[10px] text-muted-foreground">
                                {approval.status === "APPROVED" ? "Approved" : "Denied"} by user:{approval.decidedById?.slice(0, 8)}{" "}
                                {approval.decidedAt && <>&#183; {relativeTime(approval.decidedAt)}</>}
                              </p>
                            )}
                          </div>
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium",
                              approval.status === "APPROVED"
                                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                                : "bg-red-50 text-red-700 ring-1 ring-red-200"
                            )}
                          >
                            {approval.status === "APPROVED" ? (
                              <CheckCircle2 className="h-3 w-3" />
                            ) : (
                              <XCircle className="h-3 w-3" />
                            )}
                            {approval.status === "APPROVED" ? "Approved" : "Denied"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
