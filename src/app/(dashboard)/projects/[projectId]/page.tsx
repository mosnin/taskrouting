import { requireAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getProject } from "@/actions/project";
import { listTasks } from "@/actions/task";
import { listQueues } from "@/actions/queue";
import { getUserWorkspaces } from "@/actions/workspace";
import { ProjectDetailClient } from "./project-detail-client";

interface ProjectDetailPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectDetailPage({
  params,
}: ProjectDetailPageProps) {
  const { projectId } = await params;
  const user = await requireAuth();

  const workspaces = await getUserWorkspaces();
  if (!workspaces.length) redirect("/onboarding");

  const workspace = workspaces[0];
  const [project, tasks, queues] = await Promise.all([
    getProject(projectId),
    listTasks(workspace.id, { projectId }),
    listQueues(workspace.id),
  ]);

  return (
    <ProjectDetailClient
      project={project}
      tasks={tasks}
      queues={queues}
      workspaceId={workspace.id}
      userId={user.id}
    />
  );
}
