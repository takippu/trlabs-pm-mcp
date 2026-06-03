import { z } from "zod";
import { pmFetch } from "../lib/api.js";
import { makeTextContent, makeToolError } from "../lib/content.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const inputSchema = {
  query: z.string().describe("Search text (matches project/CR/task titles)"),
  projectId: z
    .string()
    .optional()
    .describe("Optional: narrow the search to a single project"),
};

export function registerSearchTool(server: McpServer): void {
  server.registerTool(
    "search",
    {
      description:
        "Search projects, CRs, and tasks across the projects you can access in " +
        "the TRLabs PM system. Returns up to 50 hits (kind: project|request|task), " +
        "newest first. Pass projectId to narrow to one project. " +
        "Requires the PM_TOKEN environment variable (a Bearer token from /settings/api-tokens).",
      inputSchema,
    },
    async (args) => {
      const query = args.query?.trim();
      if (!query) {
        return makeToolError("Provide 'query' (string).");
      }
      try {
        const qs = new URLSearchParams({ query });
        if (args.projectId?.trim()) qs.set("projectId", args.projectId.trim());
        const data = await pmFetch(`/api/mcp/v1/search?${qs.toString()}`);
        return makeTextContent(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return makeToolError(message);
      }
    },
  );
}
