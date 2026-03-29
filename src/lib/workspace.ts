import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { workspaceMembers } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";

/**
 * Returns the active workspace ID for the current user.
 * Uses the first workspace the user is a member of.
 */
export async function getActiveWorkspaceId(): Promise<string> {
  const user = await requireAuth();
  const [membership] = await db
    .select({ workspaceId: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, user.id))
    .orderBy(asc(workspaceMembers.createdAt))
    .limit(1);
  if (!membership) {
    throw new Error("No workspace found");
  }
  return membership.workspaceId;
}
