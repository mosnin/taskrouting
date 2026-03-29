#!/usr/bin/env node

/**
 * TaskRouting Sample Agent Client
 *
 * This demonstrates how an external agent connects to TaskRouting via MCP.
 *
 * Usage:
 *   MCP_AGENT_TOKEN=tr_xxxx npx tsx agent-client/index.ts
 *
 * The agent will:
 * 1. Connect and list available queues
 * 2. Claim the first available task
 * 3. Update its status
 * 4. Create a memory note
 * 5. Submit an artifact
 * 6. Send heartbeats
 * 7. Mark the task as done
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { spawn } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MCP_SERVER_PATH = resolve(__dirname, "../mcp-server/index.ts");

async function main() {
  const token = process.env.MCP_AGENT_TOKEN;
  if (!token) {
    console.error("Set MCP_AGENT_TOKEN environment variable");
    process.exit(1);
  }

  console.log("Starting TaskRouting MCP client...");

  // Spawn the MCP server process
  const transport = new StdioClientTransport({
    command: "npx",
    args: ["tsx", MCP_SERVER_PATH],
    env: { ...process.env, MCP_AGENT_TOKEN: token },
  });

  const client = new Client({ name: "sample-agent", version: "1.0.0" }, {});
  await client.connect(transport);
  console.log("Connected to TaskRouting MCP server");

  // List available tools
  const tools = await client.listTools();
  console.log(`\nAvailable tools: ${tools.tools.map((t) => t.name).join(", ")}`);

  // List available resources
  const resources = await client.listResources();
  console.log(`Available resources: ${resources.resources.map((r) => r.uri).join(", ")}`);

  // Step 1: Send heartbeat
  console.log("\n--- Sending heartbeat ---");
  const heartbeat = await client.callTool({
    name: "heartbeat",
    arguments: { status: "Starting up" },
  });
  console.log("Heartbeat:", JSON.stringify(heartbeat.content));

  // Step 2: List available queues
  console.log("\n--- Listing queues ---");
  const queuesResult = await client.callTool({
    name: "list_available_queues",
    arguments: {},
  });
  const queuesText = (queuesResult.content[0] as any).text;
  const queues = JSON.parse(queuesText);
  console.log(`Found ${queues.length} queues:`);
  for (const q of queues) {
    console.log(`  - ${q.name}: ${q.availableTasks} tasks (caps: ${q.requiredCapabilities.join(", ") || "none"})`);
  }

  // Step 3: Read queue resource for more detail
  if (queues.length > 0) {
    const firstQueue = queues[0];
    console.log(`\n--- Reading queue "${firstQueue.name}" ---`);
    const queueResource = await client.readResource({
      uri: `taskrouting://queue/${firstQueue.id}`,
    });
    const tasks = JSON.parse((queueResource.contents[0] as any).text);
    console.log(`Tasks in queue: ${tasks.length}`);

    if (tasks.length > 0) {
      const task = tasks[0];
      console.log(`\n--- Claiming task: "${task.title}" ---`);

      // Step 4: Claim the task
      const claimResult = await client.callTool({
        name: "claim_task",
        arguments: { taskId: task.id, queueId: firstQueue.id },
      });
      console.log("Claim result:", (claimResult.content[0] as any).text);

      // Step 5: Read task detail
      console.log("\n--- Reading task detail ---");
      const taskResource = await client.readResource({
        uri: `taskrouting://task/${task.id}`,
      });
      const taskDetail = JSON.parse((taskResource.contents[0] as any).text);
      console.log(`Task: ${taskDetail.title} (${taskDetail.status})`);

      // Step 6: Add a comment
      console.log("\n--- Adding comment ---");
      await client.callTool({
        name: "add_task_comment",
        arguments: {
          taskId: task.id,
          content: "I've claimed this task and am starting work on it.",
        },
      });
      console.log("Comment added");

      // Step 7: Create a memory note
      console.log("\n--- Creating memory note ---");
      const memoryResult = await client.callTool({
        name: "create_memory_node",
        arguments: {
          title: `Research notes for: ${task.title}`,
          content: "## Initial Analysis\n\nThis task requires investigation of the following areas...\n\n- Area 1\n- Area 2\n- Area 3",
          type: "RESEARCH",
          taskId: task.id,
        },
      });
      console.log("Memory note:", (memoryResult.content[0] as any).text);

      // Step 8: Submit an artifact
      console.log("\n--- Submitting artifact ---");
      const artifactResult = await client.callTool({
        name: "submit_artifact",
        arguments: {
          taskId: task.id,
          name: "analysis-report.md",
          type: "document",
          content: "# Analysis Report\n\n## Summary\nTask has been analyzed and implemented.\n\n## Changes\n- Change 1\n- Change 2\n\n## Testing\nAll tests pass.",
        },
      });
      console.log("Artifact:", (artifactResult.content[0] as any).text);

      // Step 9: Request approval
      console.log("\n--- Requesting approval ---");
      const approvalResult = await client.callTool({
        name: "request_approval",
        arguments: { taskId: task.id },
      });
      console.log("Approval:", (approvalResult.content[0] as any).text);

      // Step 10: Update status to done
      console.log("\n--- Marking task as done ---");
      await client.callTool({
        name: "update_task_status",
        arguments: { taskId: task.id, status: "DONE" },
      });
      console.log("Task completed!");
    } else {
      console.log("No tasks available to claim");
    }
  } else {
    console.log("No queues available");
  }

  // Final heartbeat
  console.log("\n--- Final heartbeat ---");
  await client.callTool({
    name: "heartbeat",
    arguments: { status: "All done!" },
  });

  // Search memory
  console.log("\n--- Searching memory ---");
  const searchResult = await client.callTool({
    name: "search_memory",
    arguments: { query: "analysis" },
  });
  console.log("Memory search results:", (searchResult.content[0] as any).text);

  console.log("\nAgent workflow complete!");
  await client.close();
  process.exit(0);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
