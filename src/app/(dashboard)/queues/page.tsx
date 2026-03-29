import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { listQueues } from "@/actions/queue";
import { getUserWorkspaces } from "@/actions/workspace";
import { QueuesPageClient } from "./queues-client";

export default async function QueuesPage() {
  const session = await getSession();
  if (!session?.user) redirect("/sign-in");

  const workspaces = await getUserWorkspaces();
  if (!workspaces.length) redirect("/onboarding");

  const workspace = workspaces[0];
  const queues = await listQueues(workspace.id);

  return (
    <QueuesPageClient
      queues={queues}
      workspaceId={workspace.id}
      userId={session.user.id}
    />
  );
}
