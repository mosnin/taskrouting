import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  integrationConnections,
  externalEvents,
  workflowTemplates,
  queues,
  projects,
  tasks,
} from "@/lib/db/schema";
import { getAdapter } from "@/lib/integrations/registry";
import { emitEvent } from "@/lib/events";
import type { IntegrationProvider } from "@/lib/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { randomUUID } from "crypto";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider: providerParam } = await params;
  const provider = providerParam.toUpperCase() as IntegrationProvider;
  const adapter = getAdapter(provider);
  if (!adapter) {
    return NextResponse.json({ error: "Unknown provider" }, { status: 404 });
  }

  const body = await request.text();

  // Find all connections for this provider to check signatures
  const connections = await db
    .select()
    .from(integrationConnections)
    .where(
      and(
        eq(integrationConnections.provider, provider),
        ne(integrationConnections.status, "DISCONNECTED")
      )
    );

  // Try to verify against each connection's webhook secret
  const signature =
    request.headers.get("x-hub-signature-256") || // GitHub
    request.headers.get("x-slack-signature") || // Slack
    request.headers.get("linear-signature") || // Linear
    "";

  let matchedConnection = null;
  for (const conn of connections) {
    if (conn.webhookSecret && adapter.verifyWebhook(body, signature, conn.webhookSecret)) {
      matchedConnection = conn;
      break;
    }
  }

  if (!matchedConnection && connections.length > 0) {
    // If we have connections but none matched, use the first one (dev mode fallback)
    if (process.env.NODE_ENV === "development") {
      matchedConnection = connections[0];
    } else {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  if (!matchedConnection) {
    return NextResponse.json({ error: "No connection found" }, { status: 404 });
  }

  // Parse event type from headers
  const eventType =
    request.headers.get("x-github-event") || // GitHub
    providerParam; // Fallback

  const parsed = JSON.parse(body);

  // Generate idempotency key
  const idempotencyKey = `${provider}:${eventType}:${parsed.id || parsed.event?.ts || randomUUID()}`;

  // Check idempotency
  const [existing] = await db
    .select()
    .from(externalEvents)
    .where(eq(externalEvents.idempotencyKey, idempotencyKey))
    .limit(1);
  if (existing) {
    return NextResponse.json({ status: "duplicate" });
  }

  // Store the event
  const [externalEvent] = await db
    .insert(externalEvents)
    .values({
      workspaceId: matchedConnection.workspaceId,
      provider: providerParam,
      eventType,
      payload: parsed,
      idempotencyKey,
      processingStatus: "PENDING",
    })
    .returning();

  // Emit event
  await emitEvent({
    workspaceId: matchedConnection.workspaceId,
    eventType: "external_event_received",
    actorType: "SYSTEM",
    actorId: provider,
    entityType: "ExternalEvent",
    entityId: externalEvent.id,
    metadata: { provider: providerParam, eventType },
  });

  // Process the event (in a real app this would be a background job)
  try {
    const normalized = adapter.normalizeEvent(eventType, parsed);
    if (normalized) {
      // Find matching workflow templates
      const templates = await db
        .select()
        .from(workflowTemplates)
        .where(
          and(
            eq(workflowTemplates.workspaceId, matchedConnection.workspaceId),
            eq(workflowTemplates.enabled, true)
          )
        );

      for (const template of templates) {
        const trigger = template.trigger as any;
        if (trigger.eventType === normalized.eventType) {
          // Check conditions
          if (trigger.conditions) {
            const conditionsMet = Object.entries(trigger.conditions).every(
              ([key, value]) => normalized.metadata[key] === value
            );
            if (!conditionsMet) continue;
          }

          const action = template.actions as any;
          if (action.type === "create_task") {
            const title = (action.config.titleTemplate || normalized.title || "Untitled")
              .replace("{{title}}", normalized.title || "");

            // Find target queue
            let queueId: string | undefined;
            if (action.config.queueName) {
              const [queue] = await db
                .select()
                .from(queues)
                .where(
                  and(
                    eq(queues.workspaceId, matchedConnection!.workspaceId),
                    eq(queues.name, action.config.queueName)
                  )
                )
                .limit(1);
              queueId = queue?.id;
            }

            // Find or create default project
            let [project] = await db
              .select()
              .from(projects)
              .where(
                and(
                  eq(projects.workspaceId, matchedConnection!.workspaceId),
                  eq(projects.name, "Incoming")
                )
              )
              .limit(1);
            if (!project) {
              [project] = await db
                .insert(projects)
                .values({
                  workspaceId: matchedConnection!.workspaceId,
                  name: "Incoming",
                  description: "Tasks created from external events",
                })
                .returning();
            }

            await db.insert(tasks).values({
              workspaceId: matchedConnection!.workspaceId,
              projectId: project.id,
              title,
              description: normalized.description,
              queueId: queueId || null,
              priority: action.config.priority || "MEDIUM",
              requiredCapabilities: action.config.requiredCapabilities || [],
              sourceProvider: providerParam,
              sourceObjectType: normalized.externalType,
              sourceObjectId: normalized.externalId,
              status: "TODO",
              metadata: normalized.metadata as any,
            });
          }
        }
      }
    }

    await db
      .update(externalEvents)
      .set({ processingStatus: "PROCESSED", processedAt: new Date() })
      .where(eq(externalEvents.id, externalEvent.id));
  } catch (error) {
    await db
      .update(externalEvents)
      .set({
        processingStatus: "FAILED",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      })
      .where(eq(externalEvents.id, externalEvent.id));
  }

  return NextResponse.json({ status: "ok" });
}
