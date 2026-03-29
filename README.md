# TaskRouting

TaskRouting is a fully managed SaaS control plane for multi-agent work coordination. It gives teams a single place to define work, route it to the right agent (or human), track execution, and audit everything that happens.

## Key Features

- **Queue-based task routing** -- assign work to agents based on capabilities, not just availability
- **MCP server** -- agents connect via the Model Context Protocol over stdio; no custom SDK needed
- **Integration framework** -- GitHub, Slack, Linear adapters with webhook ingestion and writeback
- **Shared memory** -- agents read and write structured knowledge that persists across runs
- **Human-in-the-loop approvals** -- agents can request approval before proceeding
- **Realtime event stream** -- SSE-based updates for the dashboard; every mutation produces an audit log
- **Multi-tenant by design** -- workspace-scoped data isolation with RBAC for users and scoped tokens for agents
- **Onboarding wizard** -- use-case templates that pre-configure queues, integrations, and default workflows

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 10+
- Docker (for Postgres)

### Setup

```bash
# Clone and install
git clone <repo-url> && cd taskrouting
pnpm install

# Copy environment variables
cp .env.example .env
# Edit .env — at minimum set NEXTAUTH_SECRET and ENCRYPTION_KEY:
#   openssl rand -base64 32   → NEXTAUTH_SECRET
#   openssl rand -hex 32      → ENCRYPTION_KEY
```

### Environment Variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `NEXTAUTH_SECRET` | Session signing key |
| `NEXTAUTH_URL` | App base URL (`http://localhost:3000`) |
| `ENCRYPTION_KEY` | 32-byte hex key for AES-256-GCM credential encryption |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub OAuth (user sign-in) |
| `GITHUB_APP_ID` / `GITHUB_APP_PRIVATE_KEY` / `GITHUB_APP_WEBHOOK_SECRET` | GitHub integration |
| `SLACK_CLIENT_ID` / `SLACK_CLIENT_SECRET` / `SLACK_SIGNING_SECRET` | Slack integration |
| `LINEAR_CLIENT_ID` / `LINEAR_CLIENT_SECRET` / `LINEAR_WEBHOOK_SECRET` | Linear integration |
| `MCP_SERVER_PORT` | MCP server port (default 3001) |

### Run

```bash
# Start Postgres
docker-compose up -d

# Run migrations and seed
pnpm db:migrate
pnpm db:seed

# Start the dev server
pnpm dev
```

The app is at `http://localhost:3000`. Sign in with the dev credentials printed by the seed script.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        External Systems                         │
│              GitHub · Slack · Linear · Webhooks                  │
└──────────────────────────┬──────────────────────────────────────┘
                           │ webhooks
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Next.js App (Port 3000)                     │
│  ┌──────────┐  ┌──────────────┐  ┌───────────┐  ┌───────────┐  │
│  │ Dashboard │  │ Webhook API  │  │ SSE /api/  │  │ Auth      │  │
│  │   (RSC)   │  │ /api/webhooks│  │   events   │  │ NextAuth  │  │
│  └──────────┘  └──────┬───────┘  └─────┬─────┘  └───────────┘  │
│                       │                │                        │
│  ┌────────────────────┴────────────────┴──────────────────────┐ │
│  │              Event Bus (in-process pub/sub)                │ │
│  └────────────────────────────┬───────────────────────────────┘ │
│                               │                                 │
│  ┌────────────────────────────┴───────────────────────────────┐ │
│  │                   Prisma ORM / Services                    │ │
│  └────────────────────────────┬───────────────────────────────┘ │
└───────────────────────────────┼─────────────────────────────────┘
                                │
                                ▼
                     ┌─────────────────┐
                     │   PostgreSQL 16  │
                     └────────┬────────┘
                              │
┌─────────────────────────────┼─────────────────────────────────┐
│                  MCP Server (stdio)                            │
│  ┌────────┐  ┌───────┐  ┌───────────┐  ┌──────────────────┐  │
│  │ Auth   │  │ Tools │  │ Resources │  │ Prisma (shared)  │  │
│  └────────┘  └───────┘  └───────────┘  └──────────────────┘  │
└───────────────────────────────────────────────────────────────┘
        ▲                          ▲
        │         stdio            │
   ┌────┴────┐               ┌─────┴─────┐
   │ Agent 1 │  · · ·        │  Agent N  │
   └─────────┘               └───────────┘
```

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript 6 |
| ORM | Prisma 7 |
| Database | PostgreSQL 16 |
| Auth | NextAuth 4 (JWT sessions, GitHub OAuth) |
| UI | React 19, Radix UI, Tailwind CSS 4 |
| Agent protocol | Model Context Protocol (MCP) via `@modelcontextprotocol/sdk` |
| Validation | Zod 4 |
| Package manager | pnpm 10 |

## Project Structure

```
taskrouting/
├── prisma/
│   ├── schema.prisma          # Database schema (26 models)
│   └── seed.ts                # Demo data seeder
├── src/
│   ├── app/                   # Next.js App Router pages & API routes
│   │   ├── api/
│   │   │   ├── auth/          # NextAuth route handler
│   │   │   ├── events/        # SSE endpoint
│   │   │   ├── webhooks/      # Provider webhook ingestion
│   │   │   └── onboarding/    # Workspace + agent setup
│   │   ├── (auth)/            # Sign-in / sign-up pages
│   │   ├── (dashboard)/       # Main dashboard
│   │   └── onboarding/        # Onboarding wizard
│   ├── actions/               # Server actions (task, queue, agent, etc.)
│   ├── components/            # React components (UI, layout, domain)
│   ├── hooks/                 # Client hooks (useEventStream, useWorkspace)
│   ├── lib/
│   │   ├── services/          # Business logic layer
│   │   ├── integrations/      # Provider adapters (GitHub, Slack, Linear)
│   │   ├── validations/       # Zod schemas
│   │   ├── auth.ts            # NextAuth config + RBAC helpers
│   │   ├── crypto.ts          # Token hashing, AES encryption
│   │   ├── events.ts          # Event bus + SSE pub/sub
│   │   └── prisma.ts          # Shared Prisma client
│   └── types/                 # Shared TypeScript types
├── mcp-server/                # Standalone MCP server for agents
│   ├── index.ts               # Entry point (stdio transport)
│   ├── auth.ts                # Token verification + agent context
│   ├── tools.ts               # 10 MCP tools
│   └── resources.ts           # 6 MCP resources
├── agent-client/              # Sample agent client
│   └── index.ts               # End-to-end demo agent
├── docker-compose.yml         # Postgres 16
└── docs/                      # Documentation
```

## MCP Server

Agents connect to TaskRouting by running the MCP server as a subprocess and communicating over stdio:

```bash
MCP_AGENT_TOKEN=<token> npx tsx mcp-server/index.ts
```

The server exposes 10 tools (`list_available_queues`, `claim_task`, `update_task_status`, etc.) and 6 resources (`taskrouting://queues`, `taskrouting://task/{id}`, etc.). See [docs/mcp.md](docs/mcp.md) for the full reference.

## Documentation

- [Product Overview](docs/product_overview.md) -- what TaskRouting is, key concepts, target users
- [Architecture](docs/architecture.md) -- system design, data flow, auth, event bus
- [Data Model](docs/data_model.md) -- schema reference, indexes, multi-tenancy
- [Integrations](docs/integrations.md) -- provider adapter interface, webhooks, writeback
- [MCP Server](docs/mcp.md) -- tools, resources, token scopes, sample agent
- [Security](docs/security.md) -- token hashing, encryption, RBAC, webhook verification
- [Onboarding](docs/onboarding.md) -- setup wizard, use-case templates, agent registration
