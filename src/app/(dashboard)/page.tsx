import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCard } from "@/components/dashboard/stats-card";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { TaskStatusChart } from "@/components/dashboard/task-status-chart";
import {
  CheckSquare,
  Bot,
  Inbox,
  ShieldCheck,
  Zap,
  ArrowUpRight,
} from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session?.user) redirect("/sign-in");

  // Get the user's first workspace
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: session.user.id },
    include: { workspace: true },
  });

  if (!membership) redirect("/onboarding");

  const workspaceId = membership.workspaceId;

  const [
    totalTasks,
    agents,
    queueCount,
    pendingApprovals,
    activeClaims,
    recentLogs,
    tasksByStatus,
  ] = await Promise.all([
    prisma.task.count({ where: { workspaceId, deletedAt: null } }),
    prisma.agent.findMany({ where: { workspaceId, deletedAt: null }, select: { status: true } }),
    prisma.queue.count({ where: { workspaceId, deletedAt: null } }),
    prisma.approval.count({ where: { status: "PENDING", task: { workspaceId } } }),
    prisma.claim.count({ where: { status: "ACTIVE", queue: { workspaceId } } }),
    prisma.runLog.findMany({ where: { workspaceId }, orderBy: { createdAt: "desc" }, take: 15 }),
    prisma.task.groupBy({ by: ["status"], where: { workspaceId, deletedAt: null }, _count: true }),
  ]);

  const onlineAgents = agents.filter((a) => a.status === "ONLINE").length;
  const totalAgents = agents.length;

  const statusData = tasksByStatus.map((g) => ({ status: g.status, count: g._count }));

  const activity = recentLogs.map((log) => ({
    id: log.id,
    eventType: log.eventType,
    entityType: log.entityType ?? "",
    entityId: log.entityId ?? "",
    actorType: log.actorType,
    actorId: log.actorId ?? "",
    message: log.eventType.replace(/_/g, " "),
    createdAt: log.createdAt.toISOString(),
  }));

  const firstName = session.user.name?.split(" ")[0] || "there";

  return (
    <div className="space-y-6 p-6 animate-fade-in">
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description="Here's what's happening in your workspace"
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Tasks"
          value={totalTasks}
          subtitle={`${activeClaims} actively claimed`}
          icon={CheckSquare}
          color="purple"
        />
        <StatsCard
          title="Agents"
          value={totalAgents}
          subtitle={`${onlineAgents} online`}
          icon={Bot}
          color="blue"
        />
        <StatsCard
          title="Queues"
          value={queueCount}
          icon={Inbox}
          color="green"
        />
        <StatsCard
          title="Pending Approvals"
          value={pendingApprovals}
          icon={ShieldCheck}
          color={pendingApprovals > 0 ? "amber" : "green"}
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Task Distribution */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Task Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <TaskStatusChart data={statusData} />
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">No tasks yet</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
            <Link
              href="/audit"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              View all <ArrowUpRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="px-3">
            {activity.length > 0 ? (
              <ActivityFeed items={activity} />
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">No activity yet. Create a project to get started.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link
              href="/projects"
              className="flex items-center gap-3 rounded-xl border p-4 hover:bg-accent/50 hover:border-primary/20 transition-all group"
            >
              <div className="rounded-lg bg-purple-50 p-2 ring-1 ring-purple-100">
                <Zap className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium group-hover:text-primary transition-colors">New Project</p>
                <p className="text-xs text-muted-foreground">Create a project</p>
              </div>
            </Link>
            <Link
              href="/agents"
              className="flex items-center gap-3 rounded-xl border p-4 hover:bg-accent/50 hover:border-primary/20 transition-all group"
            >
              <div className="rounded-lg bg-blue-50 p-2 ring-1 ring-blue-100">
                <Bot className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium group-hover:text-primary transition-colors">Register Agent</p>
                <p className="text-xs text-muted-foreground">Connect an AI agent</p>
              </div>
            </Link>
            <Link
              href="/queues"
              className="flex items-center gap-3 rounded-xl border p-4 hover:bg-accent/50 hover:border-primary/20 transition-all group"
            >
              <div className="rounded-lg bg-emerald-50 p-2 ring-1 ring-emerald-100">
                <Inbox className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-medium group-hover:text-primary transition-colors">New Queue</p>
                <p className="text-xs text-muted-foreground">Add a task queue</p>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
