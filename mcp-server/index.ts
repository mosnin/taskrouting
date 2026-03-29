import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { verifyAgentToken, type AgentContext } from "./auth.js";
import { getToolDefinitions, executeTool } from "./tools.js";
import { getResourceDefinitions, readResource } from "./resources.js";

const TOKEN = process.env.MCP_AGENT_TOKEN;

async function main() {
  if (!TOKEN) {
    console.error("MCP_AGENT_TOKEN environment variable is required");
    process.exit(1);
  }

  // Verify the token
  const agentCtx = await verifyAgentToken(TOKEN);
  if (!agentCtx) {
    console.error("Invalid or expired agent token");
    process.exit(1);
  }

  console.error(`Authenticated as agent: ${agentCtx.agentName} (workspace: ${agentCtx.workspaceId})`);

  const server = new McpServer({
    name: "taskrouting",
    version: "1.0.0",
  });

  // Register tools
  const toolDefs = getToolDefinitions();
  for (const tool of toolDefs) {
    server.tool(tool.name, tool.description, tool.inputSchema as any, async (args: any) => {
      return executeTool(agentCtx, tool.name, args);
    });
  }

  // Register resources
  const resourceDefs = getResourceDefinitions();
  for (const res of resourceDefs) {
    // Resource templates use {param} syntax
    if (res.uri.includes("{")) {
      // This is a template - register as resource template
      server.resource(res.name, res.uri, async (uri: URL) => {
        const result = await readResource(agentCtx, uri.toString());
        return { contents: [result] };
      });
    } else {
      // Static resource
      server.resource(res.name, res.uri, async () => {
        const result = await readResource(agentCtx, res.uri);
        return { contents: [result] };
      });
    }
  }

  // Start the server with stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("TaskRouting MCP server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
