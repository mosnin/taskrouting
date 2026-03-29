# Data Model

## Overview

The database has 26 Prisma models backed by PostgreSQL 16. The schema uses snake_case table names (via `@@map`) and camelCase field names in the application layer.

## Entity Relationships

```
User ──< WorkspaceMember >── Workspace
                                │
             ┌──────────┬───────┼────────┬────────┬──────────┐
             ▼          ▼       ▼        ▼        ▼          ▼
          Project     Queue   Agent   MemoryNode RunLog  IntegrationConnection
             │          │       │        │
             ▼          │       │        │
         TaskSheet      │       │        │
             │          │       │        │
             ▼          ▼       ▼        │
            Task ───────────────────────►│
             │          │       │
        ┌────┼────┬─────┘       │
        ▼    ▼    ▼             ▼
    Subtask Claim Artifact   AgentToken
        Approval
        TaskComment
```

## Key Models

### Workspace

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `name` | String | Display name |
| `slug` | String | Unique, URL-safe identifier |
| `deletedAt` | DateTime? | Soft delete |

The root tenant boundary. Every other domain model references a workspace.

### Project

| Field | Type | Notes |
|---|---|---|
| `workspaceId` | UUID | FK to Workspace |
| `name` | String | |
| `status` | Enum | `ACTIVE`, `PAUSED`, `ARCHIVED`, `COMPLETED` |
| `deletedAt` | DateTime? | Soft delete |

### TaskSheet

| Field | Type | Notes |
|---|---|---|
| `workspaceId` | UUID | Denormalized for fast workspace queries |
| `projectId` | UUID | FK to Project |
| `name` | String | |
| `order` | Int | Sort position within project |
| `deletedAt` | DateTime? | Soft delete |

### Task

| Field | Type | Notes |
|---|---|---|
| `workspaceId` | UUID | FK to Workspace |
| `projectId` | UUID | FK to Project |
| `taskSheetId` | UUID? | Optional FK to TaskSheet |
| `queueId` | UUID? | FK to Queue (nullable; unrouted tasks have no queue) |
| `title` | String | |
| `description` | Text? | |
| `status` | Enum | `BACKLOG`, `TODO`, `IN_PROGRESS`, `IN_REVIEW`, `DONE`, `CANCELLED` |
| `priority` | Enum | `URGENT`, `HIGH`, `MEDIUM`, `LOW` |
| `ownerType` | Enum | `USER`, `AGENT`, `UNASSIGNED` |
| `ownerId` | UUID? | References User or Agent depending on ownerType |
| `requiredCapabilities` | String[] | Capabilities needed to work this task |
| `sourceProvider` | String? | e.g., `"github"` |
| `sourceObjectType` | String? | e.g., `"pull_request"` |
| `sourceObjectId` | String? | External system ID |
| `approvalState` | Enum | `NONE`, `PENDING`, `APPROVED`, `DENIED` |
| `confidence` | Float? | Agent's confidence score |
| `dueAt` | DateTime? | |
| `metadata` | JSON? | Arbitrary structured data |
| `deletedAt` | DateTime? | Soft delete |

### Queue

| Field | Type | Notes |
|---|---|---|
| `workspaceId` | UUID | FK to Workspace |
| `name` | String | Unique within workspace |
| `requiredCapabilities` | String[] | Base capabilities for the queue |
| `deletedAt` | DateTime? | Soft delete |

### Agent

| Field | Type | Notes |
|---|---|---|
| `workspaceId` | UUID | FK to Workspace |
| `name` | String | Unique within workspace |
| `status` | Enum | `ONLINE`, `OFFLINE`, `BUSY`, `ERROR` |
| `capabilities` | String[] | What this agent can do |
| `allowedQueueIds` | String[] | Which queues it can pull from (empty = all) |
| `lastSeenAt` | DateTime? | Updated on heartbeat / token use |
| `deletedAt` | DateTime? | Soft delete |

### AgentToken

| Field | Type | Notes |
|---|---|---|
| `agentId` | UUID | FK to Agent |
| `tokenHash` | String | SHA-256 hash (unique index) |
| `name` | String | Human-readable label |
| `scopes` | String[] | e.g., `["queues:read", "tasks:claim"]` or `["*"]` |
| `status` | Enum | `ACTIVE`, `REVOKED`, `EXPIRED` |
| `lastUsedAt` | DateTime? | |
| `expiresAt` | DateTime? | Optional TTL |

### Claim

| Field | Type | Notes |
|---|---|---|
| `agentId` | UUID | FK to Agent |
| `taskId` | UUID | FK to Task |
| `queueId` | UUID | FK to Queue |
| `status` | Enum | `ACTIVE`, `RELEASED`, `COMPLETED`, `EXPIRED` |
| `claimedAt` | DateTime | |
| `releasedAt` | DateTime? | |

Represents an agent's active lock on a task. Only one `ACTIVE` claim per task at a time.

### MemoryNode

| Field | Type | Notes |
|---|---|---|
| `workspaceId` | UUID | FK to Workspace |
| `projectId` | UUID? | Optional project link |
| `taskId` | UUID? | Optional task link |
| `agentId` | UUID? | Optional agent link |
| `title` | String | |
| `content` | Text | Markdown content |
| `type` | Enum | `DOCUMENT`, `CHECKLIST`, `DECISION`, `SPEC`, `RUNBOOK`, `RESEARCH`, `MEETING_NOTES`, `REFERENCE` |
| `version` | Int | Incremented on update |
| `createdBy` / `updatedBy` | String | User or Agent ID |
| `deletedAt` | DateTime? | Soft delete |

### RunLog

| Field | Type | Notes |
|---|---|---|
| `workspaceId` | UUID | FK to Workspace |
| `eventType` | String | e.g., `task_claimed`, `artifact_submitted` |
| `actorType` | Enum | `USER`, `AGENT`, `SYSTEM` |
| `actorId` | String | |
| `entityType` | String | e.g., `Task`, `Agent`, `MemoryNode` |
| `entityId` | String | |
| `metadata` | JSON? | Event-specific payload |
| `createdAt` | DateTime | Immutable; append-only table |

### IntegrationConnection

| Field | Type | Notes |
|---|---|---|
| `workspaceId` | UUID | FK to Workspace |
| `provider` | Enum | `SLACK`, `GITHUB`, `LINEAR`, `NOTION`, `GOOGLE_DRIVE`, `STRIPE` |
| `status` | Enum | See lifecycle in [integrations.md](integrations.md) |
| `encryptedCredentials` | Text? | AES-256-GCM encrypted JSON |
| `webhookSecret` | String? | For signature verification |
| `externalAccountId` | String? | |
| `externalAccountName` | String? | |

Unique constraint on `(workspaceId, provider)` -- one connection per provider per workspace.

### ExternalEvent

| Field | Type | Notes |
|---|---|---|
| `workspaceId` | UUID | FK to Workspace |
| `provider` | String | |
| `eventType` | String | |
| `payload` | JSON | Raw webhook payload |
| `processingStatus` | Enum | `PENDING`, `PROCESSING`, `PROCESSED`, `FAILED`, `SKIPPED` |
| `idempotencyKey` | String | Unique; prevents duplicate processing |
| `errorMessage` | Text? | |

### ExternalObject

Maps external system objects to internal entities.

| Field | Type | Notes |
|---|---|---|
| `workspaceId` | UUID | FK to Workspace |
| `provider` | String | |
| `externalId` | String | ID in the external system |
| `externalType` | String | e.g., `pull_request`, `issue` |
| `internalType` | String | e.g., `Task` |
| `internalId` | String | UUID of the internal entity |

Unique on `(workspaceId, provider, externalId, externalType)`.

### WorkflowTemplate

| Field | Type | Notes |
|---|---|---|
| `workspaceId` | UUID | FK to Workspace |
| `name` | String | Unique within workspace |
| `trigger` | JSON | `{ eventType, conditions? }` |
| `actions` | JSON | `{ type, config }` |
| `enabled` | Boolean | |
| `deletedAt` | DateTime? | Soft delete |

### Capability

| Field | Type | Notes |
|---|---|---|
| `workspaceId` | UUID | FK to Workspace |
| `name` | String | Unique within workspace |
| `description` | Text? | |

Registry of known capabilities for the workspace.

## Index Strategy

Indexes are designed around the most common query patterns:

| Table | Index | Purpose |
|---|---|---|
| `tasks` | `(workspaceId, status)` | Dashboard: list tasks by status |
| `tasks` | `(workspaceId, projectId, status)` | Project view: tasks in a project |
| `tasks` | `(workspaceId, queueId, status)` | Queue view: claimable tasks |
| `tasks` | `(workspaceId, ownerType, ownerId)` | "My tasks" / agent's tasks |
| `tasks` | `(workspaceId, priority, status)` | Priority-ordered task lists |
| `claims` | `(agentId, status)` | Agent's active claims |
| `claims` | `(taskId, status)` | Check if task is claimed |
| `run_logs` | `(workspaceId, createdAt)` | Audit log timeline |
| `run_logs` | `(workspaceId, entityType, entityId)` | Entity history |
| `run_logs` | `(workspaceId, eventType)` | Filter by event type |
| `external_events` | `(workspaceId, provider, processingStatus)` | Unprocessed event queue |
| `agent_tokens` | `(tokenHash)` unique | Token lookup during auth |
| `agents` | `(workspaceId, status)` | Online agents list |

## Multi-Tenant Scoping

Every table with business data includes `workspaceId`. There is no global query path that crosses workspace boundaries. The pattern is consistent:

```typescript
// Always include workspaceId in where clauses
await prisma.task.findMany({
  where: { workspaceId: ctx.workspaceId, deletedAt: null, ... }
});
```

For agents, `workspaceId` is derived from the token at auth time and carried in `AgentContext`. For users, it comes from the workspace membership lookup.

## Soft Delete Pattern

Models that support deletion use a `deletedAt: DateTime?` field instead of physical deletion. All queries filter `deletedAt: null` to exclude soft-deleted rows.

Affected models: `Workspace`, `Project`, `TaskSheet`, `Task`, `Queue`, `Agent`, `MemoryNode`, `WorkflowTemplate`.

Models that are truly deleted (cascade): `Subtask`, `TaskComment`, `Claim`, `Artifact`, `Approval`, `RunLog`.

## Token Hashing

Agent tokens follow a one-way hash pattern:

1. Generate 48 random bytes, encode as base64url
2. Hash with SHA-256 to produce a hex digest
3. Store the hash in `agent_tokens.token_hash`
4. Return the raw token to the user exactly once
5. On subsequent requests, hash the presented token and look up the hash

This means a database breach does not expose usable tokens.
