"use server";

import { revalidatePath } from "next/cache";
import { requireWorkspaceRole } from "@/lib/auth";
import * as integrationService from "@/lib/services/integration";
import type { IntegrationProvider } from "@prisma/client";

export async function getWorkspaceIntegrations(workspaceId: string) {
  await requireWorkspaceRole(workspaceId, ["OWNER", "ADMIN", "MEMBER", "VIEWER"]);
  return integrationService.getWorkspaceIntegrations(workspaceId);
}

export async function connectIntegration(
  workspaceId: string,
  provider: IntegrationProvider
) {
  await requireWorkspaceRole(workspaceId, ["OWNER", "ADMIN"]);
  const redirectUrl = `${process.env.NEXTAUTH_URL}/api/integrations/${provider.toLowerCase()}/callback`;
  return integrationService.initiateConnection(workspaceId, provider, redirectUrl);
}

export async function disconnectIntegration(
  workspaceId: string,
  provider: IntegrationProvider
) {
  const { session } = await requireWorkspaceRole(workspaceId, ["OWNER", "ADMIN"]);
  await integrationService.disconnectIntegration(workspaceId, provider, session.user.id);
  revalidatePath("/integrations");
}
