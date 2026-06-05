import { z } from "zod";
import { pmFetch } from "../lib/api.js";
import { makeTextContent, makeToolError } from "../lib/content.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const inputSchema = {
  taskId: z
    .string()
    .describe('The task id, or human code (e.g. "IPJ-6"), that owns the item'),
  itemId: z
    .string()
    .describe("The checklist item id to toggle (from read_task's checklist[].id)"),
  done: z
    .boolean()
    .describe("true = mark the item complete, false = mark it not complete"),
};

export function registerSetChecklistItemTool(server: McpServer): void {
  server.registerTool(
    "set_checklist_item",
    {
      description:
        "Mark a single checklist item (subtask) done or not-done on a task in the TRLabs PM system. " +
        'Pass the task id or human code (e.g. "IPJ-6"), the checklist item id from read_task, and done: true|false. ' +
        "Returns { result: <updated task>, undo: <token | null> } — pass the undo token to revert_write " +
        "to restore the previous done-state (null when the item was already in that state). " +
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
      const itemId = args.itemId?.trim();
      if (!taskId) return makeToolError("taskId is required.");
      if (!itemId) return makeToolError("itemId is required.");
      try {
        const data = await pmFetch(
          `/api/mcp/v1/tasks/${encodeURIComponent(taskId)}/checklist/${encodeURIComponent(itemId)}`,
          { method: "PATCH", body: { done: args.done } },
        );
        return makeTextContent(data);
      } catch (err) {
        return makeToolError(err instanceof Error ? err.message : String(err));
      }
    },
  );
}
