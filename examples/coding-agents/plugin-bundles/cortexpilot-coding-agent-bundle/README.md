# CortexPilot coding-agent bundle

This bundle keeps one repo-owned starter pack compatible with:

- Codex local marketplace installs
- Claude Code local `--plugin-dir` development
- OpenClaw compatible bundle installs from a local path or link

## What is inside

- `.codex-plugin/plugin.json`: Codex bundle metadata
- `.claude-plugin/plugin.json`: Claude Code plugin metadata
- `.mcp.json`: plugin-scoped read-only MCP wiring
- `skills/cortexpilot-adoption-router/SKILL.md`: route the job to the right
  CortexPilot lane without overclaiming
- `commands/cortexpilot-proof.md`: Claude-style proof-first command
- `agents/cortexpilot-reviewer.md`: Claude-style focused reviewer prompt
- `bin/run-cortexpilot-readonly-mcp.sh`: repo-aware wrapper for the real
  read-only MCP server

## How the MCP wrapper behaves

The wrapper works in two truthful modes:

1. If the bundle still lives inside a real CortexPilot clone, it auto-discovers
   the repo root.
2. If the bundle is installed somewhere else, set `CORTEXPILOT_REPO_ROOT` to
   the real clone path before you load the plugin.

The wrapper always runs the real stdio server through the repo-owned top-level wrapper:

```bash
bash /absolute/path/to/CortexPilot/scripts/run_readonly_mcp.sh
```

Under the hood that wrapper still launches `python3 -m cortexpilot_orch.cli mcp-readonly-server`
with the repo-local Python path exported first. It never upgrades the public
contract into hosted or write-capable MCP.
