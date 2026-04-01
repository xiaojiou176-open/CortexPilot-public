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
- docker runtime audit: `npm run docker:runtime:audit`
- hygiene: `bash scripts/check_repo_hygiene.sh`
- truth split: `npm run truth:triage`
- full pre-commit: `pre-commit run --all-files`

## Generated Governance Context

<!-- GENERATED:ci-topology-summary:start -->
- trust flow: `ci-trust-boundary -> quick-feedback -> hosted policy/core slices -> pr-release-critical-gates -> pr-ci-gate`
- hosted policy/core slices: `policy-and-security, core-tests`
- untrusted PR path: `quick-feedback -> untrusted-pr-basic-gates -> pr-ci-gate`
- protected sensitive lanes: `workflow_dispatch -> owner-approved-sensitive -> ui-truth / resilience-and-e2e / release-evidence`
- canonical machine SSOT: `configs/ci_governance_policy.json`
<!-- GENERATED:ci-topology-summary:end -->

<!-- GENERATED:current-run-evidence-summary:start -->
- authoritative release-truth builders must consume `.runtime-cache/cortexpilot/reports/ci/current_run/source_manifest.json`.
- the live current-run authority verdict belongs to `python3 scripts/check_ci_current_run_sources.py` and `.runtime-cache/cortexpilot/reports/ci/current_run/consistency.json`.
- current-run builders: `artifact_index/current_run_index`, `cost_profile`, `runner_health`, `slo`, `portal`, `provenance`.
- docs and wrappers must not hand-maintain live current-run status; they must point readers back to the checker receipts.
- if the current-run source manifest is missing, authoritative current-run reports must fail closed or run only in explicit advisory mode.
<!-- GENERATED:current-run-evidence-summary:end -->

<!-- GENERATED:coverage-summary:start -->
- repo coverage snapshot unavailable
- run `npm run coverage:repo` to refresh this fragment.
<!-- GENERATED:coverage-summary:end -->

## Change Rules

- update tests when behavior changes
- update docs when commands, APIs, or public behavior change
- keep public docs English-first and minimal
- keep runtime output under `.runtime-cache/`
- prefer repo-owned scripts over ad-hoc shell glue
- keep public CI hosted-first: fork PRs stay low-privilege on GitHub-hosted
  lanes, and sensitive verification stays on protected manual dispatch lanes
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
  `configs/pip_audit_ignored_advisories.json`, plus the dashboard
  and desktop install-time ENOSPC recovery knobs plus the Docker daemon
  precheck retry knobs registered in `configs/env.registry.json`; current CI
  credential/evidence examples also include the upstream receipt refresh
  fallback to `scripts/verify_upstream_slices.py --mode smoke` and the strict
  live-provider rule that resolves process env first and `~/.codex/config.toml`
  second while keeping dotenv and shell-export fallbacks disabled on mainline
- when runtime retention and space-governance contracts change, sync the root
  AI/docs entrypoints in the same patch; current examples include
  `log_lane_summary` + `space_bridge` in `retention_report.json`, serial-only
  heavy cleanup execution ordering, cleanup inventory consistency checks, and
  the rule that repo-external apply scope stays inside `~/.cache/cortexpilot`
  while shared observation layers remain report-only
- when workflow-case / proof-pack / compare / task-pack / queue-scheduling
  contracts change, sync the root AI/docs entrypoints in the same patch; the
  current examples are `.runtime-cache/cortexpilot/workflow-cases/`,
  `proof_pack.json`, dedicated run-compare surfaces, desktop Flight Plan
  preview, and timezone-safe queue scheduling inputs
- when Version B closeout work changes the public front door, shared locale
  substrate, read-only MCP exposure, or operator-copilot surfaces, sync
  `README.md`, `docs/index.html`, `docs/releases/first-public-release-draft.md`,
  `apps/orchestrator/README.md`, and the root AI entrypoints in the same patch
  so doc-drift and doc-sync gates can trace the same Command Tower / Workflow
  Cases / Proof & Replay contract

## Local Overrides

- `apps/orchestrator/AGENTS.md`
- `apps/dashboard/AGENTS.md`
- `apps/desktop/AGENTS.md`
