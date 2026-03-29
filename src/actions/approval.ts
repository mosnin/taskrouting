"use server";

import { revalidatePath } from "next/cache";
import { requireWorkspaceRole } from "@/lib/auth";
import * as approvalService from "@/lib/services/approval";

export async function reviewApproval(
  approvalId: string,
  status: "APPROVED" | "DENIED",
  workspaceId: string,
  note?: string
) {
  const { session } = await requireWorkspaceRole(workspaceId, ["OWNER", "ADMIN", "MEMBER"]);
  const approval = await approvalService.reviewApproval(
    approvalId,
    session.user.id,
    status,
    note
  );
  revalidatePath("/approvals");
  return approval;
}

export async function listPendingApprovals(workspaceId: string) {
  await requireWorkspaceRole(workspaceId, ["OWNER", "ADMIN", "MEMBER", "VIEWER"]);
  return approvalService.listPendingApprovals(workspaceId);
}
