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
  allowlists, and summarized artifacts only.
- Run Gemini-backed UI audits explicitly when needed:
  - `python3 scripts/ui_ux_gemini_quick_gate.py`
  - `bash scripts/ci_slice_runner.sh ui-truth`
  - `bash scripts/ui_e2e_truth_gate.sh --strict-closeout`
- Desktop native Linux/BSD smoke and full Cargo.lock audits are
  explicit/manual lanes after the public desktop boundary moved to macOS-only.

## Rule Of Thumb

Prefer the scripts in this directory over one-off shell command sequences when
you need a repeatable repo workflow.
