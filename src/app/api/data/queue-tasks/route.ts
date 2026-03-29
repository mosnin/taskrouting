import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const queueId = request.nextUrl.searchParams.get("queueId");
  if (!queueId) return NextResponse.json({ error: "Missing queueId" }, { status: 400 });

  const tasks = await prisma.task.findMany({
    where: { queueId, deletedAt: null },
    include: {
      queue: { select: { id: true, name: true } },
      _count: { select: { subtasks: true, claims: true } },
    },
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    take: 50,
  });

  return NextResponse.json({ tasks });
}
