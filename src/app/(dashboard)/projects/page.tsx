import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { listProjects } from "@/actions/project";
import { getUserWorkspaces } from "@/actions/workspace";
import { ProjectsPageClient } from "./projects-client";

export default async function ProjectsPage() {
  const session = await getSession();
  if (!session?.user) redirect("/sign-in");

  const workspaces = await getUserWorkspaces();
  if (!workspaces.length) redirect("/onboarding");

  const workspace = workspaces[0];
  const projects = await listProjects(workspace.id);

  return (
    <ProjectsPageClient
      projects={projects}
      workspaceId={workspace.id}
      userId={session.user.id}
    />
  );
}
