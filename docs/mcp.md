# MCP Server

## What Is MCP

The Model Context Protocol (MCP) is an open standard for connecting AI agents to external systems. It defines a typed interface of **tools** (actions the agent can call) and **resources** (data the agent can read), communicated over a transport layer (stdio, HTTP, etc.).

TaskRouting's MCP server lets any MCP-compatible agent interact with the task routing system without a custom SDK.

## How Agents Connect

The MCP server runs as a subprocess, communicating over stdin/stdout:

```bash
# Set the agent token
export MCP_AGENT_TOKEN="tr_..."

# Start the server (the agent framework spawns this)
npx tsx mcp-server/index.ts
```

On startup the server:

1. Reads `MCP_AGENT_TOKEN` from the environment
2. Hashes it with SHA-256 and looks up the `AgentToken` row
3. Verifies the token is `ACTIVE` and not expired
4. Loads the agent's workspace, capabilities, scopes, and allowed queues into an `AgentContext`
5. Registers tools and resources
6. Opens stdio transport and waits for MCP messages

If the token is invalid, the process exits immediately.

## Available Tools

### `list_available_queues`

List queues this agent can pull from.

| Parameter | Type | Required | Description |
|---|---|---|---|
| *(none)* | | | |

**Required scope:** `queues:read`

Returns: Array of `{ id, name, description, requiredCapabilities, availableTasks }`.

---

### `claim_task`

Claim a task from a queue. Assigns the task to this agent.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `taskId` | string | yes | Task ID to claim |
| `queueId` | string | yes | Queue the task is in |

**Required scope:** `tasks:claim`

Checks: queue access, no existing active claim, task is in `TODO`/`BACKLOG` status, agent has required capabilities. On success, creates a `Claim` row and sets the task to `IN_PROGRESS`.

---

### `update_task_status`

Update the status of a task the agent has claimed.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `taskId` | string | yes | Task ID |
| `status` | string | yes | `IN_PROGRESS`, `IN_REVIEW`, or `DONE` |

**Required scope:** `tasks:write`

When status is `DONE`, the claim is automatically marked `COMPLETED` and released.

---

### `submit_artifact`

Submit a work product for a task.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `taskId` | string | yes | Task ID |
| `name` | string | yes | Artifact name (e.g., `report.md`) |
| `type` | string | yes | `code`, `document`, `image`, `data`, `other` |
| `content` | string | yes | Artifact content |
| `url` | string | no | Optional URL reference |

**Required scope:** `artifacts:write`

---

### `create_memory_node`

Create a shared memory note in the workspace.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `title` | string | yes | Title |
| `content` | string | yes | Content (markdown supported) |
| `type` | string | yes | `DOCUMENT`, `CHECKLIST`, `DECISION`, `SPEC`, `RUNBOOK`, `RESEARCH`, `MEETING_NOTES`, `REFERENCE` |
| `projectId` | string | no | Link to a project |
| `taskId` | string | no | Link to a task |

**Required scope:** `memory:write`

---

### `update_memory_node`

Update an existing memory node.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `nodeId` | string | yes | Memory node ID |
| `title` | string | no | New title |
| `content` | string | no | New content |

**Required scope:** `memory:write`

Increments the `version` field on each update.

---

### `search_memory`

Search workspace memory nodes by keyword.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `query` | string | yes | Search term |

**Required scope:** `memory:read`

Searches title and content (case-insensitive). Returns up to 20 results sorted by most recently updated.

---

### `request_approval`

Request human approval for a task.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `taskId` | string | yes | Task requiring approval |

**Required scope:** `approvals:write`

Creates an `Approval` row and sets the task's `approvalState` to `PENDING`.

---

### `add_task_comment`

Add a comment to a task.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `taskId` | string | yes | Task ID |
| `content` | string | yes | Comment text |

**Required scope:** `tasks:write`

---

### `heartbeat`

Signal that the agent is alive and working.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `status` | string | no | Optional status message |

**Required scope:** *(none)*

Updates the agent's `lastSeenAt` and sets status to `ONLINE`.

## Available Resources

Resources are read-only data the agent can access via `client.readResource()`.

| URI | Description | Scope |
|---|---|---|
| `taskrouting://queues` | All queues visible to this agent with pending task counts | `queues:read` |
| `taskrouting://queue/{queueId}` | Tasks in a specific queue (TODO/BACKLOG, sorted by priority) | `queues:read` |
| `taskrouting://task/{taskId}` | Full task detail with subtasks, comments, artifacts, claims | `tasks:read` |
| `taskrouting://project/{projectId}` | Project summary with task sheets and task counts | `tasks:read` |
| `taskrouting://memory` | All memory nodes in the workspace (most recent 50) | `memory:read` |
| `taskrouting://agent/claims` | This agent's active claims with task details | *(none)* |

## Token Scopes

Scopes control what tools and resources an agent can access.

| Scope | Grants |
|---|---|
| `*` | Full access to all tools and resources |
| `queues:read` | `list_available_queues`, queue resources |
| `tasks:read` | Task and project resources |
| `tasks:write` | `update_task_status`, `add_task_comment` |
| `tasks:claim` | `claim_task` |
| `artifacts:write` | `submit_artifact` |
| `memory:read` | `search_memory`, memory resource |
| `memory:write` | `create_memory_node`, `update_memory_node` |
| `approvals:write` | `request_approval` |

A typical full-access agent token uses `["*"]`. A restricted triage bot might use `["queues:read", "tasks:read", "tasks:write", "tasks:claim"]`.

## Example Usage

### Claude Desktop / MCP Client Configuration

```json
{
  "mcpServers": {
    "taskrouting": {
      "command": "npx",
      "args": ["tsx", "/path/to/taskrouting/mcp-server/index.ts"],
      "env": {
        "MCP_AGENT_TOKEN": "tr_...",
        "DATABASE_URL": "postgresql://taskrouting:taskrouting@localhost:5432/taskrouting"
      }
    }
  }
}
```

### Programmatic Client (TypeScript)

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: "npx",
  args: ["tsx", "mcp-server/index.ts"],
  env: { ...process.env, MCP_AGENT_TOKEN: "tr_..." },
});

const client = new Client({ name: "my-agent", version: "1.0.0" }, {});
await client.connect(transport);

// List queues
const result = await client.callTool({
  name: "list_available_queues",
  arguments: {},
});

// Claim a task
await client.callTool({
  name: "claim_task",
  arguments: { taskId: "...", queueId: "..." },
});

// Read task detail
const task = await client.readResource({
  uri: "taskrouting://task/task-uuid-here",
});
```

## Sample Agent Client

A complete working example is in `agent-client/index.ts`. It demonstrates the full agent lifecycle:

1. Connect to MCP server
2. Send heartbeat
3. List queues
4. Read queue contents
5. Claim a task
6. Read task detail
7. Add a comment
8. Create a memory note
9. Submit an artifact
10. Request approval
11. Mark task as done
12. Search memory

Run it:

```bash
MCP_AGENT_TOKEN=<token> npx tsx agent-client/index.ts
```
