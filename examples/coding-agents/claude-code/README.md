# Claude Code example

This folder shows a truthful CortexPilot starter for Claude Code style
workflows without inventing a marketplace package.

## What is here

- `.claude/commands/cortexpilot-proof.md`: a slash-command style playbook
- `.claude/agents/cortexpilot-reviewer.md`: a focused reviewer/subagent prompt
- `../mcp/readonly.mcp.json.example`: the shared read-only MCP config example

## Suggested setup

1. Copy `.claude/commands/` and `.claude/agents/` into your project.
2. Copy `../mcp/readonly.mcp.json.example` to the MCP config path used by your
   Claude Code setup and replace `__CORTEXPILOT_REPO_ROOT__`.
3. Keep the read order aligned with CortexPilot truth sources:
   - `README.md`
   - `docs/README.md`
   - `AGENTS.md`
   - the public compatibility / integration / MCP guides

## Boundary

- This is a project-local example, not a marketplace listing.
- The MCP example is read-only.
- Hosted, write-capable MCP, and official plugin claims remain out of scope.
