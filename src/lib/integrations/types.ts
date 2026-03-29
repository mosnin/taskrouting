import type { IntegrationProvider, IntegrationStatus } from "@prisma/client";

/** The lifecycle of an integration connection */
export type ConnectionLifecycle =
  | "DISCONNECTED"
  | "CONNECTING"
  | "AUTHORIZED"
  | "PROVISIONED"
  | "HEALTHY"
  | "NEEDS_ATTENTION"
  | "DISABLED";

/** A normalized event from an external system */
export interface NormalizedEvent {
  provider: IntegrationProvider;
  eventType: string;
  externalId: string;
  externalType: string;
  title?: string;
  description?: string;
  url?: string;
  metadata: Record<string, unknown>;
  raw: unknown;
}

/** Actions a provider adapter can perform */
export interface WritebackAction {
  type: string;
  payload: Record<string, unknown>;
}

/** Default recipe definition */
export interface DefaultRecipe {
  name: string;
  description: string;
  trigger: {
    eventType: string;
    conditions?: Record<string, unknown>;
  };
  action: {
    type: "create_task" | "update_task" | "route_to_queue";
    config: Record<string, unknown>;
  };
}

/** Provider adapter interface — all integrations implement this */
export interface ProviderAdapter {
  provider: IntegrationProvider;
  displayName: string;
  description: string;
  icon: string;

  /** Get the OAuth authorization URL */
  getAuthUrl(workspaceId: string, redirectUrl: string): string;

  /** Exchange OAuth code for credentials */
  handleCallback(
    workspaceId: string,
    code: string
  ): Promise<{
    credentials: string; // JSON string to encrypt
    accountId?: string;
    accountName?: string;
  }>;

  /** Verify a webhook signature */
  verifyWebhook(
    payload: string | Buffer,
    signature: string,
    secret: string
  ): boolean;

  /** Normalize an incoming webhook event */
  normalizeEvent(eventType: string, payload: unknown): NormalizedEvent | null;

  /** Execute a writeback action */
  writeback(
    credentials: string,
    action: WritebackAction
  ): Promise<{ success: boolean; error?: string }>;

  /** Check if the connection is still healthy */
  healthCheck(credentials: string): Promise<boolean>;

  /** Get default recipes for this provider */
  getDefaultRecipes(): DefaultRecipe[];
}

/** Provider metadata for UI */
export interface ProviderInfo {
  provider: IntegrationProvider;
  displayName: string;
  description: string;
  icon: string;
  status?: IntegrationStatus;
  connected?: boolean;
}
