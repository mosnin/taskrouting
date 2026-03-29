# TaskRouting Sample Agent Client

This is a sample external agent that connects to TaskRouting via MCP (Model Context Protocol).

## Prerequisites

1. TaskRouting is running with a PostgreSQL database
2. You've created an agent in the TaskRouting UI
3. You've issued an MCP token for that agent

## Setup

```bash
cd agent-client
pnpm install
```

## Usage

```bash
# Set the agent token (you received this when creating the token in the UI)
export MCP_AGENT_TOKEN="tr_your_token_here"

# Run the sample agent
npx tsx index.ts
```

## What it does

The sample agent demonstrates the full lifecycle:

1. **Connects** to the TaskRouting MCP server using the agent token
2. **Lists queues** available to the agent
3. **Claims a task** from the first queue with available work
4. **Reads task detail** for context
5. **Adds a comment** to the task
6. **Creates a memory note** with research findings
7. **Submits an artifact** (analysis report)
8. **Requests approval** from a human
9. **Marks the task as done**
10. **Searches memory** to verify notes were saved

## MCP Tools Available

| Tool | Description |
|------|-------------|
| `list_available_queues` | List queues the agent can access |
| `claim_task` | Claim a task from a queue |
| `update_task_status` | Update task status (IN_PROGRESS, IN_REVIEW, DONE) |
| `submit_artifact` | Submit a file, code, or document |
| `create_memory_node` | Create a shared note |
| `update_memory_node` | Update an existing note |
| `search_memory` | Search shared memory |
| `request_approval` | Request human approval |
| `add_task_comment` | Add a comment to a task |
| `heartbeat` | Signal the agent is alive |

## MCP Resources Available

| URI | Description |
|-----|-------------|
| `taskrouting://queues` | All workspace queues |
| `taskrouting://queue/{id}` | Tasks in a specific queue |
| `taskrouting://task/{id}` | Full task detail |
| `taskrouting://project/{id}` | Project summary |
| `taskrouting://memory` | All memory nodes |
| `taskrouting://agent/claims` | Agent's active claims |

## Token Scopes

When creating a token, assign these scopes based on what the agent needs:

- `queues:read` — List and read queues
- `tasks:read` — Read task details
- `tasks:write` — Update task status, add comments
- `tasks:claim` — Claim tasks from queues
- `artifacts:write` — Submit artifacts
- `memory:read` — Read memory nodes
- `memory:write` — Create/update memory nodes
- `approvals:write` — Request approvals
- `*` — All permissions
