# Onboarding

## Overview

The onboarding flow at `/onboarding` guides new users through workspace setup in 6 steps. It pre-configures queues and suggests integrations based on a use-case template.

## Step-by-Step Flow

### Step 0: Welcome + Workspace Name

The user enters a workspace name. This is used to create the workspace with an auto-generated slug.

### Step 1: Use Case Selection

The user picks one of four templates:

| Use Case | Description |
|---|---|
| **Product & Engineering** | Ship features, fix bugs, review PRs with AI agents |
| **Agency Operations** | Coordinate client work across multiple tools and agents |
| **Marketing Operations** | Content creation, campaign management, analytics with AI help |
| **Support Operations** | Triage tickets, automate responses, escalate to humans |

### Step 2: Confirm Setup

The user sees what will be created based on their selection:

- Default queues (see table below)
- Recommended integrations

They can go back to change the use case or proceed to create the workspace.

### Step 3: Connect Integrations

Optional step. The user can connect recommended integrations (GitHub, Slack, Linear, etc.) or skip. Connections can always be added later from settings.

### Step 4: Register First Agent

The user names their first agent (e.g., "CodeBot", "ResearchAgent", "TriageBot"). The agent is created with a broad set of default capabilities: `write_code`, `review_pr`, `research`, `triage`.

### Step 5: Token Display

The agent token is displayed once. The user must copy it. The UI shows:

- The full raw token
- A copy button
- A warning that it will never be shown again
- Connection instructions:

```bash
export MCP_AGENT_TOKEN="tr_..."
npx tsx mcp-server/index.ts
```

After copying, the user proceeds to the dashboard.

## Use Case Templates

### Product & Engineering

| Default Queues | Recommended Integrations |
|---|---|
| Engineering, QA, Research, Design | GitHub, Linear, Slack |

### Agency Operations

| Default Queues | Recommended Integrations |
|---|---|
| Client Work, Internal, Billing, Support | Slack, Notion, Stripe |

### Marketing Operations

| Default Queues | Recommended Integrations |
|---|---|
| Content, Campaigns, Analytics, Social | Slack, Notion, Google Drive |

### Support Operations

| Default Queues | Recommended Integrations |
|---|---|
| Triage, Tier 1, Tier 2, Escalation | Slack, GitHub, Stripe |

## What Gets Created

When the user clicks "Create Workspace" (Step 2), the `POST /api/onboarding/workspace` endpoint:

1. Creates the `Workspace` with a unique slug
2. Creates a `WorkspaceMember` with role `OWNER` for the current user
3. Creates the default `Queue` entries for the selected use case
4. Creates `Capability` entries for standard capabilities

## Agent Setup

When the user creates an agent (Step 4), the `POST /api/onboarding/agent` endpoint:

1. Creates the `Agent` in the workspace with the given name and default capabilities
2. Generates a raw token (48 bytes, base64url)
3. Hashes it with SHA-256 and stores the hash in `AgentToken` with `scopes: ["*"]`
4. Returns the raw token in the response (this is the only time it is available)

## Token Issuance Process

Tokens can also be created after onboarding from the agent management UI.

### Via the Dashboard

1. Navigate to the agent detail page
2. Click "Create Token"
3. Enter a name and select scopes
4. Optionally set an expiration date
5. Click "Create"
6. Copy the displayed token immediately

### Programmatically (Service Layer)

```typescript
import { createToken } from "@/lib/services/agent-token";

const { rawToken, ...tokenRecord } = await createToken(agentId, userId, {
  name: "Production token",
  scopes: ["queues:read", "tasks:read", "tasks:write", "tasks:claim"],
  expiresAt: new Date("2027-01-01"),
});
// rawToken is the only time the plaintext is available
```

### Token Lifecycle

1. **Created** -- status `ACTIVE`, raw token shown once
2. **In use** -- `lastUsedAt` updated on each MCP connection
3. **Revoked** -- manually set to `REVOKED` via dashboard or API; immediately stops working
4. **Expired** -- if `expiresAt` is set and past, the token is rejected at verification time

Revoked and expired tokens remain in the database for audit purposes but are never accepted for authentication.
