import { requireAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTaskSheet } from "@/actions/task-sheet";
import { getProject } from "@/actions/project";
import { listQueues } from "@/actions/queue";
import { getUserWorkspaces } from "@/actions/workspace";
import { SheetBoardClient } from "./sheet-board-client";

interface SheetPageProps {
  params: Promise<{ projectId: string; sheetId: string }>;
}

export default async function SheetPage({ params }: SheetPageProps) {
  const { projectId, sheetId } = await params;
  const user = await requireAuth();

  const workspaces = await getUserWorkspaces();
  if (!workspaces.length) redirect("/onboarding");

  const workspace = workspaces[0];
  const [project, sheet, queues] = await Promise.all([
    getProject(projectId),
    getTaskSheet(sheetId),
    listQueues(workspace.id),
  ]);

  return (
    <SheetBoardClient
      project={project}
      sheet={sheet}
      queues={queues}
      workspaceId={workspace.id}
      userId={user.id}
    />
  );
}
