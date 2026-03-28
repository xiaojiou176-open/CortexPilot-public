# CLAUDE.md

This file mirrors the root AI entrypoint for tools that prefer `CLAUDE.md`.

## Read First

1. `README.md`
2. `docs/README.md`
3. `docs/specs/00_SPEC.md`
4. `docs/architecture/runtime-topology.md`
5. `AGENTS.md`

## Working Rules

- keep diffs small and auditable
- run real verification commands before claiming success
- keep docs and code synchronized
- keep runtime output out of tracked source
- treat `configs/github_control_plane_policy.json` as the machine SSOT for
  required check names, and point human-facing summaries back to the root
  `README.md` instead of duplicating the list here
- when dashboard dependency lock refreshes land, keep the app-local dashboard
  lockfile aligned with the root workspace lock updates and document the change
- when dashboard or desktop lock maintenance changes the shipped dependency
  contract, update the root docs entrypoints in the same patch so doc-sync and
  closeout gates describe the live state
- when one closeout patch touches both dashboard and desktop packaging, mirror
  that decision in the root docs entrypoints instead of relying on module docs
  alone
- when the live public GitHub surface moves or changes repository URLs, sync
  the root docs/security/storefront entrypoints in the same patch so
  repo-side links do not drift behind the published `CortexPilot-public`
  surface
- when security reporting wording changes, keep `SECURITY.md`, `SUPPORT.md`,
  issue template contact links, and the root README aligned in the same patch
- when dashboard/operator wording or intake/runtime contracts change, sync the
  root AI/docs entrypoints in the same patch so doc-sync gates keep following
  the live English-first dashboard surface and the current intake/probe rules
- when CI maintenance changes the Python dependency audit contract or the
  tracked runtime report namespaces, sync the root AI/docs entrypoints in the
  same patch; current examples include `.runtime-cache/test_output/ci/` and
  `configs/pip_audit_ignored_advisories.json`, plus the dashboard
  and desktop install-time ENOSPC recovery knobs plus the Docker daemon
  precheck retry knobs registered in `configs/env.registry.json`; current CI
  credential/evidence examples also include the upstream receipt refresh
  fallback to `scripts/verify_upstream_slices.py --mode smoke` and the strict
  live-provider rule that resolves process env first and `~/.codex/config.toml`
  second while keeping dotenv and shell-export fallbacks disabled on mainline

## Key Commands

- `npm run bootstrap`
- `npm run test`
- `npm run test:quick`
- `npm run space:audit`
- `bash scripts/check_repo_hygiene.sh`
- `pre-commit run --all-files`
