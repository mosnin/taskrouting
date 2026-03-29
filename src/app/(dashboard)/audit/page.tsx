"use client";

import * as React from "react";
import { ScrollText, Loader2, Activity, Calendar, BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RunLogEntry } from "@/components/audit/run-log-entry";
import { useWorkspace } from "@/hooks/use-workspace";
import { listRunLogs } from "@/actions/audit";

const EVENT_TYPES = [
  "task_created",
  "task_completed",
  "task_claimed",
  "task_released",
  "task_updated",
  "task_routed",
  "claim_created",
  "claim_completed",
  "approval_requested",
  "approval_granted",
  "approval_denied",
  "agent_connected",
  "agent_disconnected",
  "agent_registered",
  "integration_connected",
  "integration_disconnected",
  "workspace_created",
  "project_created",
  "memory_created",
  "memory_updated",
];

const ENTITY_TYPES = [
  "task",
  "agent",
  "approval",
  "queue",
  "workspace",
  "memory_node",
  "IntegrationConnection",
];

const ACTOR_TYPES = ["USER", "AGENT", "SYSTEM"] as const;

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function getMostActiveEntity(logs: any[]): string {
  const counts: Record<string, number> = {};
  for (const log of logs) {
    const et = log.entityType;
    if (et) {
      counts[et] = (counts[et] || 0) + 1;
    }
  }
  let max = 0;
  let result = "---";
  for (const [key, val] of Object.entries(counts)) {
    if (val > max) {
      max = val;
      result = key;
    }
  }
  return result;
}

export default function AuditPage() {
  const { workspaceId } = useWorkspace();
  const [logs, setLogs] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [cursor, setCursor] = React.useState<string | undefined>();
  const [hasMore, setHasMore] = React.useState(false);

  // Filters
  const [eventType, setEventType] = React.useState<string>("all");
  const [entityType, setEntityType] = React.useState<string>("all");
  const [actorType, setActorType] = React.useState<string>("all");

  const fetchLogs = React.useCallback(
    async (append = false) => {
      try {
        if (append) {
          setLoadingMore(true);
        } else {
          setLoading(true);
        }
        const filters: any = { limit: 50 };
        if (eventType !== "all") filters.eventType = eventType;
        if (entityType !== "all") filters.entityType = entityType;
        if (actorType !== "all") filters.actorType = actorType;
        if (append && cursor) filters.cursor = cursor;

        const result = await listRunLogs(workspaceId, filters);
        const items = result.items ?? [];

        if (append) {
          setLogs((prev) => [...prev, ...items]);
        } else {
          setLogs(items);
        }
        setCursor(result.nextCursor);
        setHasMore(result.hasMore ?? false);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load audit log"
        );
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [workspaceId, eventType, entityType, actorType, cursor]
  );

  // Reset and fetch when filters change
  React.useEffect(() => {
    setCursor(undefined);
    setLogs([]);
    fetchLogs(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, eventType, entityType, actorType]);

  const eventsToday = logs.filter((l) => isToday(l.createdAt)).length;
  const mostActive = getMostActiveEntity(logs);

  return (
    <div>
      <PageHeader
        title="Audit Log"
        description="Complete timeline of actions across your workspace."
      />

      <div className="px-8 py-6 space-y-6">
        {/* Stats summary */}
        {!loading && !error && logs.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border bg-card p-4 shadow-[var(--shadow-card)]">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-100 p-2">
                  <Activity className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Events</p>
                  <p className="text-xl font-semibold">{logs.length}{hasMore ? "+" : ""}</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border bg-card p-4 shadow-[var(--shadow-card)]">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-emerald-100 p-2">
                  <Calendar className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Events Today</p>
                  <p className="text-xl font-semibold">{eventsToday}</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border bg-card p-4 shadow-[var(--shadow-card)]">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-purple-100 p-2">
                  <BarChart3 className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Most Active Entity</p>
                  <p className="text-xl font-semibold">{mostActive}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3 shadow-[var(--shadow-card)]">
          <Select value={eventType} onValueChange={setEventType}>
            <SelectTrigger className="w-48 h-9 text-xs">
              <SelectValue placeholder="Event type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All events</SelectItem>
              {EVENT_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={entityType} onValueChange={setEntityType}>
            <SelectTrigger className="w-48 h-9 text-xs">
              <SelectValue placeholder="Entity type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All entities</SelectItem>
              {ENTITY_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Actor type toggle */}
          <div className="flex items-center rounded-lg border bg-muted/50 p-0.5">
            {[{ value: "all", label: "All" }, ...ACTOR_TYPES.map((t) => ({ value: t, label: t.charAt(0) + t.slice(1).toLowerCase() }))].map(
              (opt) => (
                <button
                  key={opt.value}
                  onClick={() => setActorType(opt.value)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    actorType === opt.value
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              )
            )}
          </div>

          {(eventType !== "all" || entityType !== "all" || actorType !== "all") && (
            <button
              onClick={() => {
                setEventType("all");
                setEntityType("all");
                setActorType("all");
              }}
              className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Timeline log entries */}
        {loading ? (
          <div className="space-y-4 pl-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4 rounded" />
                  <Skeleton className="h-3 w-1/2 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-8 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => fetchLogs(false)}
            >
              Retry
            </Button>
          </div>
        ) : logs.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title="No audit log entries"
            description="Actions will be recorded here as they happen across your workspace."
          />
        ) : (
          <div>
            <div className="rounded-xl border bg-card p-5 shadow-[var(--shadow-card)]">
              {logs.map((entry, idx) => (
                <RunLogEntry
                  key={entry.id}
                  entry={entry}
                  showLine={idx < logs.length - 1}
                />
              ))}
            </div>

            {hasMore && (
              <div className="mt-6 flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchLogs(true)}
                  disabled={loadingMore}
                  className="transition-all duration-200 hover:shadow-md"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "Load more events"
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
