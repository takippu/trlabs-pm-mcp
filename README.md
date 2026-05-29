# trlabs-pm-mcp

A [Model Context Protocol](https://modelcontextprotocol.io) server that lets any MCP-compatible AI client (Claude Code, Claude Desktop, Cursor, Codex, Gemini CLI) read your **TR Labs PM** (Northstar) Client Requests over a personal access token.

It runs locally over stdio and calls your PM instance's `/api/mcp/v1/*` endpoints with `Authorization: Bearer <PM_TOKEN>`. Everything is scoped to what your token's user can see — you only ever read your own projects' CRs.

## Requirements

- **Node 18+** (for `npx` and built-in `fetch`).
- A PM account on `https://pm.trlabs.my` (or your own self-hosted Northstar instance).
- A **personal access token** — create one at **`https://pm.trlabs.my/settings/api-tokens`** (Settings → API access). The token is shown once; copy it immediately.

## Environment variables

| Variable | Required | Default | Notes |
|----------|----------|---------|-------|
| `PM_TOKEN` | yes | — | Your `pmk_…` token. The server exits if it's missing. |
| `PM_BASE_URL` | no | `https://pm.trlabs.my` | Point this at your own instance if self-hosting. |

## Setup per client

The server command is always `npx -y trlabs-pm-mcp` with `PM_TOKEN` in the environment. Pick your client below.

### Claude Code

```bash
claude mcp add --transport stdio --env PM_TOKEN=pmk_your_token --scope user trlabs-pm -- npx -y trlabs-pm-mcp
```

- `--scope user` makes it available across all your projects. Use `--scope local` (default) to keep it to the current project only.
- Add `--env PM_BASE_URL=https://your-instance` if self-hosting.
- Verify with `claude mcp list` or the `/mcp` command inside a session — look for `trlabs-pm` connected with the `read_cr` tool.

Or edit the JSON directly (`.mcp.json` for project scope, `~/.claude.json` for user scope). Claude Code supports `${VAR}` expansion so you can keep the token in your shell env instead of the file:

```json
{
  "mcpServers": {
    "trlabs-pm": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "trlabs-pm-mcp"],
      "env": {
        "PM_TOKEN": "${PM_TOKEN}",
        "PM_BASE_URL": "${PM_BASE_URL:-https://pm.trlabs.my}"
      }
    }
  }
}
```

### Claude Desktop

Edit `claude_desktop_config.json` (macOS: `~/Library/Application Support/Claude/`, Windows: `%APPDATA%\Claude\`), then restart Claude Desktop:

```json
{
  "mcpServers": {
    "trlabs-pm": {
      "command": "npx",
      "args": ["-y", "trlabs-pm-mcp"],
      "env": { "PM_TOKEN": "pmk_your_token" }
    }
  }
}
```

### Cursor

Edit `~/.cursor/mcp.json` (global) or `.cursor/mcp.json` (project):

```json
{
  "mcpServers": {
    "trlabs-pm": {
      "command": "npx",
      "args": ["-y", "trlabs-pm-mcp"],
      "env": { "PM_TOKEN": "pmk_your_token" }
    }
  }
}
```

### Codex CLI

Edit `~/.codex/config.toml`:

```toml
[mcp_servers.trlabs-pm]
command = "npx"
args = ["-y", "trlabs-pm-mcp"]
env = { PM_TOKEN = "pmk_your_token" }
```

### Gemini CLI

Edit `~/.gemini/settings.json`:

```json
{
  "mcpServers": {
    "trlabs-pm": {
      "command": "npx",
      "args": ["-y", "trlabs-pm-mcp"],
      "env": { "PM_TOKEN": "pmk_your_token" }
    }
  }
}
```

## The `read_cr` tool

Once connected, your AI can call `read_cr`:

- `read_cr({ requestId })` → a single Client Request with its full detail (status, priority, description, client expectation, category, phase, branch, decisions, comments, project).
- `read_cr({ projectId })` → a list (up to 100) of the project's CRs as lightweight summaries.
- Provide one or the other; `requestId` wins if both are given.

Errors (invalid token, no access, unreachable) come back as readable tool errors, not hangs. A `404` is returned for both "not found" and "no access" so the tool never reveals whether a CR you can't see exists.

## Security

- Your token is only ever sent to your `PM_BASE_URL` over HTTPS. It is never logged.
- The server writes only to stderr; stdout is reserved for the MCP protocol.
- Revoke a token any time at `https://pm.trlabs.my/settings/api-tokens` — it stops working immediately.
- Treat `pmk_…` like a password. Prefer the `${PM_TOKEN}` env-expansion form (Claude Code) over hardcoding it in a file that might be committed.

## Troubleshooting

- **`PM_TOKEN required` on startup** — the env var isn't set in your client config.
- **Every call returns "invalid or missing token"** — the token is wrong or revoked; mint a new one.
- **"PM API unreachable"** — `PM_BASE_URL` is wrong or the instance is down.
- **`npx` not found (Windows)** — ensure Node.js is installed and on `PATH`.

## License

MIT
