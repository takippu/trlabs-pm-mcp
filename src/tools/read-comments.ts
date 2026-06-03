import { z } from "zod";
import { pmFetch } from "../lib/api.js";
import { makeTextContent, makeToolError } from "../lib/content.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const inputSchema = {
  targetType: z
    .enum(["cr", "task"])
    .describe("Whether to read comments on a CR or a task"),
  targetId: z.string().describe("The CR id or task id to read comments for"),
};

export function registerReadCommentsTool(server: McpServer): void {
  server.registerTool(
    "read_comments",
    {
      description:
        "Read the comment thread for a CR (targetType: cr) or a task " +
        "(targetType: task) in the TRLabs PM system. CR comments may come from " +
        "the client (authorKind: client) or a user. " +
        "Requires the PM_TOKEN environment variable (a Bearer token from /settings/api-tokens).",
      inputSchema,
    },
    async (args) => {
      const targetId = args.targetId?.trim();
      if (!targetId) {
        return makeToolError("Provide 'targetId' (string).");
      }
      try {
        const qs = new URLSearchParams({
          targetType: args.targetType,
          targetId,
        });
        const data = await pmFetch(`/api/mcp/v1/comments?${qs.toString()}`);
        return makeTextContent(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return makeToolError(message);
      }
    },
  );
}
