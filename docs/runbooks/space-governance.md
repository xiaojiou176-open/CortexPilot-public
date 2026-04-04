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
npm run docker:runtime:audit
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
- Heavy machine-scoped temp producers also belong to that same governed
  namespace: local `docker_ci` host runner temp now defaults to
  `~/.cache/cortexpilot/tmp/docker-ci/runner-temp-*`, while clean-room
  recovery uses `~/.cache/cortexpilot/tmp/clean-room-machine-cache.*` and
  `~/.cache/cortexpilot/tmp/clean-room-preserve.*`.
- Shared ecosystem layers such as Docker Desktop, global Cargo/Rustup, global
  uv, and global Playwright remain observation-only unless a separate audit
  proves safe attribution.
- Cross-repo symlink targets, such as Python toolchains that resolve into
  another repo namespace, are never treated as single-repo cleanup targets.

## Docker Runtime Lane

Use the dedicated Docker runtime lane when disk pressure is dominated by the
local CI image family or builder cache:

```bash
npm run docker:runtime:audit
npm run docker:runtime:prune:rebuildable
npm run docker:runtime:prune:aggressive
npm run docker:runtime:prune:aggressive:full
```

Current semantics:

- `docker:runtime:audit` reports `cortexpilot-ci-core:local`,
  `cortexpilot-ci-desktop-native:local`, stopped containers derived from those
  images, repo-related named volumes, and a workstation-global Docker summary
  for observation only
- `docker:runtime:prune:rebuildable` removes stopped CortexPilot-owned
  containers only
- `docker:runtime:prune:aggressive` extends rebuildable cleanup and may also
  remove the canonical local CI image or repo-related named volumes when
  explicitly unlocked with `--include-image` / `--include-volumes`
- `docker:runtime:prune:aggressive:full` is the package-level convenience alias
  that unlocks both image and repo-related volume removal

The Docker runtime lane is the canonical operator path for Docker-heavy local
CI residue. Keep `space:cleanup:wave*` focused on repo-local residue and the
governed `~/.cache/cortexpilot` namespace. Workstation-global Docker/cache
totals remain observation-only and are not apply targets for this lane.

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
  `pnpm-store/dashboard`, `pnpm-store/desktop`, `pnpm-store/v10`,
  `playwright`, and the governed machine-temp roots under `tmp/`, not the
  rollup root.
- The repo-owned machine-temp roots are part of `wave3`, not generic system
  temp cleanup. Current examples are:
  - `tmp/docker-ci/runner-temp-*`
  - `tmp/clean-room-machine-cache.*`
  - `tmp/clean-room-preserve.*`
- These paths stay `repo_external_related`, must resolve inside
  `~/.cache/cortexpilot/tmp/**`, and must fail closed if they escape into
  unrelated temp roots or shared/system-owned browser temp trees.
- Docker runtime is now a separate operator lane rather than part of the
  generic wave cleanup:
  - `npm run docker:runtime:audit`
  - `npm run docker:runtime:prune:rebuildable`
  - `npm run docker:runtime:prune:aggressive`
  - `npm run docker:runtime:prune:aggressive:full`
- Lane semantics:
  - `audit` inventories `cortexpilot-ci-core:local`,
    `cortexpilot-ci-desktop-native:local`, exited repo containers, repo-related
    named volumes, and a workstation-global Docker summary that is explicitly
    observation-only.
  - `rebuildable` removes exited repo containers and keeps shared Docker/cache
    layers untouched.
  - `aggressive` can additionally remove `cortexpilot-ci-core:local` and
    `cortexpilot-ci-desktop-native:local` when they are not backing running
    containers.
  - `aggressive:full` extends `aggressive` by also removing repo-related named
    volumes that match the configured prefix.
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
