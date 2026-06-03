import { describe, it, expect, beforeEach, mock } from "bun:test";

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

const { registerSearchTool } = await import("./search.js");
const { registerReadCrTool } = await import("./read-cr.js");

type ToolHandler = (args: Record<string, unknown>) => Promise<{
  content: { type: string; text: string }[];
  isError?: boolean;
}>;

function register(fn: (server: never) => void): ToolHandler {
  let captured: ToolHandler | undefined;
  const server = {
    registerTool: (_n: string, _c: unknown, handler: ToolHandler) => {
      captured = handler;
    },
  } as unknown as never;
  fn(server);
  if (!captured) throw new Error("no handler registered");
  return captured;
}

beforeEach(() => {
  lastPath = undefined;
  mockResponse = undefined;
  mockError = undefined;
});

// ---------------------------------------------------------------------------
// search
// ---------------------------------------------------------------------------

describe("search tool", () => {
  it("searches with a query", async () => {
    mockResponse = [];
    const h = register(registerSearchTool);
    await h({ query: "reversal" });
    expect(lastPath).toBe("/api/mcp/v1/search?query=reversal");
  });

  it("narrows by projectId", async () => {
    mockResponse = [];
    const h = register(registerSearchTool);
    await h({ query: "bug", projectId: "proj-1" });
    expect(lastPath).toContain("query=bug");
    expect(lastPath).toContain("projectId=proj-1");
  });

  it("errors with no API call on blank query", async () => {
    const h = register(registerSearchTool);
    const r = await h({ query: "  " });
    expect(r.isError).toBe(true);
    expect(lastPath).toBeUndefined();
  });

  it("encodes special characters in the query", async () => {
    mockResponse = [];
    const h = register(registerSearchTool);
    await h({ query: "a&b=c" });
    expect(lastPath).toBe("/api/mcp/v1/search?query=a%26b%3Dc");
  });
});

// ---------------------------------------------------------------------------
// read_cr — new filters/pagination must NOT break the legacy paths
// ---------------------------------------------------------------------------

describe("read_cr extended (FR-8)", () => {
  it("legacy: projectId only → unchanged path", async () => {
    mockResponse = [];
    const h = register(registerReadCrTool);
    await h({ projectId: "proj_abc" });
    expect(lastPath).toBe("/api/mcp/v1/crs?projectId=proj_abc");
  });

  it("legacy: requestId only → unchanged single-CR path", async () => {
    mockResponse = {};
    const h = register(registerReadCrTool);
    await h({ requestId: "cr_1" });
    expect(lastPath).toBe("/api/mcp/v1/crs/cr_1");
  });

  it("appends status/phase/category filters in list mode", async () => {
    mockResponse = [];
    const h = register(registerReadCrTool);
    await h({ projectId: "proj-1", status: "converted", phase: "Phase 2a" });
    expect(lastPath).toContain("projectId=proj-1");
    expect(lastPath).toContain("status=converted");
    expect(lastPath).toContain("phase=Phase+2a");
  });

  it("appends limit/offset pagination", async () => {
    mockResponse = [];
    const h = register(registerReadCrTool);
    await h({ projectId: "proj-1", limit: 10, offset: 20 });
    expect(lastPath).toContain("limit=10");
    expect(lastPath).toContain("offset=20");
  });

  it("ignores filters when requestId is supplied (single-CR precedence)", async () => {
    mockResponse = {};
    const h = register(registerReadCrTool);
    await h({ requestId: "cr_1", projectId: "p", status: "new", limit: 5 });
    expect(lastPath).toBe("/api/mcp/v1/crs/cr_1");
  });
});
