"use client";

import * as React from "react";
import { Plug } from "lucide-react";
import { PageHeader } from "@/components/layout/header";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ProviderCard } from "@/components/integrations/provider-card";
import { useWorkspace } from "@/hooks/use-workspace";
import {
  getWorkspaceIntegrations,
  connectIntegration,
  disconnectIntegration,
} from "@/actions/integration";

const PROVIDER_NAMES: Record<string, string> = {
  GITHUB: "GitHub",
  SLACK: "Slack",
  LINEAR: "Linear",
  NOTION: "Notion",
  GOOGLE_DRIVE: "Google Drive",
  STRIPE: "Stripe",
};

export default function IntegrationsPage() {
  const { workspaceId } = useWorkspace();
  const [integrations, setIntegrations] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);

  const fetchIntegrations = React.useCallback(async () => {
    try {
      setLoading(true);
      const result = await getWorkspaceIntegrations(workspaceId);
      setIntegrations(result);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load integrations"
      );
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  React.useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  async function handleConnect(provider: string) {
    setActionLoading(provider);
    try {
      const authUrl = await connectIntegration(workspaceId, provider as any);
      if (authUrl) {
        window.location.href = authUrl;
      }
    } catch {
      // Error handling - could add toast
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDisconnect(provider: string) {
    setActionLoading(provider);
    try {
      await disconnectIntegration(workspaceId, provider as any);
      fetchIntegrations();
    } catch {
      // Error handling
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Integrations"
        description="Connect third-party services to your workspace."
      />

      <div className="px-8 py-6">
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-52 rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <button
              className="mt-3 text-sm text-muted-foreground underline"
              onClick={fetchIntegrations}
            >
              Retry
            </button>
          </div>
        ) : integrations.length === 0 ? (
          <EmptyState
            icon={Plug}
            title="No integrations available"
            description="Integration providers will appear here."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {integrations.map((integration) => (
              <ProviderCard
                key={integration.provider}
                provider={integration.provider}
                name={PROVIDER_NAMES[integration.provider] ?? integration.provider}
                status={integration.status}
                connected={integration.connected}
                externalAccountName={integration.externalAccountName}
                connectionId={integration.connectionId}
                onConnect={() => handleConnect(integration.provider)}
                onDisconnect={() => handleDisconnect(integration.provider)}
                loading={actionLoading === integration.provider}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
