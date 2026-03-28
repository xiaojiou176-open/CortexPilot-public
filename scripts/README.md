# Scripts

This directory contains repo-owned helper scripts for bootstrap, verification,
CI, hygiene, and release tasks.

## Common Entry Points

- `bootstrap.sh`
- `test.sh`
- `test_quick.sh`
- `check_repo_hygiene.sh`
- `docker_ci.sh`
- `build_space_governance_report.py`
- `check_space_cleanup_gate.py`
- `apply_space_cleanup.py`
- `cleanup_space.sh`

## Audit Lane Notes

- Keep default blocking lanes focused on stable, repeatable checks.
- Self-hosted CI lanes now try `sudo -E bash scripts/docker_ci.sh ...` only when
  passwordless sudo is available; otherwise they fall back to direct
  `bash scripts/docker_ci.sh ...` execution so `main` push lanes do not fail on
  runners that can invoke Docker without an interactive sudo prompt.
- `e2e_external_web_probe.py` no longer persists `run_id` in its JSON status
  and report artifacts; its JSON writer helpers no longer accept `run_id` as an
  input, and probe receipts now persist epoch timing fields, stage/category
  allowlists, and summarized artifacts from dedicated safe summary scalars
  only.
- `ci_slice_runner.sh` now exports `PYTHONDONTWRITEBYTECODE=1` before running
  the slice driver so self-hosted `policy-and-security` / `core-tests` lanes do
  not pollute the workspace with `__pycache__` residues mid-run.
- `ci_main_impl.sh` and `resolve_ci_policy.py` now write CI stage logs, policy
  snapshots, and the orchestrator coverage JSON under
  `.runtime-cache/test_output/ci/` so retention-report hygiene no longer flags
  root-level `test_output` residue during `main` push validation.
- `security_scan.sh` now filters a very small allowlist of non-verified,
  synthetic placeholder findings from test/example git history while still
  failing on every other trufflehog hit.
- `check_pip_audit_gate.py` now enforces Python dependency audit findings
  through a machine-readable ignore contract and only downgrades explicitly
  listed advisories when `pip-audit` exposes no published fix version.
- `install_dashboard_deps.sh` now detects `ERR_PNPM_ENOSPC` and retries with a
  workspace-local pnpm store plus hardlink imports so self-hosted `main`
  lanes can recover when copy-based installs exhaust the bind-mounted
  workspace volume.
- `install_desktop_deps.sh` now mirrors the same `ERR_PNPM_ENOSPC` recovery
  path, uses per-attempt workspace retry stores, and scopes hardlink imports
  to the recovery attempt so repeated self-hosted runs do not accumulate a
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
