#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerReadCrTool } from "./tools/read-cr.js";
import { registerListProjectsTool } from "./tools/list-projects.js";
import { registerListTasksTool } from "./tools/list-tasks.js";
import { registerReadTaskTool } from "./tools/read-task.js";
import { registerListCategoriesTool } from "./tools/list-categories.js";
import { registerReadCommentsTool } from "./tools/read-comments.js";
import { registerWhoamiTool } from "./tools/whoami.js";
import { registerSearchTool } from "./tools/search.js";

// Validate required environment variables at startup
if (!process.env["PM_TOKEN"]) {
  process.stderr.write(
    "PM_TOKEN required; create one at https://pm.trlabs.my/settings/api-tokens\n"
  );
  process.exit(1);
}

// PM_BASE_URL defaults to https://pm.trlabs.my — used in api.ts
const baseUrl = process.env["PM_BASE_URL"] ?? "https://pm.trlabs.my";
// Acknowledge the resolved base URL to stderr for diagnostic clarity (no stdout — that's JSON-RPC)
process.stderr.write(`[trlabs-pm-mcp] connecting to ${baseUrl}\n`);

const server = new McpServer({
  name: "trlabs-pm-mcp",
  version: "0.1.0",
});

registerReadCrTool(server);
registerListProjectsTool(server);
registerListTasksTool(server);
registerReadTaskTool(server);
registerListCategoriesTool(server);
registerReadCommentsTool(server);
registerWhoamiTool(server);
registerSearchTool(server);

const transport = new StdioServerTransport();
await server.connect(transport);
