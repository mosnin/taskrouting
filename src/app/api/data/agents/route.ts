import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: session.user.id },
    select: { workspaceId: true },
  });
  if (!memberships.length) return NextResponse.json({ agents: [] });

  const workspaceId = memberships[0].workspaceId;
  const agents = await prisma.agent.findMany({
    where: { workspaceId, deletedAt: null },
    include: {
      _count: { select: { claims: { where: { status: "ACTIVE" } }, tokens: { where: { status: "ACTIVE" } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ agents });
}
