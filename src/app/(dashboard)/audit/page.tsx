"use client";

import * as React from "react";
import { ScrollText, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  "approval_requested",
  "approval_granted",
  "approval_denied",
  "agent_connected",
  "agent_disconnected",
  "integration_connected",
  "integration_disconnected",
  "workspace_created",
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

  return (
    <div>
      <PageHeader
        title="Audit Log"
        description="Complete record of actions across your workspace."
      />

      <div className="px-8 py-6">
        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-3">
          <Select value={eventType} onValueChange={setEventType}>
            <SelectTrigger className="w-48">
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
            <SelectTrigger className="w-48">
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

          <Select value={actorType} onValueChange={setActorType}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Actor type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actors</SelectItem>
              {ACTOR_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Log entries */}
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-lg" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => fetchLogs(false)}
            >
              Retry
            </Button>
          </div>
        ) : logs.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title="No audit log entries"
            description="Actions will be recorded here as they happen."
          />
        ) : (
          <div>
            <div className="rounded-lg border">
              {logs.map((entry) => (
                <RunLogEntry key={entry.id} entry={entry} />
              ))}
            </div>

            {hasMore && (
              <div className="mt-4 flex justify-center">
                <Button
                  variant="outline"
                  onClick={() => fetchLogs(true)}
                  disabled={loadingMore}
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "Load more"
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
