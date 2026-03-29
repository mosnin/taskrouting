import { getSession } from "@/lib/auth";
import { PageHeader } from "@/components/layout/header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ListTodo,
  Bot,
  Inbox,
  ShieldCheck,
  ArrowUpRight,
  Clock,
} from "lucide-react";

const stats = [
  {
    title: "Total Tasks",
    value: "128",
    change: "+12 this week",
    icon: ListTodo,
    iconColor: "text-blue-600",
    iconBg: "bg-blue-50",
  },
  {
    title: "Active Agents",
    value: "6",
    change: "2 idle",
    icon: Bot,
    iconColor: "text-violet-600",
    iconBg: "bg-violet-50",
  },
  {
    title: "Open Queues",
    value: "4",
    change: "23 items pending",
    icon: Inbox,
    iconColor: "text-amber-600",
    iconBg: "bg-amber-50",
  },
  {
    title: "Pending Approvals",
    value: "3",
    change: "1 urgent",
    icon: ShieldCheck,
    iconColor: "text-emerald-600",
    iconBg: "bg-emerald-50",
  },
];

const recentActivity = [
  {
    id: "1",
    action: "Task completed",
    description: "Agent code-review-bot finished PR #142 review",
    timestamp: "2 minutes ago",
  },
  {
    id: "2",
    action: "Approval requested",
    description: "deploy-agent requires approval for production deployment",
    timestamp: "8 minutes ago",
  },
  {
    id: "3",
    action: "Agent started",
    description: "test-runner-bot picked up task from CI queue",
    timestamp: "15 minutes ago",
  },
  {
    id: "4",
    action: "Queue created",
    description: 'New queue "bug-triage" added to project Alpha',
    timestamp: "1 hour ago",
  },
  {
    id: "5",
    action: "Integration connected",
    description: "GitHub webhook configured for org/repo",
    timestamp: "3 hours ago",
  },
];

export default async function DashboardPage() {
  const session = await getSession();
  const firstName = session?.user?.name?.split(" ")[0] ?? "there";

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description="Here's what's happening across your workspace."
      />

      <div className="px-8 py-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.title} className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardDescription className="text-sm font-medium">
                  {stat.title}
                </CardDescription>
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${stat.iconBg}`}
                >
                  <stat.icon className={`h-4 w-4 ${stat.iconColor}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {stat.change}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Activity */}
        <div className="mt-8">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Recent Activity</CardTitle>
              <CardDescription>
                Latest events across your workspace
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-0">
                {recentActivity.map((item, index) => (
                  <div
                    key={item.id}
                    className={`flex items-start gap-4 py-3 ${
                      index !== recentActivity.length - 1
                        ? "border-b border-border"
                        : ""
                    }`}
                  >
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100">
                      {item.action.includes("completed") ? (
                        <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <Clock className="h-4 w-4 text-zinc-500" />
                      )}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-sm font-medium text-foreground">
                        {item.action}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {item.timestamp}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
