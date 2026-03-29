# Space Governance

Use the repo-owned space governance workflow when you need a repeatable
disk-space audit or a guarded cleanup plan.

This workflow now sits beside runtime retention rather than replacing it:

- `retention.py` owns canonical runtime lanes such as `.runtime-cache/logs`,
  `.runtime-cache/cache`, runs/worktrees/contracts/intakes/codex-homes, and
  emits `retention_report.json`.
- `space_governance.py` owns high-yield cleanup candidates, low-risk workspace
  residue, and repo-external strong-related cache surfaces, and emits
  `space_governance/report.{json,md}` plus gated cleanup receipts.

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
- `wave1` is for low-risk repo-local residue such as `__pycache__`,
  `.pytest_cache`, `.next`, `dist`, `*.tsbuildinfo`, and aged runtime temp or
  evidence children.
- `wave2` is for repo-local dependency surfaces and gray-zone build outputs.
  Heavy repo-local targets stay serial-only: clean one, rebuild/verify it, then
  move to the next.
- `wave3` is for `~/.cache/cortexpilot` and requires explicit shared-cache
  confirmation. The preferred apply targets are child paths such as
  `pnpm-store/dashboard`, `pnpm-store/desktop`, `pnpm-store/v10`, and
  `playwright`, not the rollup root.
- A blocked gate means stop.
- A manual-confirmation gate means the path is hot or shared and needs an
  explicit override before apply.
- Apply only from a freshly generated gate artifact; stale gate JSON or
  cross-repo symlink targets must fail closed rather than partially cleaning.
- `observe-only` means the object can appear in reports but must not enter apply
  scope. This covers shared observation layers and high-risk gray zones such as
  `~/.cache/cortexpilot/toolchains/python/current` until live owner validation
  exists.
- Cleanup receipts now carry expected reclaim bytes, execution order,
  post-cleanup verification commands, and per-target verification outcomes so a
  cleanup step cannot be mistaken for a completed recovery.
