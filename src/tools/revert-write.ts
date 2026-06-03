import { z } from "zod";
import { pmFetch } from "../lib/api.js";
import { makeTextContent, makeToolError } from "../lib/content.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// Input mirrors the `undo` descriptor a prior write returned. Supply `op` plus
// the fields that op needs (the write hands you the whole token to replay).
const inputSchema = {
  op: z
    .enum(["delete_cr", "set_task_status", "remove_checklist_items"])
    .describe("The undo op, taken from a prior write's `undo` token"),
  requestId: z
    .string()
    .optional()
    .describe("For op=delete_cr: the CR id to delete"),
  taskId: z
    .string()
    .optional()
    .describe("For op=set_task_status / remove_checklist_items: the task id"),
  status: z
    .enum(["todo", "doing", "done"])
    .optional()
    .describe("For op=set_task_status: the status to restore"),
  itemIds: z
    .array(z.string())
    .optional()
    .describe("For op=remove_checklist_items: the checklist item ids to remove"),
};

export function registerRevertWriteTool(server: McpServer): void {
  server.registerTool(
    "revert_write",
    {
      description:
        "Reverse a previous write in the TRLabs PM system by replaying its `undo` token. " +
        "Pass the `undo` object a write returned: delete_cr removes a created CR, " +
        "set_task_status restores a task's prior status, remove_checklist_items removes added items. " +
        "WRITE OP: requires a readwrite-scoped PM_TOKEN (read tokens get 403). " +
        "Propose the revert to the user and get approval before calling. " +
        "Requires the PM_TOKEN environment variable.",
      inputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
      },
    },
    async (args) => {
      try {
        const data = await pmFetch("/api/mcp/v1/revert", {
          method: "POST",
          body: {
            op: args.op,
            requestId: args.requestId,
            taskId: args.taskId,
            status: args.status,
            itemIds: args.itemIds,
          },
        });
        return makeTextContent(data);
      } catch (err) {
        return makeToolError(err instanceof Error ? err.message : String(err));
      }
    },
  );
}
