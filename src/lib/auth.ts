import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users, workspaceMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function getAuthUser() {
  const { userId } = await auth();
  if (!userId) return null;

  const [existing] = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1);
  if (existing) return existing;

  // First time: sync from Clerk
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const [newUser] = await db.insert(users).values({
    clerkId: userId,
    name: clerkUser.fullName || clerkUser.firstName || "User",
    email: clerkUser.emailAddresses[0]?.emailAddress,
    image: clerkUser.imageUrl,
  }).returning();

  return newUser;
}

export async function requireAuth() {
  const user = await getAuthUser();
  if (!user) redirect("/sign-in");
  return user;
}

export async function requireWorkspaceMember(workspaceId: string) {
  const user = await requireAuth();
  const [member] = await db
    .select()
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, user.id)))
    .limit(1);

  if (!member) {
    throw new Error("Not a member of this workspace");
  }

  return { user, member };
}

export async function requireWorkspaceRole(workspaceId: string, requiredRoles: string[]) {
  const { user, member } = await requireWorkspaceMember(workspaceId);
  if (!requiredRoles.includes(member.role)) {
    throw new Error("Insufficient permissions");
  }
  return { user, member };
}
