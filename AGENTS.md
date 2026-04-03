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
- when runtime-provider compatibility changes the orchestrator client contract,
  sync the root AI/docs entrypoints in the same patch; current examples include
  the Switchyard runtime-first `/v1/runtime/invoke` adapter, the forced
  `chat_completions` mode on chat-only intake/operator paths, and the explicit
  fail-closed rule for MCP tool execution that still requires a tool-capable
  provider path
- when role-contract / prompt-ref / handoff-summary semantics change the
  orchestrator contract or preview surfaces, sync the root AI/docs entrypoints
  in the same patch; current examples include resolved `role_contract`,
  intake `role_contract_summary`, summary/risk-only handoff, and the
  governance-backed metadata in `policies/agent_registry.json` plus
  `configs/env_direct_read_allowlist.json`
- when Prompt 4-style binding/read-surface work extends those role-contract
  surfaces, keep the root AI/docs entrypoints aligned in the same patch;
  current examples include contract-derived `role_binding_summary` in
  PM-facing `run_intake(...)` responses plus the same summary persisted into
  run manifests, alongside registry-backed SEARCHER/RESEARCHER
  `mcp_bundle_ref` hardening in `policies/agent_registry.json`
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
- when ecosystem-binding, builder-entrypoint, or distribution-facing surfaces
  change, sync the root AI/docs entrypoints in the same patch; current examples
  include `docs/architecture/ecosystem-and-builder-surfaces-v1.md`, the
  package-facing `frontend-api-client` / `frontend-shared` READMEs, and the
  dashboard home/docs landing sections that explain Codex / Claude Code /
  read-only MCP plus the first-run -> proof -> share loop
- when a later Phase 2 wave adds dedicated public sub-entrypoints (for example
  `/ecosystem/`, `/builders/`, `/use-cases/`) or moves additional dashboard home
  hero/ecosystem/AI/builder copy into the shared locale substrate, sync the
  root AI/docs entrypoints in the same patch so doc-sync gates can trace the
  new discoverability surfaces without guessing
- when a follow-up Phase 2 wave adds a public `AI + MCP + API` hub or makes
  the dashboard-home locale toggle drive server-rendered copy through
  cookie-backed preference sync, update the root AI/docs entrypoints and
  release-facing docs in the same patch so doc-sync gates can trace both the
  discoverability layer and the locale-contract change; current examples
  include `docs/ai-surfaces/index.html`, the extracted
  `apps/dashboard/components/DashboardHomeStorySections.tsx` narrative surface,
  and the AI Work Command Tower wording shared by the dashboard metadata and
  the public Pages front door
- when that same wave also extracts dashboard-home story sections into a
  dedicated shared-copy component, keep this root guide, `CLAUDE.md`, and
  `CHANGELOG.md` aligned in the same patch so quick-feedback gates can trace
  the new locale-aware rendering path instead of guessing from page-local code
- keep the root wording aligned when the dashboard home starts mixing
  cookie-backed locale SSR with client-side locale refresh, because that split
  is easy to miss in page-only diffs
- the current concrete examples are `docs/ai-surfaces/index.html`,
  `apps/dashboard/components/DashboardHomeStorySections.tsx`,
  `packages/frontend-shared/uiLocale.ts`, and dashboard metadata that now says
  "AI Work Command Tower for Codex, Claude Code, and MCP"
- when the next Phase 2 wave hardens desktop `Run Detail` / `Overview`
  operator wording through the shared locale and shared status-presentation
  substrate, sync the root AI/docs entrypoints in the same patch; current
  examples include `apps/desktop/README.md`,
  `packages/frontend-shared/uiCopy.ts`, and the locale-aware desktop tests for
  `RunDetailPage` / `OverviewPage`
- when a later Phase 2 wave hardens desktop `Run Detail` / `Overview`
  operator-surface locale coverage or moves more desktop strings onto
  `@cortexpilot/frontend-shared`, keep the root AI entrypoints aligned in the
  same patch; current examples include locale-aware desktop status labels,
  shared-copy Run Detail table/action chrome, and zh-CN regression coverage
- when the next Phase 2 wave deepens public `MCP` / `API` discoverability,
  sync the root AI/docs entrypoints in the same patch; current examples include
  `docs/mcp/index.html`, `docs/api/index.html`, the dashboard-home AI section
  CTA, and root navigation that points readers toward read-only MCP and API
  quickstarts without implying hosted/write-capable MCP
- when Prompt 6-style skills-bundle and workflow/control-plane read-model work
  lands, sync the root AI/docs entrypoints in the same patch; current examples
  include `policies/skills_bundle_registry.json`, enriched
  `role_binding_summary.skills_bundle_ref` metadata, and
  `workflow_case_read_model` on workflow/control-plane reads that stay
  explicitly non-authoritative
- when a Prompt 7-style frontend slice projects those same read models onto
  dashboard or desktop Workflow Case detail views, sync the root AI/docs
  entrypoints in the same patch; current examples include the read-only
  `Workflow read model` cards on `apps/dashboard/app/workflows/[id]/page.tsx`
  and `apps/desktop/src/pages/WorkflowDetailPage.tsx`, plus the typed frontend
  `RoleBindingReadModel` / `WorkflowCaseReadModel` shapes that stay below
  `task_contract`
- when a Prompt 8-style slice converges the OpenAPI/frontend-contract
  generation chain or projects `role_binding_read_model` onto dashboard/desktop
  Run Detail surfaces, sync the root AI/docs entrypoints in the same patch;
  current examples include `docs/api/openapi.cortexpilot.json`, the generated
  `@cortexpilot/frontend-api-contract` read-model types, and the read-only
  Run Detail operator summaries that keep `task_contract` as execution
  authority
- when a Prompt 9-style slice turns role / bundle / runtime truth into
  dashboard/desktop `Agents` + `Contracts` operator catalog surfaces, sync the
  root AI/docs entrypoints in the same patch; current examples include the
  registry-backed `/api/agents` role catalog, the normalized `/api/contracts`
  inspector payload, and the same read-only authority/advisory wording carried
  through both web and desktop operator shells
- when a Prompt 10-style slice turns those read-only catalog surfaces into a
  repo-owned role-configuration control plane, sync the root AI/docs
  entrypoints in the same patch; current examples include
  `policies/role_config_registry.json`, the role-config preview/apply routes
  under `/api/agents/roles/{role}/config*`, the generated frontend contract
  bindings for those routes, and the rule that `Agents` becomes the control
  desk while `Contracts` stays inspector-first and `task_contract` remains the
  only execution authority
- when a Prompt 10 follow-up slice adds derived runtime capability posture to
  intake previews, run manifests, operator-copilot briefs, or the
  dashboard/desktop `Contracts` and `Run Detail` surfaces, sync the root
  AI/docs entrypoints in the same patch; current examples include the derived
  `runtime_capability_summary` on `execution_plan_report`, the
  `role_binding_read_model.runtime_binding.capability` summary in generated
  frontend contracts, the shared dashboard/desktop runtime-capability copy,
  and the explicit fail-closed wording that keeps chat compatibility distinct
  from tool execution parity
- when a Prompt 10 Wave 3 slice hardens builder/client entrypoints into a
  repo-owned starter path, sync the root AI/docs entrypoints in the same patch;
  current examples include
  `packages/frontend-api-client/examples/control_plane_starter.local.mjs`, the
  package-facing `createControlPlaneStarter(...)` bootstrap flow, and the rule
  that this starter remains below hosted SDK / marketplace claims
- when staged dashboard smoke builds change their dependency-install or
  `apps/dashboard/lib/types.ts` export bridge semantics, sync the root AI/docs
  entrypoints in the same patch so pre-push and UI-audit gates can distinguish
  staging drift from real dashboard regressions

## Local Overrides

- `apps/orchestrator/AGENTS.md`
- `apps/dashboard/AGENTS.md`
- `apps/desktop/AGENTS.md`
