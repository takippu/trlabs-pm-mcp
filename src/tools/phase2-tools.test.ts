import { describe, it, expect, beforeEach, mock } from "bun:test";

// ---------------------------------------------------------------------------
// Mock pmFetch — capture the path each tool requests.
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

const { registerReadTaskTool } = await import("./read-task.js");
const { registerListTasksTool } = await import("./list-tasks.js");
const { registerListCategoriesTool } = await import("./list-categories.js");
const { registerReadCommentsTool } = await import("./read-comments.js");
const { registerWhoamiTool } = await import("./whoami.js");

// ---------------------------------------------------------------------------
// Stub server that captures the registered handler.
// ---------------------------------------------------------------------------

type ToolHandler = (args: Record<string, unknown>) => Promise<{
  content: { type: string; text: string }[];
  isError?: boolean;
}>;

function register(
  fn: (server: never) => void,
): ToolHandler {
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
// read_task
// ---------------------------------------------------------------------------

describe("read_task tool", () => {
  it("fetches a task by id (encoded)", async () => {
    mockResponse = { id: "task-1" };
    const h = register(registerReadTaskTool);
    await h({ taskId: "task/1" });
    expect(lastPath).toBe("/api/mcp/v1/tasks/task%2F1");
  });

  it("errors with no API call when taskId is blank", async () => {
    const h = register(registerReadTaskTool);
    const r = await h({ taskId: "   " });
    expect(r.isError).toBe(true);
    expect(lastPath).toBeUndefined();
  });

  it("surfaces pmFetch errors", async () => {
    mockError = new Error("PM API error 404: not found");
    const h = register(registerReadTaskTool);
    const r = await h({ taskId: "task-1" });
    expect(r.isError).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// list_tasks
// ---------------------------------------------------------------------------

describe("list_tasks tool", () => {
  it("lists tasks with no filters", async () => {
    mockResponse = [];
    const h = register(registerListTasksTool);
    await h({ projectId: "proj-1" });
    expect(lastPath).toBe("/api/mcp/v1/projects/proj-1/tasks");
  });

  it("appends composed filters", async () => {
    mockResponse = [];
    const h = register(registerListTasksTool);
    await h({ projectId: "proj-1", status: "doing", assigneeId: "u-1" });
    expect(lastPath).toContain("/api/mcp/v1/projects/proj-1/tasks?");
    expect(lastPath).toContain("status=doing");
    expect(lastPath).toContain("assigneeId=u-1");
  });

  it("errors with no API call when projectId is blank", async () => {
    const h = register(registerListTasksTool);
    const r = await h({ projectId: "" });
    expect(r.isError).toBe(true);
    expect(lastPath).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// list_categories
// ---------------------------------------------------------------------------

describe("list_categories tool", () => {
  it("fetches categories for a project", async () => {
    mockResponse = [];
    const h = register(registerListCategoriesTool);
    await h({ projectId: "proj-1" });
    expect(lastPath).toBe("/api/mcp/v1/projects/proj-1/categories");
  });

  it("errors when projectId is blank", async () => {
    const h = register(registerListCategoriesTool);
    const r = await h({ projectId: "  " });
    expect(r.isError).toBe(true);
    expect(lastPath).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// read_comments
// ---------------------------------------------------------------------------

describe("read_comments tool", () => {
  it("reads task comments", async () => {
    mockResponse = [];
    const h = register(registerReadCommentsTool);
    await h({ targetType: "task", targetId: "task-1" });
    expect(lastPath).toContain("targetType=task");
    expect(lastPath).toContain("targetId=task-1");
  });

  it("reads cr comments", async () => {
    mockResponse = [];
    const h = register(registerReadCommentsTool);
    await h({ targetType: "cr", targetId: "cr-1" });
    expect(lastPath).toContain("targetType=cr");
    expect(lastPath).toContain("targetId=cr-1");
  });

  it("errors when targetId is blank", async () => {
    const h = register(registerReadCommentsTool);
    const r = await h({ targetType: "cr", targetId: "" });
    expect(r.isError).toBe(true);
    expect(lastPath).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// whoami
// ---------------------------------------------------------------------------

describe("whoami tool", () => {
  it("fetches the identity endpoint", async () => {
    mockResponse = { userId: "u-1", role: "owner" };
    const h = register(registerWhoamiTool);
    const r = await h({});
    expect(lastPath).toBe("/api/mcp/v1/me");
    expect(r.isError).toBeUndefined();
  });

  it("surfaces pmFetch errors", async () => {
    mockError = new Error("PM API error 401: invalid or missing token");
    const h = register(registerWhoamiTool);
    const r = await h({});
    expect(r.isError).toBe(true);
  });
});
