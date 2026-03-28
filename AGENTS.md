# AGENTS Guide

## Mission

Work in CortexPilot as a contract-first engineering agent:

- keep diffs small and auditable
- keep code and docs in sync
- verify behavior with real commands before claiming success
- never commit runtime caches, local secrets, logs, or generated noise

## Canonical Read Order

1. `README.md`
2. `docs/README.md`
3. `docs/specs/00_SPEC.md`
4. `docs/architecture/runtime-topology.md`
5. nearest local wrapper under `apps/*/AGENTS.md` or `apps/*/CLAUDE.md`

## Key Commands

- bootstrap: `npm run bootstrap`
- fast verification: `npm run test:quick`
- main local gate: `npm run test`
- space audit: `npm run space:audit`
- hygiene: `bash scripts/check_repo_hygiene.sh`
- truth split: `npm run truth:triage`
- full pre-commit: `pre-commit run --all-files`

## Change Rules

- update tests when behavior changes
- update docs when commands, APIs, or public behavior change
- keep public docs English-first and minimal
- keep runtime output under `.runtime-cache/`
- prefer repo-owned scripts over ad-hoc shell glue
- treat `configs/github_control_plane_policy.json` as the machine SSOT for
  required check names, and reuse the root `README.md` required-check summary
  instead of restating the names here
- when dashboard dependency lock refreshes land, update
  `apps/dashboard/pnpm-lock.yaml` together with the root `package.json` /
  `pnpm-lock.yaml` change set and sync the dashboard-facing docs
- when dashboard or desktop transitive security fixes change the maintained
  lock surfaces, sync the root AI/docs entrypoints in the same change set so
  doc-sync gates stay aligned with the live maintenance contract
- when closeout work lands across both dashboard and desktop packaging surfaces,
  update the root entrypoint docs in the same patch instead of relying only on
  module-local README changes
- when the live public GitHub surface moves or changes repository URLs, sync the
  root docs/security/storefront entrypoints in the same patch so repo-side
  links do not drift behind the published `CortexPilot-public` surface
- when security reporting wording changes, keep `SECURITY.md`, `SUPPORT.md`,
  issue template contact links, and the root README aligned in the same patch
- when dashboard/operator wording or intake/runtime contracts change, sync the
  root AI/docs entrypoints in the same patch so doc-sync gates can trace the
  live English-first dashboard surface and the current intake/probe contracts
- when CI maintenance changes the Python dependency audit contract or the
  tracked runtime report namespaces, sync the root AI/docs entrypoints in the
  same patch; current examples include `.runtime-cache/test_output/ci/` and
  `configs/pip_audit_ignored_advisories.json`

## Local Overrides

- `apps/orchestrator/AGENTS.md`
- `apps/dashboard/AGENTS.md`
- `apps/desktop/AGENTS.md`
