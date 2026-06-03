import { z } from "zod";
import { pmFetch } from "../lib/api.js";
import { makeTextContent, makeToolError } from "../lib/content.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const inputSchema = {
  taskId: z.string().describe("The task id to update"),
  status: z
    .enum(["todo", "doing", "done"])
    .describe("New status for the task"),
};

export function registerUpdateTaskStatusTool(server: McpServer): void {
  server.registerTool(
    "update_task_status",
    {
      description:
        "Move a task to a new status (todo | doing | done) in the TRLabs PM system. " +
        "Returns { result: <updated task>, undo: <token | null> } — pass the undo token to revert_write " +
        "to restore the previous status (null when the status was unchanged). " +
        "WRITE OP: requires a readwrite-scoped PM_TOKEN (read tokens get 403). " +
        "Propose the change to the user and get approval before calling. " +
        "Requires the PM_TOKEN environment variable.",
      inputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
      },
    },
    async (args) => {
      const taskId = args.taskId?.trim();
      if (!taskId) return makeToolError("taskId is required.");
      try {
        const data = await pmFetch(
          `/api/mcp/v1/tasks/${encodeURIComponent(taskId)}/status`,
          { method: "POST", body: { status: args.status } },
        );
        return makeTextContent(data);
      } catch (err) {
        return makeToolError(err instanceof Error ? err.message : String(err));
      }
    },
  );
}
