import { pmFetch } from "../lib/api.js";
import { makeTextContent, makeToolError } from "../lib/content.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerWhoamiTool(server: McpServer): void {
  server.registerTool(
    "whoami",
    {
      description:
        "Return the identity the PM_TOKEN authenticates as in the TRLabs PM " +
        "system (userId, email, name, role, visibleProjectCount). Use to " +
        "confirm the token resolved and to scope 'my' queries. " +
        "Requires the PM_TOKEN environment variable (a Bearer token from /settings/api-tokens).",
      inputSchema: {},
    },
    async () => {
      try {
        const data = await pmFetch(`/api/mcp/v1/me`);
        return makeTextContent(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return makeToolError(message);
      }
    },
  );
}
