// Shared MCP tool result helpers. Every tool returns either a text-content
// payload (JSON-stringified data) or a tool error. Centralised so each tool
// file stays a thin wrapper around pmFetch.

export function makeTextContent(data: unknown): {
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

export function makeToolError(message: string): {
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
