import { z } from "zod";
import { pmFetch } from "../lib/api.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const inputSchema = {
  projectId: z.string().optional().describe("Project ID to list all CRs for"),
  requestId: z.string().optional().describe("CR request ID to fetch a single CR"),
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
          const data = await pmFetch(
            `/api/mcp/v1/crs?projectId=${encodeURIComponent(projectId)}`,
          );
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
