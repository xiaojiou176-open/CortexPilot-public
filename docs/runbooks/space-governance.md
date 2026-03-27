# Space Governance

Use the repo-owned space governance workflow when you need a repeatable
disk-space audit or a guarded cleanup plan.

## Commands

```bash
npm run space:audit
npm run space:gate:wave1
npm run space:gate:wave2
npm run space:gate:wave3
bash scripts/cleanup_space.sh wave1 dry-run
```

## What The Workflow Produces

- `.runtime-cache/cortexpilot/reports/space_governance/report.json`
- `.runtime-cache/cortexpilot/reports/space_governance/report.md`
- `.runtime-cache/test_output/space_governance/cleanup_gate_<wave>.json`

## Policy Boundaries

- Repo-internal high-yield surfaces include dashboard/desktop `node_modules`,
  orchestrator `.venv`, and desktop `dist`.
- Repo-external strong-related surfaces are limited to the CortexPilot machine
  cache namespace under `~/.cache/cortexpilot`.
- Shared ecosystem layers such as Docker Desktop, global Cargo/Rustup, global
  uv, and global Playwright remain observation-only unless a separate audit
  proves safe attribution.
- Cross-repo symlink targets, such as Python toolchains that resolve into
  another repo namespace, are never treated as single-repo cleanup targets.

## Cleanup Rules

- Always run the audit and the wave gate before any cleanup apply step.
- `wave1` is for low-risk repo-local residue.
- `wave2` is for repo-local dependency surfaces and must be executed one target
  at a time with reinstall verification after each cleanup.
- `wave3` is for `~/.cache/cortexpilot` and requires explicit shared-cache
  confirmation.
- A blocked gate means stop.
- A manual-confirmation gate means the path is hot or shared and needs an
  explicit override before apply.
- Apply only from a freshly generated gate artifact; stale gate JSON or
  cross-repo symlink targets must fail closed rather than partially cleaning.
