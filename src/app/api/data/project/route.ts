import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      taskSheets: { where: { deletedAt: null }, orderBy: { order: "asc" } },
    },
  });

  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const tasks = await prisma.task.findMany({
    where: { projectId: id, deletedAt: null },
    include: {
      queue: { select: { id: true, name: true } },
      _count: { select: { subtasks: true, claims: true, artifacts: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ project, tasks });
}
