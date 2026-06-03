import { z } from "zod";
import { pmFetch } from "../lib/api.js";
import { makeTextContent, makeToolError } from "../lib/content.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const inputSchema = {
  projectId: z.string().describe("The project id to list tasks for"),
  status: z
    .enum(["todo", "doing", "done"])
    .optional()
    .describe("Filter by task status"),
  assigneeId: z.string().optional().describe("Filter by assignee user id"),
  categoryId: z.string().optional().describe("Filter by category id"),
  phase: z.string().optional().describe("Filter by phase"),
};

export function registerListTasksTool(server: McpServer): void {
  server.registerTool(
    "list_tasks",
    {
      description:
        "List a project's tasks (kanban cards) in the TRLabs PM system as " +
        "summaries. Filter by status (todo|doing|done), assigneeId, categoryId, " +
        "or phase; filters compose. Use list_projects to get a projectId first. " +
        "Requires the PM_TOKEN environment variable (a Bearer token from /settings/api-tokens).",
      inputSchema,
    },
    async (args) => {
      const projectId = args.projectId?.trim();
      if (!projectId) {
        return makeToolError("Provide 'projectId' (string).");
      }
      try {
        const qs = new URLSearchParams();
        if (args.status) qs.set("status", args.status);
        if (args.assigneeId?.trim()) qs.set("assigneeId", args.assigneeId.trim());
        if (args.categoryId?.trim()) qs.set("categoryId", args.categoryId.trim());
        if (args.phase?.trim()) qs.set("phase", args.phase.trim());
        const suffix = qs.toString() ? `?${qs.toString()}` : "";
        const data = await pmFetch(
          `/api/mcp/v1/projects/${encodeURIComponent(projectId)}/tasks${suffix}`,
        );
        return makeTextContent(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return makeToolError(message);
      }
    },
  );
}
