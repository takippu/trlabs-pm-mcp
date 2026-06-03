import { z } from "zod";
import { pmFetch } from "../lib/api.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const inputSchema = {
  includeArchived: z
    .boolean()
    .optional()
    .describe("Include archived projects (default false)"),
};

function makeTextContent(data: unknown): {
  content: [{ type: "text"; text: string }];
} {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

function makeToolError(message: string): {
  isError: true;
  content: [{ type: "text"; text: string }];
} {
  return {
    isError: true as const,
    content: [
      {
        type: "text" as const,
        text: message,
      },
    ],
  };
}

export function registerListProjectsTool(server: McpServer): void {
  server.registerTool(
    "list_projects",
    {
      description:
        "List the projects you can access in the TRLabs PM system, each with " +
        "its id, name, slug, status, and CR/task counts. Use this to resolve a " +
        "project name to the projectId needed by read_cr, list_tasks, etc. " +
        "Pass includeArchived: true to also return archived projects. " +
        "Requires the PM_TOKEN environment variable (a Bearer token from /settings/api-tokens).",
      inputSchema,
    },
    async (args) => {
      try {
        const query =
          args.includeArchived === true ? "?includeArchived=true" : "";
        const data = await pmFetch(`/api/mcp/v1/projects${query}`);
        return makeTextContent(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return makeToolError(message);
      }
    },
  );
}
