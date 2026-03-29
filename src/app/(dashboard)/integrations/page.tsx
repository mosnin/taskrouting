"use client";

import * as React from "react";
import { Plug, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ProviderCard } from "@/components/integrations/provider-card";
import { useWorkspace } from "@/hooks/use-workspace";
import {
  getWorkspaceIntegrations,
  connectIntegration,
  disconnectIntegration,
} from "@/actions/integration";

const PROVIDER_META: Record<string, { name: string; description: string; icon: string; comingSoon?: boolean }> = {
  GITHUB: { name: "GitHub", description: "Sync issues, PRs, and automate code review workflows.", icon: "github" },
  SLACK: { name: "Slack", description: "Post updates and receive commands from Slack channels.", icon: "slack" },
  LINEAR: { name: "Linear", description: "Import and sync Linear issues with task queues.", icon: "linear" },
  NOTION: { name: "Notion", description: "Connect Notion pages and databases as memory nodes.", icon: "notion" },
  GOOGLE_DRIVE: { name: "Google Drive", description: "Attach and index files from Google Drive.", icon: "google_drive" },
  STRIPE: { name: "Stripe", description: "Monitor payments and trigger billing-related tasks.", icon: "stripe", comingSoon: true },
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

  const connected = integrations.filter((i) => i.connected);
  const available = integrations.filter((i) => !i.connected);

  return (
    <div>
      <PageHeader
        title="Integrations"
        description="Connect your favorite tools and services to supercharge your workspace."
      />

      <div className="px-8 py-6 space-y-8">
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-44 rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-8 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={fetchIntegrations}
            >
              Retry
            </Button>
          </div>
        ) : integrations.length === 0 ? (
          <EmptyState
            icon={Plug}
            title="No integrations available"
            description="Integration providers will appear here."
          />
        ) : (
          <>
            {/* Connected integrations */}
            {connected.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <h2 className="text-sm font-semibold text-foreground">Connected</h2>
                  <span className="text-xs text-muted-foreground">({connected.length})</span>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {connected.map((integration) => {
                    const meta = PROVIDER_META[integration.provider];
                    return (
                      <ProviderCard
                        key={integration.provider}
                        provider={{
                          id: integration.provider,
                          name: meta?.name ?? integration.provider,
                          description: meta?.description ?? "",
                          icon: meta?.icon ?? integration.provider.toLowerCase(),
                          connected: true,
                          status: integration.status,
                        }}
                        onConnect={() => handleConnect(integration.provider)}
                        onDisconnect={() => handleDisconnect(integration.provider)}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Divider */}
            {connected.length > 0 && available.length > 0 && (
              <div className="border-t" />
            )}

            {/* Available integrations */}
            {available.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                  <h2 className="text-sm font-semibold text-foreground">Available</h2>
                  <span className="text-xs text-muted-foreground">({available.length})</span>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {available.map((integration) => {
                    const meta = PROVIDER_META[integration.provider];
                    const isComingSoon = meta?.comingSoon;
                    return (
                      <div key={integration.provider} className="relative">
                        {isComingSoon && (
                          <div className="absolute -top-2 -right-2 z-10">
                            <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-2.5 py-0.5 text-[10px] font-semibold text-white shadow-sm">
                              <Sparkles className="h-3 w-3" />
                              Coming soon
                            </span>
                          </div>
                        )}
                        <ProviderCard
                          provider={{
                            id: integration.provider,
                            name: meta?.name ?? integration.provider,
                            description: meta?.description ?? "",
                            icon: meta?.icon ?? integration.provider.toLowerCase(),
                            connected: false,
                            status: integration.status,
                          }}
                          onConnect={isComingSoon ? undefined : () => handleConnect(integration.provider)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
