"use client";

import * as React from "react";
import {
  GitBranch,
  MessageSquare,
  Layers,
  BookOpen,
  HardDrive,
  CreditCard,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const providerIcons: Record<string, React.ElementType> = {
  GITHUB: GitBranch,
  SLACK: MessageSquare,
  LINEAR: Layers,
  NOTION: BookOpen,
  GOOGLE_DRIVE: HardDrive,
  STRIPE: CreditCard,
};

const providerDescriptions: Record<string, string> = {
  GITHUB: "Sync issues, PRs, and automate code review workflows.",
  SLACK: "Post updates and receive commands from Slack channels.",
  LINEAR: "Import and sync Linear issues with task queues.",
  NOTION: "Connect Notion pages and databases as memory nodes.",
  GOOGLE_DRIVE: "Attach and index files from Google Drive.",
  STRIPE: "Monitor payments and trigger billing-related tasks.",
};

const statusConfig: Record<
  string,
  { variant: "default" | "secondary" | "destructive" | "outline"; label: string; dot: string }
> = {
  HEALTHY: { variant: "default", label: "Healthy", dot: "bg-emerald-500" },
  NEEDS_ATTENTION: { variant: "secondary", label: "Needs Attention", dot: "bg-amber-500" },
  CONNECTING: { variant: "secondary", label: "Connecting", dot: "bg-amber-500" },
  AUTHORIZED: { variant: "default", label: "Connected", dot: "bg-emerald-500" },
  PROVISIONED: { variant: "default", label: "Connected", dot: "bg-emerald-500" },
  DISCONNECTED: { variant: "outline", label: "Disconnected", dot: "bg-zinc-400" },
  DISABLED: { variant: "outline", label: "Disabled", dot: "bg-zinc-400" },
};

interface ProviderCardProps {
  provider: string;
  name: string;
  status: string;
  connected: boolean;
  externalAccountName?: string | null;
  connectionId?: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
  loading?: boolean;
}

export function ProviderCard({
  provider,
  name,
  status,
  connected,
  externalAccountName,
  onConnect,
  onDisconnect,
  loading,
}: ProviderCardProps) {
  const Icon = providerIcons[provider] ?? Layers;
  const description = providerDescriptions[provider] ?? "";
  const statusCfg = statusConfig[status] ?? statusConfig.DISCONNECTED;

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <Icon className="h-5 w-5 text-foreground" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">{name}</CardTitle>
              {connected && externalAccountName && (
                <p className="text-xs text-muted-foreground">
                  {externalAccountName}
                </p>
              )}
            </div>
          </div>
          <Badge
            variant={statusCfg.variant}
            className="flex items-center gap-1.5 text-[11px]"
          >
            <div className={cn("h-1.5 w-1.5 rounded-full", statusCfg.dot)} />
            {statusCfg.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{description}</p>
        {connected ? (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={onDisconnect}
            disabled={loading}
          >
            {loading ? "Disconnecting..." : "Disconnect"}
          </Button>
        ) : (
          <Button
            size="sm"
            className="w-full"
            onClick={onConnect}
            disabled={loading}
          >
            {loading ? "Connecting..." : "Connect"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
