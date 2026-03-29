import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uniqueSlug } from "@/lib/crypto";
import { emitEvent } from "@/lib/events";

const useCaseQueues: Record<string, string[]> = {
  ProductEngineering: ["Engineering", "QA", "Research", "Design"],
  AgencyOps: ["Client Work", "Internal", "Billing", "Support"],
  MarketingOps: ["Content", "Campaigns", "Analytics", "Social"],
  SupportOps: ["Triage", "Tier 1", "Tier 2", "Escalation"],
};

const defaultCapabilities: Record<string, string[]> = {
  Engineering: ["write_code", "review_pr"],
  QA: ["qa", "write_code"],
  Research: ["research"],
  Design: ["docs"],
  "Client Work": ["write_code", "research"],
  Internal: ["docs"],
  Billing: ["billing_followup"],
  Support: ["support_response", "triage"],
  Content: ["docs", "research"],
  Campaigns: ["research"],
  Analytics: ["research"],
  Social: ["docs"],
  Triage: ["triage"],
  "Tier 1": ["support_response"],
  "Tier 2": ["support_response", "write_code"],
  Escalation: ["support_response"],
};

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, useCase } = await request.json();
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const slug = uniqueSlug(name);
  const queues = useCaseQueues[useCase] || ["General", "Engineering", "Support"];

  const workspace = await prisma.workspace.create({
    data: {
      name,
      slug,
      members: {
        create: { userId: session.user.id, role: "OWNER" },
      },
      queues: {
        create: queues.map((queueName) => ({
          name: queueName,
          requiredCapabilities: defaultCapabilities[queueName] || [],
        })),
      },
    },
    include: { queues: true },
  });

  // Create default capabilities
  const allCaps = new Set<string>();
  queues.forEach((q) => {
    (defaultCapabilities[q] || []).forEach((c) => allCaps.add(c));
  });
  for (const cap of allCaps) {
    await prisma.capability.create({
      data: { workspaceId: workspace.id, name: cap },
    });
  }

  // Create a default "Incoming" project
  await prisma.project.create({
    data: {
      workspaceId: workspace.id,
      name: "Incoming",
      description: "Tasks from external events and integrations",
    },
  });

  await emitEvent({
    workspaceId: workspace.id,
    eventType: "workspace_created",
    actorType: "USER",
    actorId: session.user.id,
    entityType: "Workspace",
    entityId: workspace.id,
    metadata: { name, useCase },
  });

  return NextResponse.json({ workspaceId: workspace.id, slug: workspace.slug });
}
