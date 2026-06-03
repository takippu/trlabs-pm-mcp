import { z } from "zod";
import { pmFetch } from "../lib/api.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const inputSchema = {
  projectId: z.string().optional().describe("Project ID to list all CRs for"),
  requestId: z.string().optional().describe("CR request ID to fetch a single CR"),
  // List-mode filters + pagination (ignored when requestId is supplied).
  status: z
    .string()
    .optional()
    .describe("List filter: CR status (new|reviewed|converted|closed|rejected)"),
  phase: z.string().optional().describe("List filter: phase"),
  categoryId: z.string().optional().describe("List filter: category id"),
  limit: z
    .number()
    .optional()
    .describe("List pagination: max CRs to return (default 100, max 200)"),
  offset: z
    .number()
    .optional()
    .describe("List pagination: number of CRs to skip"),
};

function makeTextContent(data: unknown): { content: [{ type: "text"; text: string }] } {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

function makeToolError(message: string): { isError: true; content: [{ type: "text"; text: string }] } {
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

export function registerReadCrTool(server: McpServer): void {
  server.registerTool(
    "read_cr",
    {
      description:
        "Read change requests (CRs) from the TRLabs PM system. " +
        "Provide requestId to fetch a single CR, or projectId to list all CRs for a project. " +
        "requestId takes precedence when both are supplied. " +
        "Requires the PM_TOKEN environment variable (a Bearer token from /settings/api-tokens).",
      inputSchema,
    },
    async (args) => {
      // Trim so whitespace-only values (e.g. "   ") are treated as absent
      // rather than calling the API with a blank id and getting an opaque 404.
      const requestId = args.requestId?.trim() || undefined;
      const projectId = args.projectId?.trim() || undefined;

      try {
        // requestId takes precedence; each branch narrows its id to a string.
        if (requestId) {
          const data = await pmFetch(`/api/mcp/v1/crs/${encodeURIComponent(requestId)}`);
          return makeTextContent(data);
        }
        if (projectId) {
          // Build the list query: projectId is required; filters/pagination are
          // appended only when present so existing callers get the old path.
          const qs = new URLSearchParams({ projectId });
          if (args.status?.trim()) qs.set("status", args.status.trim());
          if (args.phase?.trim()) qs.set("phase", args.phase.trim());
          if (args.categoryId?.trim()) qs.set("categoryId", args.categoryId.trim());
          if (typeof args.limit === "number") qs.set("limit", String(args.limit));
          if (typeof args.offset === "number") qs.set("offset", String(args.offset));
          const data = await pmFetch(`/api/mcp/v1/crs?${qs.toString()}`);
          return makeTextContent(data);
        }
        // Neither id supplied (or both blank after trim).
        return makeToolError(
          "Provide either 'requestId' (string) to fetch one CR or 'projectId' (string) to list a project's CRs.",
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return makeToolError(message);
      }
    }
  );
}
