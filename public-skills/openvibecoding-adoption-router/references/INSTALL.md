# Install The Current Live Public Codeflow MCP

Use the current live public PyPI package, not a repo-local checkout.

## Published package

- package: `codeflow-orchestrator==0.1.0a4`
- executable: `codeflow-readonly-mcp`
- transport: `stdio`

Current truth:

- the executable uses the Codeflow name
- the primary live published PyPI package now also uses the Codeflow name
- the package path above is the canonical public install path

## OpenHands example

Use `OPENHANDS_MCP_CONFIG.json` as the starting point for your host config.

## OpenClaw example

Use `OPENCLAW_MCP_CONFIG.json` as the starting point for your host config.

## Smoke check

Use a minimal MCP handshake and `tools/list` request after the host attaches the
server.
