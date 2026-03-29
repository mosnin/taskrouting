import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { agents, workspaceMembers, claims, agentTokens } from "@/lib/db/schema";
import { eq, and, isNull, desc, count, sql } from "drizzle-orm";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const memberships = await db
    .select({ workspaceId: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, user.id));
  if (!memberships.length) return NextResponse.json({ agents: [] });

  const workspaceId = memberships[0].workspaceId;
  const agentRows = await db
    .select()
    .from(agents)
    .where(and(eq(agents.workspaceId, workspaceId), isNull(agents.deletedAt)))
    .orderBy(desc(agents.createdAt));

  // Get counts for active claims and active tokens per agent
  const agentIds = agentRows.map((a) => a.id);
  const claimCounts = agentIds.length
    ? await db
        .select({ agentId: claims.agentId, count: count() })
        .from(claims)
        .where(and(eq(claims.status, "ACTIVE"), sql`${claims.agentId} = ANY(${agentIds})`))
        .groupBy(claims.agentId)
    : [];
  const tokenCounts = agentIds.length
    ? await db
        .select({ agentId: agentTokens.agentId, count: count() })
        .from(agentTokens)
        .where(and(eq(agentTokens.status, "ACTIVE"), sql`${agentTokens.agentId} = ANY(${agentIds})`))
        .groupBy(agentTokens.agentId)
    : [];

  const claimMap = Object.fromEntries(claimCounts.map((c) => [c.agentId, c.count]));
  const tokenMap = Object.fromEntries(tokenCounts.map((t) => [t.agentId, t.count]));

  const agentsWithCounts = agentRows.map((a) => ({
    ...a,
    _count: {
      claims: claimMap[a.id] ?? 0,
      tokens: tokenMap[a.id] ?? 0,
    },
  }));

  return NextResponse.json({ agents: agentsWithCounts });
}
