# Install The Current Live Public Agentcoder MCP

Use the current live public PyPI package, not a repo-local checkout.

## Published package

- package: `agentcoder-orchestrator==0.1.0a4`
- executable: `agentcoder-readonly-mcp`
- transport: `stdio`

Current truth:

- the executable uses the Agentcoder name
- the primary live published PyPI package now also uses the Agentcoder name
- the package path above is the canonical public install path

## OpenHands example

Add the server to `~/.openhands/config.toml`:

```toml
[mcp]
stdio_servers = [
  { name = "agentcoder-readonly", command = "uvx", args = ["--from", "agentcoder-orchestrator==0.1.0a4", "agentcoder-readonly-mcp"] }
]
```

## OpenClaw example

Add the server to your saved MCP server config:

```json
{
  "mcp": {
    "servers": {
      "agentcoder-readonly": {
        "command": "uvx",
        "args": ["--from", "agentcoder-orchestrator==0.1.0a4", "agentcoder-readonly-mcp"]
      }
    }
  }
}
```

## Smoke check

Use a minimal MCP handshake and `tools/list` request after the host attaches the
server.
