import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AgentsPageClient } from "./agents-client";

export default async function AgentsPage() {
  const session = await getSession();
  if (!session?.user) redirect("/sign-in");

  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: session.user.id },
    include: { workspace: true },
  });

  if (!membership) redirect("/onboarding");

  const agents = await prisma.agent.findMany({
    where: { workspaceId: membership.workspaceId, deletedAt: null },
    include: {
      _count: { select: { claims: true, tokens: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const serialized = agents.map((a) => ({
    ...a,
    lastSeenAt: a.lastSeenAt?.toISOString() ?? null,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
    deletedAt: null,
  }));

  return (
    <AgentsPageClient
      agents={serialized as any}
      workspaceId={membership.workspaceId}
      userId={session.user.id}
    />
  );
}
