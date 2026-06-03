import { describe, it, expect, beforeEach, mock } from "bun:test";

// ---------------------------------------------------------------------------
// Mock the pmFetch helper so we test the tool's wiring, not the network.
// ---------------------------------------------------------------------------

let lastPath: string | undefined;
let mockResponse: unknown;
let mockError: Error | undefined;

mock.module("../lib/api.js", () => ({
  pmFetch: async (path: string) => {
    lastPath = path;
    if (mockError) throw mockError;
    return mockResponse;
  },
}));

// Import AFTER the mock is registered.
const { registerListProjectsTool } = await import("./list-projects.js");

// ---------------------------------------------------------------------------
// Minimal McpServer stub — captures the handler registered by the tool.
// ---------------------------------------------------------------------------

type ToolHandler = (args: Record<string, unknown>) => Promise<{
  content: { type: string; text: string }[];
  isError?: boolean;
}>;

let capturedHandler: ToolHandler | undefined;

const stubServer = {
  registerTool: (_name: string, _config: unknown, handler: ToolHandler) => {
    capturedHandler = handler;
  },
} as unknown as Parameters<typeof registerListProjectsTool>[0];

beforeEach(() => {
  lastPath = undefined;
  mockResponse = undefined;
  mockError = undefined;
  capturedHandler = undefined;
  registerListProjectsTool(stubServer);
});

describe("list_projects tool", () => {
  it("lists projects with no args (active only)", async () => {
    mockResponse = [{ id: "proj-1", name: "iPajak" }];
    await capturedHandler!({});
    expect(lastPath).toBe("/api/mcp/v1/projects");
  });

  it("appends includeArchived=true when requested", async () => {
    mockResponse = [];
    await capturedHandler!({ includeArchived: true });
    expect(lastPath).toBe("/api/mcp/v1/projects?includeArchived=true");
  });

  it("omits the query string when includeArchived is false", async () => {
    mockResponse = [];
    await capturedHandler!({ includeArchived: false });
    expect(lastPath).toBe("/api/mcp/v1/projects");
  });

  it("returns the project list as text content", async () => {
    mockResponse = [{ id: "proj-1", name: "iPajak", crCount: 43, taskCount: 43 }];
    const result = await capturedHandler!({});
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("iPajak");
  });

  it("surfaces pmFetch errors as tool errors", async () => {
    mockError = new Error("PM API error 500: internal error");
    const result = await capturedHandler!({});
    expect(result.isError).toBe(true);
  });
});
