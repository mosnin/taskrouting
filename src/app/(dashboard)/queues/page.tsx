import { requireAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { listQueues } from "@/actions/queue";
import { getUserWorkspaces } from "@/actions/workspace";
import { QueuesPageClient } from "./queues-client";

export default async function QueuesPage() {
  const user = await requireAuth();

  const workspaces = await getUserWorkspaces();
  if (!workspaces.length) redirect("/onboarding");

  const workspace = workspaces[0];
  const queues = await listQueues(workspace.id);

  return (
    <QueuesPageClient
      queues={queues}
      workspaceId={workspace.id}
      userId={user.id}
    />
  );
}
