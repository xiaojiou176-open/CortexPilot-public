# Scripts

This directory contains repo-owned helper scripts for bootstrap, verification,
CI, hygiene, and release tasks.

## Common Entry Points

- `bootstrap.sh`
- `run_orchestrator_cli.sh`
- `run_orchestrator_pytest.sh`
- `test.sh`
- `test_quick.sh`
- `check_repo_hygiene.sh`
- `check_schedule_boundary.py`
- `docker_ci.sh`
- `prune_docker_runtime.sh`
- `build_space_governance_report.py`
- `check_space_cleanup_gate.py`
- `check_space_governance_inventory.py`
- `apply_space_cleanup.py`
- `cleanup_space.sh`

`run_orchestrator_pytest.sh` is the canonical repo-owned wrapper for
orchestrator pytest entrypoints. It resolves the managed Python toolchain,
exports `PYTHONDONTWRITEBYTECODE=1`, and keeps `PYTHONPATH=apps/orchestrator/src`
aligned so module docs do not rely on `uv run pytest` selecting a compatible
interpreter by accident.

`run_orchestrator_cli.sh` is the matching repo-owned wrapper for
`cortexpilot_orch.cli` commands. It keeps the managed Python toolchain and
`PYTHONPATH=apps/orchestrator/src` aligned so module docs do not depend on the
user's ambient Python environment.

## Audit Lane Notes

- Keep default blocking lanes focused on stable, repeatable checks.
- Public CI is hosted-first: fork PRs stay on low-privilege GitHub-hosted
  checks, while `ui-truth`, `resilience-and-e2e`, and `release-evidence` are
  protected `workflow_dispatch` lanes that require
  `owner-approved-sensitive`.
- `ui_audit_gate.sh` stages a temporary dashboard workspace for Lighthouse +
  axe verification; keep the required `packages/frontend-*` sources copied
  inside that temporary root so Next/Turbopack does not reject out-of-root
  symlinks during smoke builds.
- `install_dashboard_deps.sh` and `install_desktop_deps.sh` now escalate
  repeated pnpm `ERR_PNPM_ENOENT` failures from fresh-store retries to a
  workspace-local store recovery path instead of repeating the same failing
  copy strategy indefinitely.
- Bootstrap/install/docker-ci/clean-room entrypoints now run a rate-limited
  machine-cache auto-prune hook before creating new repo-owned external caches.
  The hook reuses `scripts/cleanup_runtime.sh apply` with root-noise cleanup
  disabled, so CortexPilot still has one cleanup world instead of a separate
  cache-only deletion path.
- Temporary pnpm retry stores now stay under `~/.cache/cortexpilot` with the
  shared `pnpm-store-local-*` naming contract instead of ad-hoc
  `pnpm-store-dashboard-retry.*` / `pnpm-store-desktop-retry.*` variants.
- Hosted CI lanes now try `sudo -E bash scripts/docker_ci.sh ...` only when
  passwordless sudo is available; otherwise they fall back to direct
  `bash scripts/docker_ci.sh ...` execution so `main` push lanes do not fail on
  runners that can invoke Docker without an interactive sudo prompt.
- `prune_docker_runtime.sh` is the dedicated Docker runtime lane helper for
  CortexPilot-owned local CI residue. It can remove stopped containers for the
  canonical core and desktop-native local CI images plus optional repo-prefixed
  volumes, while keeping workstation-global Docker/cache totals strictly
  observation-only.
- `docker_runtime_governance.py` is the structured report engine behind that
  lane. It writes `.runtime-cache/cortexpilot/reports/space_governance/docker_runtime.json`
  so Docker residue no longer exists only as shell stdout.
- `docker_ci.sh` now prefers repo-owned local buildx cache directories under
  `~/.cache/cortexpilot/docker-buildx-cache/` when `docker buildx` is
  available, which turns rebuildable Docker image cache into a governed
  repo-owned external cache instead of a purely opaque daemon-side layer.
  GitHub-hosted / in-container CI lanes intentionally keep that optimization
  disabled unless explicitly reopened, because the hosted Docker driver may not
  support local cache export.
- `docker_ci.sh` and `check_clean_room_recovery.sh` now keep their heavy
  machine-scoped temp roots under `~/.cache/cortexpilot/tmp/` by default
  (for example `tmp/docker-ci/runner-temp-*` and
  `tmp/clean-room-machine-cache.*`) so Darwin `TMPDIR` is no longer the
  default landing zone for those repo-owned heavy temp surfaces.
- `e2e_external_web_probe.py` no longer persists `run_id` in its JSON status
  and report artifacts; its JSON writer helpers no longer accept `run_id` as an
  input, and probe receipts now persist epoch timing fields, stage/category
  allowlists, and summarized artifacts from dedicated safe summary scalars
  only.
- `ci_slice_runner.sh` now exports `PYTHONDONTWRITEBYTECODE=1` before running
  the slice driver so hosted `policy-and-security` / `core-tests` lanes do
  not pollute the workspace with `__pycache__` residues mid-run.
- `ci_main_impl.sh` and `resolve_ci_policy.py` now write CI stage logs, policy
  snapshots, and the orchestrator coverage JSON under
  `.runtime-cache/test_output/ci/` so retention-report hygiene no longer flags
  root-level `test_output` residue during `main` push validation.
- `check_space_governance_inventory.py` now closes the loop between
  `runtime_artifact_policy.json`, `space_governance_policy.json`, and
  `cleanup_workspace_modules.sh`, so repo-local cleanup targets must be
  contract-declared before hygiene accepts them.
- `apply_space_cleanup.py` now records per-target reclaim estimates,
  post-cleanup verification commands, verification results, and rollback notes
  instead of treating deletion as a completed recovery by itself.
- `test_quick.sh` now keeps its quick-check logs under
  `.runtime-cache/test_output/governance/quick_checks/` so retention-report
  discipline no longer has to tolerate root-level `test_output` files.
- `check_schedule_boundary.py` now guards the queue/schedule runtime contract:
  `.runtime-cache/cortexpilot/queue.jsonl` must stay compatible with
  `queue_item.v1.json`, `scheduled_run.v1.json`, and `sla_state.v1.json`
  before repo-side hygiene accepts scheduling changes.
- `security_scan.sh` now filters a very small allowlist of non-verified,
  synthetic placeholder findings from test/example git history while still
  failing on every other trufflehog hit.
- `check_pip_audit_gate.py` now enforces Python dependency audit findings
  through a machine-readable ignore contract and only downgrades explicitly
  listed advisories when `pip-audit` exposes no published fix version.
- `install_dashboard_deps.sh` now detects `ERR_PNPM_ENOSPC` and retries with a
  workspace-local pnpm store plus hardlink imports so hosted `main`
  lanes can recover when copy-based installs exhaust the bind-mounted
  workspace volume.
- `install_desktop_deps.sh` now mirrors the same `ERR_PNPM_ENOSPC` recovery
  path, uses per-attempt workspace retry stores, and scopes hardlink imports
  to the recovery attempt so repeated hosted runs do not accumulate a
  long-lived desktop workspace cache.
- `install_dashboard_deps.sh` now records its install transcript under
  `.runtime-cache/logs/runtime/deps_install/install_dashboard_deps.log` even
  when its lock/retry bookkeeping still uses the temp state root.
- Run Gemini-backed UI audits explicitly when needed:
  - `python3 scripts/ui_ux_gemini_quick_gate.py`
  - `bash scripts/ci_slice_runner.sh ui-truth`
  - `bash scripts/ui_e2e_truth_gate.sh --strict-closeout`
- Desktop native Linux/BSD smoke and full Cargo.lock audits are
  explicit/manual lanes after the public desktop boundary moved to macOS-only.

## Rule Of Thumb

Prefer the scripts in this directory over one-off shell command sequences when
you need a repeatable repo workflow.
