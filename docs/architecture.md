# Architecture

## System Diagram

```
                    ┌──────────────┐
                    │   Browser    │
                    │  (Dashboard) │
                    └──────┬───────┘
                           │ HTTPS
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                   Next.js App (Port 3000)                    │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                    App Router                          │  │
│  │  /api/auth/*           NextAuth handlers               │  │
│  │  /api/webhooks/:prov   Webhook ingestion               │  │
│  │  /api/events           SSE stream                      │  │
│  │  /api/onboarding/*     Workspace + agent setup         │  │
│  │  /(dashboard)          React Server Components         │  │
│  │  /onboarding           Guided setup wizard             │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │   Actions    │  │   Services   │  │  Integrations    │   │
│  │ (server fns) │──│ (biz logic)  │──│  (adapters)      │   │
│  └──────────────┘  └──────┬───────┘  └──────────────────┘   │
│                           │                                  │
│  ┌────────────────────────┴──────────────────────────────┐   │
│  │            Event Bus (emitEvent / subscribe)          │   │
│  └────────────────────────┬──────────────────────────────┘   │
│                           │                                  │
│  ┌────────────────────────┴──────────────────────────────┐   │
│  │                  Prisma Client                        │   │
│  └────────────────────────┬──────────────────────────────┘   │
└───────────────────────────┼──────────────────────────────────┘
                            │
                   ┌────────▼────────┐
                   │  PostgreSQL 16  │
                   └────────┬────────┘
                            │
┌───────────────────────────┼──────────────────────────────────┐
│                  MCP Server (separate process, stdio)        │
│                                                              │
│  Token verification → AgentContext → Tools / Resources       │
│  Shares the same Prisma schema + DB                          │
└──────────────────────────────────────────────────────────────┘
```

## Component Overview

### Next.js App

The primary application. Runs the dashboard UI (React Server Components), all API routes, server actions, and the SSE event endpoint. Uses Turbopack in development.

### MCP Server

A standalone Node.js process (`mcp-server/index.ts`) that agents spawn as a subprocess. Communicates over stdio using the Model Context Protocol SDK. Authenticates agents via token hash lookup, then exposes tools and resources scoped to the agent's workspace and permissions.

The MCP server shares the same Prisma schema and database as the Next.js app. It has its own `package.json` with a dependency on `@modelcontextprotocol/sdk` and `@prisma/client`.

### Prisma ORM

Single schema at `prisma/schema.prisma` with 26 models. Handles migrations, type generation, and all database access. Full-text search via the `fullTextSearchPostgres` preview feature.

### PostgreSQL

Postgres 16 (Alpine) via Docker Compose. Single database, single schema. Multi-tenancy is logical (workspace ID on every table), not physical.

## Data Flow: External Event to Completion

```
External System (e.g., GitHub)
  │
  │  POST /api/webhooks/github
  ▼
┌─────────────────────────────┐
│ 1. Verify webhook signature │  (adapter.verifyWebhook)
│ 2. Parse event type         │  (x-github-event header)
│ 3. Generate idempotency key │  (provider:eventType:externalId)
│ 4. Deduplicate              │  (check ExternalEvent table)
│ 5. Store ExternalEvent      │  (status: PENDING)
│ 6. Emit domain event        │  (external_event_received)
└──────────────┬──────────────┘
               ▼
┌─────────────────────────────┐
│ 7. Normalize event          │  (adapter.normalizeEvent → NormalizedEvent)
│ 8. Match WorkflowTemplates  │  (eventType + conditions)
│ 9. Execute action           │  (create_task / route_to_queue)
│10. Update ExternalEvent     │  (status: PROCESSED)
└──────────────┬──────────────┘
               ▼
┌─────────────────────────────┐
│ Task sits in Queue          │
│  ↕                          │
│ Agent calls claim_task      │  (MCP tool)
│ Agent executes work         │
│ Agent submits artifacts     │
│ Agent requests approval     │  (optional)
│ Agent marks task DONE       │
│ Claim released              │
│ RunLog entry created        │
└─────────────────────────────┘
```

## Auth Architecture

### User Auth (NextAuth)

- **Strategy:** JWT sessions (no server-side session store)
- **Providers:** GitHub OAuth (production), Credentials (development only)
- **Adapter:** Prisma adapter for Account/Session/User storage
- **Flow:** Sign in -> JWT issued -> session callback injects `user.id` -> workspace membership checked on every protected action via `requireWorkspaceMember()`

### Agent Auth (Token-based)

- **Token format:** 48 random bytes, base64url-encoded
- **Storage:** SHA-256 hash stored in `agent_tokens` table; raw token never persisted
- **Verification:** Agent passes raw token via `MCP_AGENT_TOKEN` env var. MCP server hashes it, looks up the `AgentToken` row, checks status and expiry, and builds an `AgentContext` with `agentId`, `workspaceId`, `scopes`, `capabilities`, and `allowedQueueIds`.
- **Scope enforcement:** Every tool call checks `hasScope(ctx, "scope:name")` before executing

### RBAC

Users have workspace-level roles: `OWNER`, `ADMIN`, `MEMBER`, `VIEWER`. The `requireWorkspaceRole()` helper enforces minimum role on sensitive actions.

## Event Bus Pattern

The event system (`src/lib/events.ts`) serves two purposes:

1. **Audit logging** -- every `emitEvent()` call writes a `RunLog` row
2. **Realtime updates** -- in-process pub/sub notifies SSE subscribers

```typescript
// Emit
await emitEvent({
  workspaceId, eventType: "task_claimed",
  actorType: "AGENT", actorId: agentId,
  entityType: "Task", entityId: taskId,
  metadata: { queueId },
});

// Subscribe (SSE endpoint)
const unsubscribe = subscribe(workspaceId, (event) => {
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
});
```

The subscriber map is `Map<workspaceId, Set<Subscriber>>`. When a client disconnects (abort signal), the subscriber is removed.

This is deliberately simple -- an in-process Map with no external broker. For horizontal scaling, replace the Map with Redis pub/sub or a message queue.

## Multi-Tenancy

Every data table (except NextAuth's `accounts`/`sessions`/`verification_tokens`) includes a `workspaceId` foreign key. All queries filter by workspace:

```typescript
// Service layer pattern
const tasks = await prisma.task.findMany({
  where: { workspaceId, status: "TODO", deletedAt: null },
});
```

Agents are workspace-scoped by their token: the `AgentContext` carries `workspaceId` and all tool/resource operations use it as a filter.

There is no cross-workspace access path. Workspace isolation is enforced at the query level, not at the database level (no row-level security).

## Realtime Updates via SSE

The `/api/events` endpoint opens a Server-Sent Events stream:

1. Client sends `GET /api/events?workspaceId=xxx` with session cookie
2. Server verifies session and workspace membership
3. Server calls `subscribe(workspaceId, callback)` and pipes events to the stream
4. Client receives events as `data: {...}\n\n` lines
5. On disconnect (abort signal), the subscription is cleaned up

The `useEventStream` client hook wraps `EventSource` for React components.
