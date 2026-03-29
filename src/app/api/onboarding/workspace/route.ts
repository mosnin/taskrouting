import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { workspaces, workspaceMembers, queues, capabilities, projects } from "@/lib/db/schema";
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
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, useCase } = await request.json();
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const slug = uniqueSlug(name);
  const queueNames = useCaseQueues[useCase] || ["General", "Engineering", "Support"];

  // Create workspace
  const [workspace] = await db.insert(workspaces).values({ name, slug }).returning();

  // Create membership
  await db.insert(workspaceMembers).values({
    workspaceId: workspace.id,
    userId: user.id,
    role: "OWNER",
  });

  // Create queues
  const createdQueues = await db
    .insert(queues)
    .values(
      queueNames.map((queueName) => ({
        workspaceId: workspace.id,
        name: queueName,
        requiredCapabilities: defaultCapabilities[queueName] || [],
      }))
    )
    .returning();

  // Create default capabilities
  const allCaps = new Set<string>();
  queueNames.forEach((q) => {
    (defaultCapabilities[q] || []).forEach((c) => allCaps.add(c));
  });
  if (allCaps.size > 0) {
    await db.insert(capabilities).values(
      Array.from(allCaps).map((cap) => ({
        workspaceId: workspace.id,
        name: cap,
      }))
    );
  }

  // Create a default "Incoming" project
  await db.insert(projects).values({
    workspaceId: workspace.id,
    name: "Incoming",
    description: "Tasks from external events and integrations",
  });

  await emitEvent({
    workspaceId: workspace.id,
    eventType: "workspace_created",
    actorType: "USER",
    actorId: user.id,
    entityType: "Workspace",
    entityId: workspace.id,
    metadata: { name, useCase },
  });

  return NextResponse.json({ workspaceId: workspace.id, slug: workspace.slug });
}
