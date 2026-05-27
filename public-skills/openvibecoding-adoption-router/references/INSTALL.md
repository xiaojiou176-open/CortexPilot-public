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

Use `OPENHANDS_MCP_CONFIG.json` as the starting point for your host config.

## OpenClaw example

Use `OPENCLAW_MCP_CONFIG.json` as the starting point for your host config.

## Smoke check

Use a minimal MCP handshake and `tools/list` request after the host attaches the
server.
