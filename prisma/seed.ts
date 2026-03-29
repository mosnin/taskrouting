import { PrismaClient } from "@prisma/client";
import { createHash, randomBytes } from "crypto";

const prisma = new PrismaClient();

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

async function main() {
  console.log("Seeding TaskRouting database...");

  // Create user
  const user = await prisma.user.upsert({
    where: { email: "demo@taskrouting.dev" },
    update: {},
    create: {
      email: "demo@taskrouting.dev",
      name: "Demo User",
    },
  });
  console.log(`User: ${user.email}`);

  // Create workspace
  const workspace = await prisma.workspace.upsert({
    where: { slug: "demo-workspace" },
    update: {},
    create: {
      name: "Demo Workspace",
      slug: "demo-workspace",
      members: {
        create: { userId: user.id, role: "OWNER" },
      },
    },
  });
  console.log(`Workspace: ${workspace.slug}`);

  // Create queues
  const queues = await Promise.all(
    [
      { name: "Engineering", caps: ["write_code", "review_pr"] },
      { name: "Research", caps: ["research"] },
      { name: "QA", caps: ["qa"] },
      { name: "Support", caps: ["support_response", "triage"] },
      { name: "Billing", caps: ["billing_followup"] },
    ].map((q) =>
      prisma.queue.upsert({
        where: { workspaceId_name: { workspaceId: workspace.id, name: q.name } },
        update: {},
        create: {
          workspaceId: workspace.id,
          name: q.name,
          description: `${q.name} work queue`,
          requiredCapabilities: q.caps,
        },
      })
    )
  );
  console.log(`Queues: ${queues.map((q) => q.name).join(", ")}`);

  // Create capabilities
  const allCaps = ["write_code", "review_pr", "research", "qa", "triage", "support_response", "billing_followup", "docs"];
  for (const cap of allCaps) {
    await prisma.capability.upsert({
      where: { workspaceId_name: { workspaceId: workspace.id, name: cap } },
      update: {},
      create: { workspaceId: workspace.id, name: cap, description: cap.replace(/_/g, " ") },
    });
  }

  // Create project
  const project = await prisma.project.upsert({
    where: { id: "seed-project-1" },
    update: {},
    create: {
      id: "seed-project-1",
      workspaceId: workspace.id,
      name: "Website Redesign",
      description: "Complete redesign of the company website with new branding",
      status: "ACTIVE",
    },
  });

  const incomingProject = await prisma.project.upsert({
    where: { id: "seed-project-2" },
    update: {},
    create: {
      id: "seed-project-2",
      workspaceId: workspace.id,
      name: "Incoming",
      description: "Tasks from external events and integrations",
      status: "ACTIVE",
    },
  });

  // Create task sheets
  const engSheet = await prisma.taskSheet.upsert({
    where: { id: "seed-sheet-1" },
    update: {},
    create: {
      id: "seed-sheet-1",
      workspaceId: workspace.id,
      projectId: project.id,
      name: "Engineering",
      description: "Engineering tasks for the redesign",
      order: 0,
    },
  });

  const designSheet = await prisma.taskSheet.upsert({
    where: { id: "seed-sheet-2" },
    update: {},
    create: {
      id: "seed-sheet-2",
      workspaceId: workspace.id,
      projectId: project.id,
      name: "Design",
      description: "Design tasks",
      order: 1,
    },
  });

  // Create tasks
  const tasks = await Promise.all([
    prisma.task.upsert({
      where: { id: "seed-task-1" },
      update: {},
      create: {
        id: "seed-task-1",
        workspaceId: workspace.id,
        projectId: project.id,
        taskSheetId: engSheet.id,
        queueId: queues[0].id, // Engineering
        title: "Implement auth flow",
        description: "Set up authentication with NextAuth including GitHub OAuth and session management",
        status: "TODO",
        priority: "HIGH",
        requiredCapabilities: ["write_code"],
      },
    }),
    prisma.task.upsert({
      where: { id: "seed-task-2" },
      update: {},
      create: {
        id: "seed-task-2",
        workspaceId: workspace.id,
        projectId: project.id,
        taskSheetId: engSheet.id,
        queueId: queues[0].id,
        title: "Review PR #42: Update API endpoints",
        description: "Review the changes to API endpoint naming conventions",
        status: "TODO",
        priority: "MEDIUM",
        requiredCapabilities: ["review_pr"],
      },
    }),
    prisma.task.upsert({
      where: { id: "seed-task-3" },
      update: {},
      create: {
        id: "seed-task-3",
        workspaceId: workspace.id,
        projectId: project.id,
        taskSheetId: engSheet.id,
        queueId: queues[1].id, // Research
        title: "Research headless CMS options",
        description: "Evaluate Contentful, Sanity, and Strapi for the new content management system",
        status: "BACKLOG",
        priority: "MEDIUM",
        requiredCapabilities: ["research"],
      },
    }),
    prisma.task.upsert({
      where: { id: "seed-task-4" },
      update: {},
      create: {
        id: "seed-task-4",
        workspaceId: workspace.id,
        projectId: project.id,
        taskSheetId: engSheet.id,
        queueId: queues[2].id, // QA
        title: "QA: Homepage responsive design",
        description: "Test homepage across all breakpoints and devices",
        status: "TODO",
        priority: "LOW",
        requiredCapabilities: ["qa"],
      },
    }),
    prisma.task.upsert({
      where: { id: "seed-task-5" },
      update: {},
      create: {
        id: "seed-task-5",
        workspaceId: workspace.id,
        projectId: project.id,
        taskSheetId: designSheet.id,
        queueId: queues[0].id,
        title: "Build component library",
        description: "Create reusable component library with design tokens matching the new brand",
        status: "IN_PROGRESS",
        priority: "HIGH",
        requiredCapabilities: ["write_code"],
        ownerType: "USER",
        ownerId: user.id,
      },
    }),
    prisma.task.upsert({
      where: { id: "seed-task-6" },
      update: {},
      create: {
        id: "seed-task-6",
        workspaceId: workspace.id,
        projectId: project.id,
        taskSheetId: engSheet.id,
        queueId: queues[3].id, // Support
        title: "Triage: Customer reports broken checkout",
        description: "Customer #1042 reports checkout flow failing on mobile Safari",
        status: "TODO",
        priority: "URGENT",
        requiredCapabilities: ["triage", "support_response"],
        sourceProvider: "slack",
        sourceObjectType: "message",
        sourceObjectId: "msg-123",
      },
    }),
  ]);
  console.log(`Tasks: ${tasks.length} created`);

  // Create subtasks
  await prisma.subtask.createMany({
    data: [
      { taskId: "seed-task-1", title: "Configure NextAuth providers", status: "DONE", order: 0 },
      { taskId: "seed-task-1", title: "Set up JWT session strategy", status: "TODO", order: 1 },
      { taskId: "seed-task-1", title: "Add workspace member check middleware", status: "TODO", order: 2 },
      { taskId: "seed-task-5", title: "Design tokens setup", status: "DONE", order: 0 },
      { taskId: "seed-task-5", title: "Button component", status: "IN_PROGRESS", order: 1 },
      { taskId: "seed-task-5", title: "Form components", status: "TODO", order: 2 },
    ],
    skipDuplicates: true,
  });

  // Create agents
  const agent1 = await prisma.agent.upsert({
    where: { workspaceId_name: { workspaceId: workspace.id, name: "CodeBot" } },
    update: {},
    create: {
      workspaceId: workspace.id,
      name: "CodeBot",
      description: "General-purpose coding agent. Writes code, reviews PRs, fixes bugs.",
      status: "ONLINE",
      capabilities: ["write_code", "review_pr", "qa"],
      allowedQueueIds: [queues[0].id, queues[2].id],
      lastSeenAt: new Date(),
    },
  });

  const agent2 = await prisma.agent.upsert({
    where: { workspaceId_name: { workspaceId: workspace.id, name: "ResearchAgent" } },
    update: {},
    create: {
      workspaceId: workspace.id,
      name: "ResearchAgent",
      description: "Deep research agent. Analyzes options, writes reports, gathers data.",
      status: "OFFLINE",
      capabilities: ["research", "docs"],
      allowedQueueIds: [queues[1].id],
    },
  });

  const agent3 = await prisma.agent.upsert({
    where: { workspaceId_name: { workspaceId: workspace.id, name: "TriageBot" } },
    update: {},
    create: {
      workspaceId: workspace.id,
      name: "TriageBot",
      description: "Triages incoming issues and support requests.",
      status: "ONLINE",
      capabilities: ["triage", "support_response"],
      allowedQueueIds: [queues[3].id],
      lastSeenAt: new Date(),
    },
  });
  console.log(`Agents: ${agent1.name}, ${agent2.name}, ${agent3.name}`);

  // Create agent tokens (hashed, raw tokens printed for reference)
  const rawToken1 = `tr_${randomBytes(48).toString("base64url")}`;
  const rawToken2 = `tr_${randomBytes(48).toString("base64url")}`;

  await prisma.agentToken.upsert({
    where: { tokenHash: hashToken(rawToken1) },
    update: {},
    create: {
      agentId: agent1.id,
      tokenHash: hashToken(rawToken1),
      name: "CodeBot primary token",
      scopes: ["*"],
      lastUsedAt: new Date(Date.now() - 1000 * 60 * 15),
    },
  });

  await prisma.agentToken.upsert({
    where: { tokenHash: hashToken(rawToken2) },
    update: {},
    create: {
      agentId: agent3.id,
      tokenHash: hashToken(rawToken2),
      name: "TriageBot primary token",
      scopes: ["queues:read", "tasks:read", "tasks:write", "tasks:claim"],
    },
  });

  console.log(`\nAgent tokens (for testing):`);
  console.log(`  CodeBot:    ${rawToken1}`);
  console.log(`  TriageBot:  ${rawToken2}`);

  // Create a claim (CodeBot claimed a task)
  await prisma.claim.upsert({
    where: { id: "seed-claim-1" },
    update: {},
    create: {
      id: "seed-claim-1",
      agentId: agent1.id,
      taskId: "seed-task-2",
      queueId: queues[0].id,
      status: "ACTIVE",
    },
  });

  // Update the claimed task
  await prisma.task.update({
    where: { id: "seed-task-2" },
    data: { status: "IN_PROGRESS", ownerType: "AGENT", ownerId: agent1.id },
  });

  // Create memory nodes
  await prisma.memoryNode.upsert({
    where: { id: "seed-memory-1" },
    update: {},
    create: {
      id: "seed-memory-1",
      workspaceId: workspace.id,
      projectId: project.id,
      title: "Website Redesign Architecture Decision",
      content: "## Architecture Decision Record\n\n### Context\nWe need to choose a frontend framework for the redesign.\n\n### Decision\nNext.js with App Router for SSR/SSG capabilities.\n\n### Consequences\n- Improved SEO\n- Better performance\n- Learning curve for team",
      type: "DECISION",
      createdBy: user.id,
      updatedBy: user.id,
    },
  });

  await prisma.memoryNode.upsert({
    where: { id: "seed-memory-2" },
    update: {},
    create: {
      id: "seed-memory-2",
      workspaceId: workspace.id,
      projectId: project.id,
      taskId: "seed-task-3",
      title: "CMS Research Notes",
      content: "## CMS Comparison\n\n### Contentful\n- Pro: Excellent API\n- Con: Expensive at scale\n\n### Sanity\n- Pro: Flexible schemas\n- Con: Complex setup\n\n### Strapi\n- Pro: Self-hosted option\n- Con: Less polished UI",
      type: "RESEARCH",
      createdBy: agent2.id,
      updatedBy: agent2.id,
      agentId: agent2.id,
    },
  });

  await prisma.memoryNode.upsert({
    where: { id: "seed-memory-3" },
    update: {},
    create: {
      id: "seed-memory-3",
      workspaceId: workspace.id,
      title: "Team Standup Notes - March 2026",
      content: "## Standup Notes\n\n### March 28\n- Auth flow nearly complete\n- Design tokens finalized\n- CMS research underway\n\n### March 27\n- Project kickoff\n- Queues configured\n- Agents onboarded",
      type: "MEETING_NOTES",
      createdBy: user.id,
      updatedBy: user.id,
    },
  });

  // Create run logs
  const runLogEntries = [
    { eventType: "workspace_created", actorType: "USER" as const, actorId: user.id, entityType: "Workspace", entityId: workspace.id },
    { eventType: "project_created", actorType: "USER" as const, actorId: user.id, entityType: "Project", entityId: project.id },
    { eventType: "queue_created", actorType: "USER" as const, actorId: user.id, entityType: "Queue", entityId: queues[0].id, metadata: { name: "Engineering" } },
    { eventType: "task_created", actorType: "USER" as const, actorId: user.id, entityType: "Task", entityId: "seed-task-1", metadata: { title: "Implement auth flow" } },
    { eventType: "task_routed", actorType: "SYSTEM" as const, actorId: "system", entityType: "Task", entityId: "seed-task-1", metadata: { queue: "Engineering" } },
    { eventType: "agent_connected", actorType: "AGENT" as const, actorId: agent1.id, entityType: "Agent", entityId: agent1.id, metadata: { name: "CodeBot" } },
    { eventType: "task_claimed", actorType: "AGENT" as const, actorId: agent1.id, entityType: "Task", entityId: "seed-task-2", metadata: { queue: "Engineering" } },
    { eventType: "memory_created", actorType: "AGENT" as const, actorId: agent2.id, entityType: "MemoryNode", entityId: "seed-memory-2", metadata: { title: "CMS Research Notes" } },
    { eventType: "agent_heartbeat", actorType: "AGENT" as const, actorId: agent1.id, entityType: "Agent", entityId: agent1.id },
    { eventType: "task_updated", actorType: "AGENT" as const, actorId: agent1.id, entityType: "Task", entityId: "seed-task-2", metadata: { status: "IN_PROGRESS" } },
  ];

  for (const entry of runLogEntries) {
    await prisma.runLog.create({
      data: {
        workspaceId: workspace.id,
        ...entry,
        metadata: entry.metadata || {},
      },
    });
    // Small delay to get different timestamps
    await new Promise((r) => setTimeout(r, 10));
  }
  console.log(`Run logs: ${runLogEntries.length} entries`);

  // Create workflow templates
  await prisma.workflowTemplate.upsert({
    where: { workspaceId_name: { workspaceId: workspace.id, name: "PR opened → Review task" } },
    update: {},
    create: {
      workspaceId: workspace.id,
      name: "PR opened → Review task",
      description: "Creates a review task when a GitHub PR is opened",
      trigger: { eventType: "pr_opened" },
      actions: { type: "create_task", config: { titleTemplate: "Review PR: {{title}}", queueName: "Engineering", requiredCapabilities: ["review_pr"], priority: "HIGH" } },
    },
  });

  await prisma.workflowTemplate.upsert({
    where: { workspaceId_name: { workspaceId: workspace.id, name: "Bug issue → Engineering" } },
    update: {},
    create: {
      workspaceId: workspace.id,
      name: "Bug issue → Engineering",
      description: "Routes GitHub issues labeled 'bug' to Engineering queue",
      trigger: { eventType: "issue_labeled", conditions: { label: "bug" } },
      actions: { type: "route_to_queue", config: { queueName: "Engineering", requiredCapabilities: ["write_code"], priority: "HIGH" } },
    },
  });

  // Create an approval
  await prisma.approval.upsert({
    where: { id: "seed-approval-1" },
    update: {},
    create: {
      id: "seed-approval-1",
      taskId: "seed-task-2",
      requestedByType: "AGENT",
      requestedById: agent1.id,
      status: "PENDING",
    },
  });

  await prisma.task.update({
    where: { id: "seed-task-2" },
    data: { approvalState: "PENDING" },
  });

  console.log("\nSeed complete!");
  console.log(`\nTo sign in with dev credentials:`);
  console.log(`  Email: demo@taskrouting.dev`);
  console.log(`  Name: Demo User`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
