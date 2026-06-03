import { describe, it, expect, mock, beforeEach } from "bun:test";

// Mock the api module before importing the tools.
const mockPmFetch = mock(
  async (_path: string, _init?: unknown): Promise<unknown> => ({
    result: {},
    undo: null,
  }),
);

mock.module("../lib/api.js", () => ({ pmFetch: mockPmFetch }));

const { registerCreateCrTool } = await import("./create-cr.js");
const { registerUpdateTaskStatusTool } = await import(
  "./update-task-status.js"
);
const { registerAddChecklistItemsTool } = await import(
  "./add-checklist-items.js"
);
const { registerRevertWriteTool } = await import("./revert-write.js");

type Handler = (args: Record<string, unknown>) => Promise<{
  isError?: boolean;
  content: [{ type: string; text: string }];
}>;

function stub(register: (s: never) => void): {
  handler: Handler;
  config: { annotations?: Record<string, unknown> };
} {
  let handler: Handler | null = null;
  let config: { annotations?: Record<string, unknown> } = {};
  const server = {
    registerTool: (_name: string, cfg: unknown, h: Handler) => {
      config = cfg as { annotations?: Record<string, unknown> };
      handler = h;
    },
  };
  register(server as never);
  if (!handler) throw new Error("no handler registered");
  return { handler, config };
}

function lastInit(): { method?: string; body?: Record<string, unknown> } {
  return mockPmFetch.mock.calls[0][1] as {
    method?: string;
    body?: Record<string, unknown>;
  };
}

describe("write tools", () => {
  beforeEach(() => mockPmFetch.mockReset());

  it("create_cr POSTs projectId/title/description and is marked destructive", async () => {
    mockPmFetch.mockResolvedValue({
      result: { id: "cr1" },
      undo: { op: "delete_cr", requestId: "cr1" },
    });
    const { handler, config } = stub(registerCreateCrTool);

    const res = await handler({ projectId: "p1", title: "Hello", description: "d" });
    expect(res.isError).toBeUndefined();
    expect(mockPmFetch.mock.calls[0][0]).toBe("/api/mcp/v1/crs");
    expect(lastInit().method).toBe("POST");
    expect(lastInit().body).toEqual({
      projectId: "p1",
      title: "Hello",
      description: "d",
    });
    expect(config.annotations?.readOnlyHint).toBe(false);
    expect(config.annotations?.destructiveHint).toBe(true);
  });

  it("create_cr errors (no fetch) without a title", async () => {
    const { handler } = stub(registerCreateCrTool);
    const res = await handler({ projectId: "p1", title: "  " });
    expect(res.isError).toBe(true);
    expect(mockPmFetch).not.toHaveBeenCalled();
  });

  it("update_task_status POSTs to /tasks/<id>/status with {status}", async () => {
    mockPmFetch.mockResolvedValue({ result: { id: "t1" }, undo: null });
    const { handler } = stub(registerUpdateTaskStatusTool);
    await handler({ taskId: "t1", status: "done" });
    expect(mockPmFetch.mock.calls[0][0]).toBe("/api/mcp/v1/tasks/t1/status");
    expect(lastInit().method).toBe("POST");
    expect(lastInit().body).toEqual({ status: "done" });
  });

  it("add_checklist_items trims+filters items and POSTs to /tasks/<id>/checklist", async () => {
    mockPmFetch.mockResolvedValue({ result: { id: "t1" }, undo: null });
    const { handler } = stub(registerAddChecklistItemsTool);
    await handler({ taskId: "t1", items: ["  a  ", "", "b"] });
    expect(mockPmFetch.mock.calls[0][0]).toBe("/api/mcp/v1/tasks/t1/checklist");
    expect(lastInit().body).toEqual({ items: ["a", "b"] });
  });

  it("add_checklist_items errors (no fetch) when every item is blank", async () => {
    const { handler } = stub(registerAddChecklistItemsTool);
    const res = await handler({ taskId: "t1", items: ["  ", ""] });
    expect(res.isError).toBe(true);
    expect(mockPmFetch).not.toHaveBeenCalled();
  });

  it("revert_write POSTs the undo descriptor to /revert", async () => {
    mockPmFetch.mockResolvedValue({ result: { deleted: "cr1" } });
    const { handler, config } = stub(registerRevertWriteTool);
    await handler({ op: "delete_cr", requestId: "cr1" });
    expect(mockPmFetch.mock.calls[0][0]).toBe("/api/mcp/v1/revert");
    expect(lastInit().method).toBe("POST");
    expect(lastInit().body?.op).toBe("delete_cr");
    expect(lastInit().body?.requestId).toBe("cr1");
    expect(config.annotations?.destructiveHint).toBe(true);
  });
});
