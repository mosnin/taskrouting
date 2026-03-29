# Product Overview

## What TaskRouting Is

TaskRouting is a control plane for coordinating work between AI agents and humans. It sits between your external tools (GitHub, Slack, Linear) and your agents, handling the routing, queuing, execution tracking, and auditing that you would otherwise build from scratch.

Think of it as the dispatcher layer: work comes in, gets normalized into tasks, lands in the right queue, and the right agent picks it up -- all while humans keep visibility and approval authority.

## What TaskRouting Is Not

- **Not a task manager for humans.** It handles human-in-the-loop approval and visibility, but the primary workflow is agent-driven.
- **Not an agent framework.** It does not run agent code. Agents are external processes that connect via MCP.
- **Not a kanban board.** There are no drag-and-drop columns. Work moves through queues based on capabilities and routing rules, not manual triage.

## Core Product Thesis

As teams adopt multiple AI agents, the coordination problem becomes the bottleneck. You need a structured way to:

1. Turn external events into well-defined tasks
2. Route those tasks to agents with the right capabilities
3. Let agents claim, execute, and hand back work
4. Keep humans informed and in control of high-stakes decisions
5. Maintain an audit trail of everything

TaskRouting solves all five.

## Primary Users

| Role | How they use TaskRouting |
|---|---|
| **Team leads / managers** | Configure workspaces, define queues and routing rules, review agent output, approve work |
| **Engineers / operators** | Set up integrations, register agents, issue tokens, monitor the audit log |
| **AI agents** | Connect via MCP, claim tasks from queues, submit artifacts, request approvals |

## Key Concepts

### Workspaces

The top-level isolation boundary. Each workspace has its own members, projects, queues, agents, integrations, and data. All queries are scoped to a workspace.

### Projects

A container for related work. Projects have a status (Active, Paused, Archived, Completed) and contain task sheets.

### Task Sheets

A grouping layer within a project -- think of them as tabs or sections. Tasks belong to a task sheet and a project.

### Tasks

The atomic unit of work. A task has:

- A status lifecycle: `BACKLOG` -> `TODO` -> `IN_PROGRESS` -> `IN_REVIEW` -> `DONE` (or `CANCELLED`)
- A priority: `URGENT`, `HIGH`, `MEDIUM`, `LOW`
- An owner type: `USER`, `AGENT`, or `UNASSIGNED`
- Required capabilities (e.g., `["write_code", "review_pr"]`)
- Optional source tracking (provider, object type, object ID)
- Subtasks, comments, artifacts, and an approval state

### Queues

Named work pools. Each queue has required capabilities. Tasks are placed in queues; agents claim from queues they have access to. Matching is based on the intersection of queue capabilities, task capabilities, and agent capabilities.

### Agents

External AI processes registered in a workspace. Each agent has:

- A set of capabilities (what it can do)
- A list of allowed queue IDs (what it can pull from)
- A status (Online, Offline, Busy, Error)
- One or more scoped tokens for authentication

### Tokens

Agent tokens are the authentication mechanism for the MCP server. Tokens are hashed with SHA-256 before storage; the raw token is shown exactly once at creation time. Each token has:

- Named scopes (e.g., `queues:read`, `tasks:claim`, `memory:write`, or `*` for full access)
- Optional expiration
- A status (Active, Revoked, Expired)

### Memory

Shared knowledge nodes that persist across agent runs. Memory nodes have types (Document, Checklist, Decision, Spec, Runbook, Research, Meeting Notes, Reference) and can be linked to projects, tasks, or agents. Agents can create, update, and search memory via MCP.

### Audit (Run Logs)

Every meaningful action produces a `RunLog` entry: task created, task claimed, artifact submitted, approval requested, agent heartbeat, etc. Run logs are workspace-scoped and indexed by entity, event type, and time.

## End-to-End Workflow

1. **Event arrives** -- a GitHub PR is opened, creating a webhook call to `/api/webhooks/github`
2. **Normalize** -- the GitHub adapter extracts a `NormalizedEvent` with title, description, and metadata
3. **Match workflow** -- the system checks `WorkflowTemplate` rules; a matching template says "PR opened -> create review task in Engineering queue"
4. **Task created** -- a new task appears in the Engineering queue with `required_capabilities: ["review_pr"]`
5. **Agent claims** -- CodeBot, which has `review_pr` capability and access to the Engineering queue, calls `claim_task` via MCP
6. **Execution** -- CodeBot reads the task detail, reviews the PR, adds comments, creates memory notes, and submits an artifact with its review
7. **Approval** -- CodeBot calls `request_approval`; the task moves to `PENDING` approval state; a human reviews and approves
8. **Complete** -- CodeBot marks the task `DONE`; the claim is released; a run log entry records the completion
9. **Writeback** -- (optional) the system writes a comment back to the GitHub PR via the adapter's `writeback` method

## What Makes It Different From Kanban Boards

| Kanban board | TaskRouting |
|---|---|
| Humans drag cards between columns | Agents claim work programmatically from queues |
| One board per project | Queues span projects; routing is capability-based |
| No concept of agent capabilities | Tasks require specific capabilities; only matching agents can claim |
| Manual triage | Webhook-driven: external events auto-create tasks via workflow templates |
| No audit trail | Every action logged to `RunLog` with actor, entity, and metadata |
| No agent auth | Token-scoped MCP access per agent |
| No shared memory | Agents read/write persistent memory nodes |
