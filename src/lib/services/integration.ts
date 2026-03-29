import { db } from "@/lib/db";
import { integrationConnections, workflowTemplates } from "@/lib/db/schema";
import type { IntegrationProvider } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { encrypt, decrypt } from "@/lib/crypto";
import { emitEvent } from "@/lib/events";
import { getAdapter, getAllProviders } from "@/lib/integrations/registry";

export async function getWorkspaceIntegrations(workspaceId: string) {
  const connections = await db
    .select()
    .from(integrationConnections)
    .where(eq(integrationConnections.workspaceId, workspaceId));

  const providers = getAllProviders();
  return providers.map((p) => {
    const conn = connections.find((c) => c.provider === p.provider);
    return {
      ...p,
      status: conn?.status || "DISCONNECTED",
      connected: conn ? conn.status !== "DISCONNECTED" : false,
      connectionId: conn?.id,
      externalAccountName: conn?.externalAccountName,
    };
  });
}

export async function initiateConnection(
  workspaceId: string,
  provider: IntegrationProvider,
  redirectUrl: string
) {
  const adapter = getAdapter(provider);
  if (!adapter) throw new Error(`Unknown provider: ${provider}`);

  // Upsert connection record
  const [existing] = await db
    .select()
    .from(integrationConnections)
    .where(
      and(
        eq(integrationConnections.workspaceId, workspaceId),
        eq(integrationConnections.provider, provider)
      )
    )
    .limit(1);

  if (existing) {
    await db
      .update(integrationConnections)
      .set({ status: "CONNECTING", updatedAt: new Date() })
      .where(eq(integrationConnections.id, existing.id));
  } else {
    await db
      .insert(integrationConnections)
      .values({ workspaceId, provider, status: "CONNECTING" });
  }

  return adapter.getAuthUrl(workspaceId, redirectUrl);
}

export async function completeConnection(
  workspaceId: string,
  provider: IntegrationProvider,
  code: string,
  userId: string
) {
  const adapter = getAdapter(provider);
  if (!adapter) throw new Error(`Unknown provider: ${provider}`);

  const result = await adapter.handleCallback(workspaceId, code);

  const encryptedCreds = encrypt(result.credentials);

  const [connection] = await db
    .update(integrationConnections)
    .set({
      status: "HEALTHY",
      encryptedCredentials: encryptedCreds,
      externalAccountId: result.accountId,
      externalAccountName: result.accountName,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(integrationConnections.workspaceId, workspaceId),
        eq(integrationConnections.provider, provider)
      )
    )
    .returning();

  await emitEvent({
    workspaceId,
    eventType: "integration_connected",
    actorType: "USER",
    actorId: userId,
    entityType: "IntegrationConnection",
    entityId: connection.id,
    metadata: { provider, accountName: result.accountName },
  });

  // Create default workflow templates
  const recipes = adapter.getDefaultRecipes();
  for (const recipe of recipes) {
    // Upsert workflow template
    const [existingTemplate] = await db
      .select()
      .from(workflowTemplates)
      .where(
        and(
          eq(workflowTemplates.workspaceId, workspaceId),
          eq(workflowTemplates.name, recipe.name)
        )
      )
      .limit(1);

    if (!existingTemplate) {
      await db.insert(workflowTemplates).values({
        workspaceId,
        name: recipe.name,
        description: recipe.description,
        trigger: recipe.trigger as any,
        actions: recipe.action as any,
        enabled: true,
      });
    }
  }

  return connection;
}

export async function disconnectIntegration(
  workspaceId: string,
  provider: IntegrationProvider,
  userId: string
) {
  const [connection] = await db
    .update(integrationConnections)
    .set({
      status: "DISCONNECTED",
      encryptedCredentials: null,
      externalAccountId: null,
      externalAccountName: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(integrationConnections.workspaceId, workspaceId),
        eq(integrationConnections.provider, provider)
      )
    )
    .returning();
  if (!connection) throw new Error("Integration connection not found");

  await emitEvent({
    workspaceId,
    eventType: "integration_disconnected",
    actorType: "USER",
    actorId: userId,
    entityType: "IntegrationConnection",
    entityId: connection.id,
    metadata: { provider },
  });

  return connection;
}

export async function getDecryptedCredentials(
  workspaceId: string,
  provider: IntegrationProvider
): Promise<string | null> {
  const [connection] = await db
    .select()
    .from(integrationConnections)
    .where(
      and(
        eq(integrationConnections.workspaceId, workspaceId),
        eq(integrationConnections.provider, provider)
      )
    )
    .limit(1);
  if (!connection?.encryptedCredentials) return null;
  return decrypt(connection.encryptedCredentials);
}
