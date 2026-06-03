import { z } from "zod";
import { pmFetch } from "../lib/api.js";
import { makeTextContent, makeToolError } from "../lib/content.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const inputSchema = {
  taskId: z.string().describe("The task id to fetch"),
};

export function registerReadTaskTool(server: McpServer): void {
  server.registerTool(
    "read_task",
    {
      description:
        "Read a single task from the TRLabs PM system by taskId, including its " +
        "description, checklist, comments, and source CR (if it was converted " +
        "from one). Task status is one of todo|doing|done. " +
        "Requires the PM_TOKEN environment variable (a Bearer token from /settings/api-tokens).",
      inputSchema,
    },
    async (args) => {
      const taskId = args.taskId?.trim();
      if (!taskId) {
        return makeToolError("Provide 'taskId' (string).");
      }
      try {
        const data = await pmFetch(
          `/api/mcp/v1/tasks/${encodeURIComponent(taskId)}`,
        );
        return makeTextContent(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return makeToolError(message);
      }
    },
  );
}
