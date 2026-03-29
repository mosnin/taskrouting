import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Returns the active workspace ID for the current user.
 * Uses the first workspace the user is a member of.
 */
export async function getActiveWorkspaceId(): Promise<string> {
  const session = await requireSession();
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
    select: { workspaceId: true },
  });
  if (!membership) {
    throw new Error("No workspace found");
  }
  return membership.workspaceId;
}
