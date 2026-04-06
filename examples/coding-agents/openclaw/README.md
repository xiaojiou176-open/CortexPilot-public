# OpenClaw example

OpenClaw already has native plugin and skills surfaces. This folder shows the
truthful CortexPilot position inside that ecosystem.

## Start here

1. Use the compatible bundle at:

   ```text
   examples/coding-agents/plugin-bundles/cortexpilot-coding-agent-bundle/
   ```

2. Pair it with the shared read-only MCP config example:

   ```text
   examples/coding-agents/mcp/readonly.mcp.json.example
   ```

3. Keep CortexPilot on the proof / replay / read-only integration side unless a
   native published OpenClaw path is explicitly shipped and tested.

## Boundary

- This is a compatible local bundle example, not a published ClawHub item.
- It helps OpenClaw workflows reuse CortexPilot skills and read-only MCP.
- It does not upgrade CortexPilot into a hosted operator or write-capable MCP
  product.
