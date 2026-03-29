"use server";

import { requireWorkspaceRole } from "@/lib/auth";
import * as runLogService from "@/lib/services/run-log";

export async function listRunLogs(
  workspaceId: string,
  filters?: {
    eventType?: string;
    entityType?: string;
    entityId?: string;
    actorType?: "USER" | "AGENT" | "SYSTEM";
    limit?: number;
    cursor?: string;
  }
) {
  await requireWorkspaceRole(workspaceId, ["OWNER", "ADMIN", "MEMBER", "VIEWER"]);
  return runLogService.listRunLogs(workspaceId, filters);
}
