import { z } from "zod";
import { pmFetch } from "../lib/api.js";
import { makeTextContent, makeToolError } from "../lib/content.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const inputSchema = {
  projectId: z
    .string()
    .describe("Project ID to create the CR under (resolve via list_projects)"),
  title: z.string().describe("Short title of the client request"),
  description: z
    .string()
    .optional()
    .describe("Optional request detail / body text"),
};

export function registerCreateCrTool(server: McpServer): void {
  server.registerTool(
    "create_cr",
    {
      description:
        "Create a Client Request (CR) in the TRLabs PM system on a project you can access. " +
        "Returns { result: <the created CR>, undo: <token> } — pass the undo token to revert_write to delete it. " +
        "WRITE OP: requires a readwrite-scoped PM_TOKEN (read tokens get 403). " +
        "Propose the exact CR to the user and get approval before calling. " +
        "Requires the PM_TOKEN environment variable.",
      inputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
      },
    },
    async (args) => {
      const projectId = args.projectId?.trim();
      const title = args.title?.trim();
      if (!projectId) return makeToolError("projectId is required.");
      if (!title) return makeToolError("title is required.");
      try {
        const data = await pmFetch("/api/mcp/v1/crs", {
          method: "POST",
          body: { projectId, title, description: args.description },
        });
        return makeTextContent(data);
      } catch (err) {
        return makeToolError(err instanceof Error ? err.message : String(err));
      }
    },
  );
}
