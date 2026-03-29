import { prisma } from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/crypto";
import { emitEvent } from "@/lib/events";
import { getAdapter, getAllProviders } from "@/lib/integrations/registry";
import type { IntegrationProvider } from "@prisma/client";

export async function getWorkspaceIntegrations(workspaceId: string) {
  const connections = await prisma.integrationConnection.findMany({
    where: { workspaceId },
  });

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
  await prisma.integrationConnection.upsert({
    where: { workspaceId_provider: { workspaceId, provider } },
    update: { status: "CONNECTING" },
    create: { workspaceId, provider, status: "CONNECTING" },
  });

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

  const connection = await prisma.integrationConnection.update({
    where: { workspaceId_provider: { workspaceId, provider } },
    data: {
      status: "HEALTHY",
      encryptedCredentials: encryptedCreds,
      externalAccountId: result.accountId,
      externalAccountName: result.accountName,
    },
  });

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
    await prisma.workflowTemplate.upsert({
      where: { workspaceId_name: { workspaceId, name: recipe.name } },
      update: {},
      create: {
        workspaceId,
        name: recipe.name,
        description: recipe.description,
        trigger: recipe.trigger as any,
        actions: recipe.action as any,
        enabled: true,
      },
    });
  }

  return connection;
}

export async function disconnectIntegration(
  workspaceId: string,
  provider: IntegrationProvider,
  userId: string
) {
  const connection = await prisma.integrationConnection.update({
    where: { workspaceId_provider: { workspaceId, provider } },
    data: {
      status: "DISCONNECTED",
      encryptedCredentials: null,
      externalAccountId: null,
      externalAccountName: null,
    },
  });

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
  const connection = await prisma.integrationConnection.findUnique({
    where: { workspaceId_provider: { workspaceId, provider } },
  });
  if (!connection?.encryptedCredentials) return null;
  return decrypt(connection.encryptedCredentials);
}
