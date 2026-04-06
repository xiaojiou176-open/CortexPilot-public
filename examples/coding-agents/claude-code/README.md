# Claude Code example

This folder shows a truthful CortexPilot starter for Claude Code style
workflows without inventing a published marketplace package.

## What is here

- `.claude/commands/cortexpilot-proof.md`: a slash-command style playbook
- `.claude/agents/cortexpilot-reviewer.md`: a focused reviewer/subagent prompt
- `project.mcp.json`: a project-local MCP example for the real read-only server
- `../mcp/readonly.mcp.json.example`: the shared read-only MCP config example
- `../plugin-bundles/cortexpilot-coding-agent-bundle/`: a local plugin-dir
  bundle with the same skill plus plugin-scoped MCP wiring

## Suggested setup

1. Copy `.claude/commands/` and `.claude/agents/` into your project.
2. Copy `project.mcp.json` into your project root as `.mcp.json`, or use
   `../mcp/readonly.mcp.json.example` as the shared host-level template and
   replace `__CORTEXPILOT_REPO_ROOT__`.
3. Keep the read order aligned with CortexPilot truth sources:
   - `README.md`
   - `docs/README.md`
   - `AGENTS.md`
   - the public compatibility / integration / MCP guides

## Boundary

- This is a project-local example plus a local plugin-dir seed, not a published
  marketplace listing.
- The MCP example is read-only.
- Hosted, write-capable MCP, and official plugin claims remain out of scope.
