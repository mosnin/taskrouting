import type { IntegrationProvider } from "@prisma/client";
import type { ProviderAdapter, ProviderInfo } from "./types";
import { githubAdapter } from "./github";
import { slackAdapter } from "./slack";
import { linearAdapter } from "./linear";

const adapters = new Map<IntegrationProvider, ProviderAdapter>();

// Register adapters
adapters.set("GITHUB", githubAdapter);
adapters.set("SLACK", slackAdapter);
adapters.set("LINEAR", linearAdapter);

export function getAdapter(provider: IntegrationProvider): ProviderAdapter | undefined {
  return adapters.get(provider);
}

export function getAllProviders(): ProviderInfo[] {
  return [
    {
      provider: "GITHUB",
      displayName: "GitHub",
      description: "Sync issues, PRs, and code reviews",
      icon: "github",
    },
    {
      provider: "SLACK",
      displayName: "Slack",
      description: "Route messages and mentions to tasks",
      icon: "slack",
    },
    {
      provider: "LINEAR",
      displayName: "Linear",
      description: "Sync issues and project tracking",
      icon: "linear",
    },
    {
      provider: "NOTION",
      displayName: "Notion",
      description: "Sync pages and databases",
      icon: "notebook",
    },
    {
      provider: "GOOGLE_DRIVE",
      displayName: "Google Drive",
      description: "Link documents and files",
      icon: "file",
    },
    {
      provider: "STRIPE",
      displayName: "Stripe",
      description: "Route billing events to tasks",
      icon: "credit-card",
    },
  ];
}
