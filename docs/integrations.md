# Integrations

## Overview

TaskRouting connects to external systems through a provider adapter interface. Each provider (GitHub, Slack, Linear, etc.) implements the same interface, making it straightforward to add new integrations.

Currently implemented adapters: **GitHub**, **Slack**, **Linear**. Registered but not yet implemented: Notion, Google Drive, Stripe.

## Provider Adapter Interface

Every adapter implements `ProviderAdapter` from `src/lib/integrations/types.ts`:

```typescript
interface ProviderAdapter {
  provider: IntegrationProvider;
  displayName: string;
  description: string;
  icon: string;

  getAuthUrl(workspaceId: string, redirectUrl: string): string;
  handleCallback(workspaceId: string, code: string): Promise<{
    credentials: string;     // JSON to encrypt and store
    accountId?: string;
    accountName?: string;
  }>;
  verifyWebhook(payload: string | Buffer, signature: string, secret: string): boolean;
  normalizeEvent(eventType: string, payload: unknown): NormalizedEvent | null;
  writeback(credentials: string, action: WritebackAction): Promise<{ success: boolean; error?: string }>;
  healthCheck(credentials: string): Promise<boolean>;
  getDefaultRecipes(): DefaultRecipe[];
}
```

## Connection Lifecycle

Integration connections move through these states:

```
DISCONNECTED → CONNECTING → AUTHORIZED → PROVISIONED → HEALTHY
                                                          ↓
                                                   NEEDS_ATTENTION
                                                          ↓
                                                       DISABLED
```

| State | Meaning |
|---|---|
| `DISCONNECTED` | No connection attempt made |
| `CONNECTING` | OAuth flow started |
| `AUTHORIZED` | OAuth tokens received and stored |
| `PROVISIONED` | Webhooks configured, ready to receive events |
| `HEALTHY` | Passing health checks |
| `NEEDS_ATTENTION` | Health check failing or token expired |
| `DISABLED` | Manually disabled by user |

## OAuth Flow

1. User clicks "Connect" on the integrations page
2. App calls `adapter.getAuthUrl(workspaceId, redirectUrl)` and redirects to the provider
3. Provider redirects back with an authorization `code`
4. App calls `adapter.handleCallback(workspaceId, code)` which exchanges the code for tokens
5. Returned credentials are encrypted with AES-256-GCM (`src/lib/crypto.ts`) and stored in `IntegrationConnection.encryptedCredentials`
6. Connection status moves to `AUTHORIZED`

## Webhook Handling

Webhooks are received at `POST /api/webhooks/:provider`. The handler:

1. **Looks up connections** for the provider that are not `DISCONNECTED`
2. **Verifies the signature** by trying each connection's `webhookSecret` against the adapter's `verifyWebhook()` method
3. **Parses the event type** from provider-specific headers:
   - GitHub: `x-hub-signature-256` header for HMAC, `x-github-event` header for event type
   - Slack: `x-slack-signature` header
   - Linear: `linear-signature` header
4. **Generates an idempotency key** from `provider:eventType:externalId`
5. **Deduplicates** against the `ExternalEvent` table
6. **Stores** the raw event as `ExternalEvent` (status: `PENDING`)
7. **Emits** an `external_event_received` domain event
8. **Processes** the event inline (normalizes, matches workflow templates, creates/routes tasks)
9. **Updates** the `ExternalEvent` status to `PROCESSED` or `FAILED`

## Event Normalization

Each adapter's `normalizeEvent()` method transforms provider-specific payloads into a `NormalizedEvent`:

```typescript
interface NormalizedEvent {
  provider: IntegrationProvider;
  eventType: string;          // e.g., "pr_opened", "issue_opened"
  externalId: string;
  externalType: string;       // e.g., "pull_request", "issue"
  title?: string;
  description?: string;
  url?: string;
  metadata: Record<string, unknown>;
  raw: unknown;
}
```

### GitHub Normalized Events

| Webhook event | `normalizeEvent` output |
|---|---|
| `pull_request` (action: `opened`) | `eventType: "pr_opened"`, metadata: `{ number, repo, author, base, head }` |
| `issues` (action: `opened`) | `eventType: "issue_opened"`, metadata: `{ number, repo, labels, author }` |
| `issues` (action: `labeled`) | `eventType: "issue_labeled"`, metadata: `{ number, repo, label, labels }` |

Events that don't match a known pattern return `null` and are skipped.

## Writeback Actions

Adapters can write back to external systems. The `writeback()` method accepts a `WritebackAction`:

```typescript
interface WritebackAction {
  type: string;
  payload: Record<string, unknown>;
}
```

### GitHub Writeback Actions

| Action type | Payload |
|---|---|
| `add_comment` | `{ owner, repo, issueNumber, body }` |
| `update_issue` | `{ owner, repo, issueNumber, ...fields }` |

## Default Recipes

Each adapter provides default `WorkflowTemplate` configurations via `getDefaultRecipes()`. These are offered during onboarding and can be customized later.

### GitHub Default Recipes

| Recipe | Trigger | Action |
|---|---|---|
| PR opened -> Review task | `pr_opened` | Create task in Engineering queue, caps: `review_pr`, priority: HIGH |
| Bug issue -> Bug queue | `issue_labeled` (label: `bug`) | Route to Engineering queue, caps: `write_code`, priority: HIGH |
| New issue -> Triage | `issue_opened` | Create triage task in Engineering queue, caps: `triage`, priority: MEDIUM |

## Adding a New Provider

To add a new integration (e.g., Jira):

### 1. Create the adapter file

```
src/lib/integrations/jira.ts
```

Implement the `ProviderAdapter` interface:

```typescript
import type { ProviderAdapter } from "./types";

export const jiraAdapter: ProviderAdapter = {
  provider: "JIRA",  // Must match enum
  displayName: "Jira",
  description: "Sync issues and epics",
  icon: "ticket",

  getAuthUrl(workspaceId, redirectUrl) { /* ... */ },
  async handleCallback(workspaceId, code) { /* ... */ },
  verifyWebhook(payload, signature, secret) { /* ... */ },
  normalizeEvent(eventType, payload) { /* ... */ },
  async writeback(credentials, action) { /* ... */ },
  async healthCheck(credentials) { /* ... */ },
  getDefaultRecipes() { return []; },
};
```

### 2. Add the provider to the Prisma enum

In `prisma/schema.prisma`:

```prisma
enum IntegrationProvider {
  SLACK
  GITHUB
  LINEAR
  NOTION
  GOOGLE_DRIVE
  STRIPE
  JIRA        // Add here
}
```

Run `pnpm db:migrate` to generate a migration.

### 3. Register the adapter

In `src/lib/integrations/registry.ts`:

```typescript
import { jiraAdapter } from "./jira";
adapters.set("JIRA", jiraAdapter);
```

Add the provider info to `getAllProviders()`.

### 4. Add environment variables

Add any required env vars to `.env.example`:

```
JIRA_CLIENT_ID=""
JIRA_CLIENT_SECRET=""
JIRA_WEBHOOK_SECRET=""
```

### 5. Test

- OAuth flow: Connect from the integrations page
- Webhooks: `curl -X POST http://localhost:3000/api/webhooks/jira -d '...'`
- Writeback: Verify the adapter can post back to Jira
