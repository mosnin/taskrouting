import { requireAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { workspaceMembers, agents, claims, agentTokens } from "@/lib/db/schema";
import { eq, and, count, isNull } from "drizzle-orm";
import { desc } from "drizzle-orm";
import { AgentsPageClient } from "./agents-client";

export default async function AgentsPage() {
  const user = await requireAuth();

  const [membership] = await db
    .select()
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, user.id))
    .limit(1);

  if (!membership) redirect("/onboarding");

  const agentsList = await db
    .select()
    .from(agents)
    .where(and(eq(agents.workspaceId, membership.workspaceId), isNull(agents.deletedAt)))
    .orderBy(desc(agents.createdAt));

  // Get counts for each agent
  const agentsWithCounts = await Promise.all(
    agentsList.map(async (agent) => {
      const [claimsCount] = await db.select({ value: count() }).from(claims).where(eq(claims.agentId, agent.id));
      const [tokensCount] = await db.select({ value: count() }).from(agentTokens).where(eq(agentTokens.agentId, agent.id));
      return {
        ...agent,
        lastSeenAt: agent.lastSeenAt?.toISOString() ?? null,
        createdAt: agent.createdAt.toISOString(),
        updatedAt: agent.updatedAt.toISOString(),
        deletedAt: null,
        _count: { claims: claimsCount?.value ?? 0, tokens: tokensCount?.value ?? 0 },
      };
    })
  );

  return (
    <AgentsPageClient
      agents={agentsWithCounts as any}
      workspaceId={membership.workspaceId}
      userId={user.id}
    />
  );
}
