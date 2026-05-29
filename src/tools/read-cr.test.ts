import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";

// Mock the api module before importing the tool
const mockPmFetch = mock(async (_path: string) => ({}));

mock.module("../lib/api.js", () => ({
  pmFetch: mockPmFetch,
}));

// Import after mocking
const { registerReadCrTool } = await import("./read-cr.js");

// Minimal McpServer stub
type ToolHandler = (args: { projectId?: string; requestId?: string }) => Promise<unknown>;

function createStubServer() {
  let capturedHandler: ToolHandler | null = null;

  const server = {
    registerTool: (
      _name: string,
      _config: unknown,
      handler: ToolHandler
    ) => {
      capturedHandler = handler;
    },
    getHandler: (): ToolHandler => {
      if (!capturedHandler) throw new Error("No handler registered");
      return capturedHandler;
    },
  };

  return server;
}

describe("read_cr tool handler", () => {
  beforeEach(() => {
    mockPmFetch.mockReset();
  });

  afterEach(() => {
    mockPmFetch.mockReset();
  });

  it("calls single CR endpoint when requestId is provided", async () => {
    const singleCr = { id: "cr_123", title: "Test CR" };
    mockPmFetch.mockResolvedValue(singleCr);

    const server = createStubServer();
    registerReadCrTool(server as never);
    const handler = server.getHandler();

    const result = await handler({ requestId: "cr_123" }) as {
      content: [{ type: string; text: string }];
      isError?: boolean;
    };

    expect(result.isError).toBeUndefined();
    expect(result.content[0].type).toBe("text");
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.id).toBe("cr_123");

    expect(mockPmFetch).toHaveBeenCalledTimes(1);
    expect(mockPmFetch.mock.calls[0][0]).toBe("/api/mcp/v1/crs/cr_123");
  });

  it("calls list endpoint when only projectId is provided", async () => {
    const crList = [{ id: "cr_1" }, { id: "cr_2" }];
    mockPmFetch.mockResolvedValue(crList);

    const server = createStubServer();
    registerReadCrTool(server as never);
    const handler = server.getHandler();

    const result = await handler({ projectId: "proj_abc" }) as {
      content: [{ type: string; text: string }];
      isError?: boolean;
    };

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toHaveLength(2);

    expect(mockPmFetch).toHaveBeenCalledTimes(1);
    expect(mockPmFetch.mock.calls[0][0]).toBe(
      "/api/mcp/v1/crs?projectId=proj_abc"
    );
  });

  it("prefers requestId when both requestId and projectId are provided", async () => {
    const singleCr = { id: "cr_999" };
    mockPmFetch.mockResolvedValue(singleCr);

    const server = createStubServer();
    registerReadCrTool(server as never);
    const handler = server.getHandler();

    const result = await handler({ requestId: "cr_999", projectId: "proj_xyz" }) as {
      content: [{ type: string; text: string }];
      isError?: boolean;
    };

    expect(result.isError).toBeUndefined();
    // Should have called single CR path, not list path
    expect(mockPmFetch.mock.calls[0][0]).toBe("/api/mcp/v1/crs/cr_999");
    expect(mockPmFetch).toHaveBeenCalledTimes(1);
  });

  it("returns tool error when neither requestId nor projectId is provided", async () => {
    const server = createStubServer();
    registerReadCrTool(server as never);
    const handler = server.getHandler();

    const result = await handler({}) as {
      content: [{ type: string; text: string }];
      isError: boolean;
    };

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Provide either");
    expect(mockPmFetch).not.toHaveBeenCalled();
  });

  it("treats whitespace-only ids as absent → tool error, no API call", async () => {
    const server = createStubServer();
    registerReadCrTool(server as never);
    const handler = server.getHandler();

    const result = (await handler({ requestId: "   ", projectId: "  " })) as {
      content: [{ type: string; text: string }];
      isError: boolean;
    };

    expect(result.isError).toBe(true);
    expect(mockPmFetch).not.toHaveBeenCalled();
  });

  it("URL-encodes ids with special characters", async () => {
    mockPmFetch.mockResolvedValue({ id: "x" });

    const server = createStubServer();
    registerReadCrTool(server as never);
    const handler = server.getHandler();

    await handler({ requestId: "cr/1 2" });
    // "/" and " " must be percent-encoded so they can't break the path.
    expect(mockPmFetch.mock.calls[0][0]).toBe("/api/mcp/v1/crs/cr%2F1%202");

    mockPmFetch.mockClear();
    await handler({ projectId: "p&a=b" });
    expect(mockPmFetch.mock.calls[0][0]).toBe(
      "/api/mcp/v1/crs?projectId=p%26a%3Db",
    );
  });

  it("returns tool error when API throws", async () => {
    mockPmFetch.mockRejectedValue(new Error("PM API error 404: not found"));

    const server = createStubServer();
    registerReadCrTool(server as never);
    const handler = server.getHandler();

    const result = await handler({ requestId: "bad_cr" }) as {
      content: [{ type: string; text: string }];
      isError: boolean;
    };

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("PM API error 404");
  });
});
