# Security

## Token Hashing (SHA-256)

Agent tokens are never stored in plaintext.

**Generation:**

```typescript
// 48 random bytes → base64url (64 chars)
const rawToken = randomBytes(48).toString("base64url");
```

**Storage:**

```typescript
// SHA-256 hash → hex (64 chars)
const tokenHash = createHash("sha256").update(rawToken).digest("hex");
// Only tokenHash is written to the database
```

**Verification:**

```typescript
// Hash the presented token and look up the hash
const hash = createHash("sha256").update(rawToken).digest("hex");
const token = await prisma.agentToken.findUnique({ where: { tokenHash: hash } });
```

The raw token is returned to the user exactly once (at creation time). If lost, a new token must be issued.

## Credential Encryption (AES-256-GCM)

Integration credentials (OAuth tokens, API keys) are encrypted at rest using AES-256-GCM.

**Encryption:**

```typescript
const iv = randomBytes(16);
const cipher = createCipheriv("aes-256-gcm", key, iv);
let encrypted = cipher.update(plaintext, "utf8", "hex");
encrypted += cipher.final("hex");
const tag = cipher.getAuthTag();
// Stored as: iv:tag:ciphertext (all hex-encoded)
```

**Decryption:**

```typescript
const [ivHex, tagHex, ciphertext] = stored.split(":");
const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex, "hex"));
decipher.setAuthTag(Buffer.from(tagHex, "hex"));
```

The encryption key is a 32-byte hex string (`ENCRYPTION_KEY` env var, 64 hex characters). It must be kept secret and consistent across deployments.

GCM mode provides both confidentiality and integrity -- if the ciphertext or tag is tampered with, decryption fails.

## Workspace Scoping

All data access is scoped to the authenticated workspace:

- **Users:** Workspace membership is verified via `requireWorkspaceMember(workspaceId)` or `requireWorkspaceRole(workspaceId, roles)` on every server action
- **Agents:** `AgentContext.workspaceId` is derived from the token at authentication time; every MCP tool and resource query includes `where: { workspaceId }`

There is no API endpoint or code path that returns data across workspace boundaries.

## RBAC Roles

User permissions are role-based at the workspace level:

| Role | Permissions |
|---|---|
| `OWNER` | Full control: manage workspace, members, billing, delete workspace |
| `ADMIN` | Manage members, integrations, agents, queues, workflows |
| `MEMBER` | Create/edit tasks, projects, memory; review approvals |
| `VIEWER` | Read-only access to dashboard, tasks, audit log |

Enforced by `requireWorkspaceRole()`:

```typescript
// Only OWNER and ADMIN can manage agents
const { session, member } = await requireWorkspaceRole(workspaceId, ["OWNER", "ADMIN"]);
```

## Agent Token Scopes

Agent tokens carry fine-grained scopes that limit what MCP tools and resources the agent can access:

| Scope | What it unlocks |
|---|---|
| `*` | Everything (supertoken) |
| `queues:read` | List queues, read queue contents |
| `tasks:read` | Read task details, project summaries |
| `tasks:write` | Update task status, add comments |
| `tasks:claim` | Claim tasks from queues |
| `artifacts:write` | Submit artifacts |
| `memory:read` | Search and read memory nodes |
| `memory:write` | Create and update memory nodes |
| `approvals:write` | Request human approval |

Scope checking:

```typescript
function hasScope(ctx: AgentContext, scope: string): boolean {
  return ctx.scopes.includes("*") || ctx.scopes.includes(scope);
}
```

**Best practice:** Issue tokens with the minimum scopes needed. A triage bot only needs `queues:read`, `tasks:read`, `tasks:write`, and `tasks:claim`. A research agent might need `tasks:read`, `memory:read`, and `memory:write`.

## Webhook Signature Verification

Each integration connection stores a `webhookSecret`. When a webhook arrives:

1. The handler reads the signature from the provider-specific header:
   - GitHub: `x-hub-signature-256`
   - Slack: `x-slack-signature`
   - Linear: `linear-signature`
2. It iterates over active connections for that provider
3. Each connection's `webhookSecret` is tested against the adapter's `verifyWebhook()` method
4. GitHub verification uses HMAC-SHA256 with `timingSafeEqual` to prevent timing attacks:

```typescript
verifyWebhook(payload, signature, secret) {
  const expected = `sha256=${createHmac("sha256", secret).update(payload).digest("hex")}`;
  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
```

In development mode, if no signature matches but connections exist, the first connection is used as a fallback. In production, unverified webhooks return `401`.

## Idempotency Keys

External events use idempotency keys to prevent duplicate processing:

```typescript
const idempotencyKey = `${provider}:${eventType}:${externalId}`;
```

The `idempotencyKey` column has a unique index. If a duplicate webhook arrives, it is detected before processing and returns `{ status: "duplicate" }`.

## Best Practices

### Token Management

- Issue tokens with the minimum required scopes
- Set expiration dates on tokens (`expiresAt`)
- Revoke tokens immediately when an agent is decommissioned
- Use descriptive token names (e.g., "CodeBot production token - Jan 2026")
- Never log or expose raw tokens after initial creation

### Encryption Key

- Generate with `openssl rand -hex 32`
- Store in a secrets manager, not in source control
- Rotating the key requires re-encrypting all `IntegrationConnection.encryptedCredentials` rows

### Webhook Security

- Always configure webhook secrets on the provider side
- Verify signatures in production (the dev-mode fallback is intentionally insecure)
- Monitor the `ExternalEvent` table for `FAILED` events that might indicate payload manipulation

### General

- Keep Postgres behind a firewall; the Docker Compose setup binds to `0.0.0.0:5432` which should be changed in production
- Set strong values for `NEXTAUTH_SECRET` and `ENCRYPTION_KEY`
- Use HTTPS in production (set `NEXTAUTH_URL` accordingly)
- Audit the `RunLog` table periodically for unexpected agent behavior
