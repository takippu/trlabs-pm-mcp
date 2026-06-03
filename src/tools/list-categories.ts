import { z } from "zod";
import { pmFetch } from "../lib/api.js";
import { makeTextContent, makeToolError } from "../lib/content.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const inputSchema = {
  projectId: z.string().describe("The project id to list categories for"),
};

export function registerListCategoriesTool(server: McpServer): void {
  server.registerTool(
    "list_categories",
    {
      description:
        "List a project's task categories (id, name, color) in the TRLabs PM " +
        "system. Use the returned ids to filter list_tasks by categoryId. " +
        "Requires the PM_TOKEN environment variable (a Bearer token from /settings/api-tokens).",
      inputSchema,
    },
    async (args) => {
      const projectId = args.projectId?.trim();
      if (!projectId) {
        return makeToolError("Provide 'projectId' (string).");
      }
      try {
        const data = await pmFetch(
          `/api/mcp/v1/projects/${encodeURIComponent(projectId)}/categories`,
        );
        return makeTextContent(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return makeToolError(message);
      }
    },
  );
}
