import { z } from "zod";
import { pmFetch } from "../lib/api.js";
import { makeTextContent, makeToolError } from "../lib/content.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const inputSchema = {
  taskId: z.string().describe("The task id to add checklist items to"),
  items: z
    .array(z.string())
    .min(1)
    .describe("Checklist item texts to append, in order (non-empty strings)"),
};

export function registerAddChecklistItemsTool(server: McpServer): void {
  server.registerTool(
    "add_checklist_items",
    {
      description:
        "Append one or more checklist items (subtasks) to a task in the TRLabs PM system. " +
        "Returns { result: <updated task>, undo: <token> } — pass the undo token to revert_write " +
        "to remove exactly the items just added. " +
        "WRITE OP: requires a readwrite-scoped PM_TOKEN (read tokens get 403). " +
        "Typical flow: read_task for full context, draft the checklist, show the user the full list, " +
        "get approval, THEN call this once. " +
        "Requires the PM_TOKEN environment variable.",
      inputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
      },
    },
    async (args) => {
      const taskId = args.taskId?.trim();
      if (!taskId) return makeToolError("taskId is required.");
      const items = (args.items ?? [])
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      if (items.length === 0) {
        return makeToolError("items must contain at least one non-empty string.");
      }
      try {
        const data = await pmFetch(
          `/api/mcp/v1/tasks/${encodeURIComponent(taskId)}/checklist`,
          { method: "POST", body: { items } },
        );
        return makeTextContent(data);
      } catch (err) {
        return makeToolError(err instanceof Error ? err.message : String(err));
      }
    },
  );
}
