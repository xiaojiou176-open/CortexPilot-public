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
- keep public CI hosted-first: fork PRs stay low-privilege on GitHub-hosted
  lanes, and sensitive verification stays on protected manual dispatch lanes
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
- when runtime-provider compatibility changes the orchestrator client contract,
  sync the root AI/docs entrypoints in the same patch; current examples include
  the Switchyard runtime-first `/v1/runtime/invoke` adapter, the forced
  `chat_completions` mode on chat-only intake/operator paths, and the
  fail-closed rule that keeps MCP tool execution on tool-capable providers;
  Quick Feedback-safe helper extraction and env-governance allowlist updates
  for read-only runtime-capability summaries follow the same rule
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
  second while keeping dotenv and shell-export fallbacks disabled on mainline;
  staged dashboard UI-audit workspaces must also keep package-local frontend
  sources inside the temporary workspace root instead of relying on out-of-root
  symlinks that Turbopack rejects, and repeated pnpm `ERR_PNPM_ENOENT`
  recovery should escalate to workspace-local store recovery instead of
  repeating the same failing fresh-store copy path
- when retention and space-governance contracts change, sync the root AI/docs
  entrypoints in the same patch; current examples include retention
  `log_lane_summary` + `space_bridge`, serial-only heavy cleanup ordering,
  cleanup inventory consistency checks, and the rule that `~/.cache/cortexpilot`
  is the repo-external strong-related root while shared ecosystem layers stay
  observe-only; current Docker runtime lane changes must keep cleanup scoped to
  CortexPilot-owned images/containers/volumes while workstation-global
  Docker/cache totals stay audit-only
- when workflow-case / proof-pack / compare / task-pack / queue-scheduling
  contracts change, sync the root AI/docs entrypoints in the same patch; the
  current examples are `.runtime-cache/cortexpilot/workflow-cases/`,
  `proof_pack.json`, dedicated run-compare surfaces, desktop Flight Plan
  preview, and timezone-safe queue scheduling inputs
- when Version B closeout work changes the public front door, shared locale
  substrate, read-only MCP exposure, or operator-copilot surfaces, sync
  `README.md`, `docs/index.html`, `docs/releases/first-public-release-draft.md`,
  `apps/orchestrator/README.md`, and the root AI entrypoints in the same patch
  so doc-drift and doc-sync gates keep following the live Command Tower /
  Workflow Cases / Proof & Replay contract
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
- when a follow-up Phase 2 wave adds new public discoverability hubs such as
  `/ai-surfaces/` or makes the dashboard-home locale toggle drive
  server-rendered copy through cookie-backed preference sync, update the root
  AI/docs entrypoints and release-facing docs in the same patch so doc-sync
  gates can follow both the public wording and the locale-contract change;
  current examples include `docs/ai-surfaces/index.html`, the extracted
  `apps/dashboard/components/DashboardHomeStorySections.tsx` narrative layer,
  and the AI Work Command Tower wording now shared by the dashboard metadata
  and the public Pages landing copy
- when that wave also moves the dashboard-home story into a dedicated
  shared-copy component, keep this file, `AGENTS.md`, and `CHANGELOG.md`
  aligned in the same patch so quick-feedback gates can trace the locale-aware
  rendering path instead of inferring it from page-local literals
- keep the root wording aligned when the dashboard home mixes cookie-backed
  locale SSR with client-side locale refresh, because that split is easy to
  miss when only the page diff is inspected
- the current concrete examples are `docs/ai-surfaces/index.html`,
  `apps/dashboard/components/DashboardHomeStorySections.tsx`,
  `packages/frontend-shared/uiLocale.ts`, and dashboard metadata that now says
  "AI Work Command Tower for Codex, Claude Code, and MCP"
- when the next Phase 2 wave hardens desktop `Run Detail` / `Overview`
  operator wording through the shared locale and shared status-presentation
  substrate, keep this file, `AGENTS.md`, and the desktop/module docs aligned
  in the same patch; current examples include `apps/desktop/README.md`,
  `packages/frontend-shared/uiCopy.ts`, and locale-aware desktop tests for
  `RunDetailPage` / `OverviewPage`
  `packages/frontend-shared/uiLocale.ts`, and dashboard metadata that now says
  "AI Work Command Tower for Codex, Claude Code, and MCP"
- when a later Phase 2 wave hardens desktop `Run Detail` / `Overview`
  operator-surface locale coverage or moves more desktop strings onto
  `@cortexpilot/frontend-shared`, keep the root AI entrypoints aligned in the
  same patch; current examples include locale-aware desktop status labels,
  shared-copy Run Detail table/action chrome, and zh-CN regression coverage
- when the next Phase 2 wave deepens public `MCP` / `API` discoverability,
  keep this file, `AGENTS.md`, and the root/docs entrypoints aligned in the
  same patch; current examples include `docs/mcp/index.html`,
  `docs/api/index.html`, the dashboard-home AI CTA, and root navigation that
  points readers toward read-only MCP and API quickstarts without implying
  hosted/write-capable MCP
  shared-copy Run Detail table/action chrome, and zh-CN regression coverage
- when Prompt 6-style skills-bundle and workflow/control-plane read-model work
  lands, keep this file, `AGENTS.md`, `README.md`, and the orchestrator/docs
  entrypoints aligned in the same patch; current examples include
  `policies/skills_bundle_registry.json`, enriched
  `role_binding_summary.skills_bundle_ref` metadata, and
  `workflow_case_read_model` on workflow/control-plane reads that remain
  explicitly read-only
- when a Prompt 7-style frontend slice projects those same read models onto
  dashboard or desktop Workflow Case detail surfaces, keep this file, the root
  AI entrypoints, and the module READMEs aligned in the same patch; current
  examples include the read-only `Workflow read model` cards on
  `apps/dashboard/app/workflows/[id]/page.tsx` and
  `apps/desktop/src/pages/WorkflowDetailPage.tsx`, plus the typed frontend
  `RoleBindingReadModel` / `WorkflowCaseReadModel` surfaces that stay below
  `task_contract`
- when a Prompt 8-style slice converges the OpenAPI/frontend-contract
  generation chain or projects `role_binding_read_model` onto dashboard/desktop
  Run Detail surfaces, keep this file, the root AI/docs entrypoints, and the
  module READMEs aligned in the same patch; current examples include
  `docs/api/openapi.cortexpilot.json`, generated
  `@cortexpilot/frontend-api-contract` read-model types, and the read-only Run
  Detail operator summaries that continue to treat `task_contract` as
  execution authority
- when a Prompt 9-style slice turns role / bundle / runtime truth into
  dashboard/desktop `Agents` + `Contracts` operator catalog surfaces, keep this
  file, the root AI/docs entrypoints, and the module READMEs aligned in the
  same patch; current examples include the registry-backed `/api/agents` role
  catalog, the normalized `/api/contracts` inspector payload, and the same
  read-only authority/advisory wording carried through both web and desktop
  operator shells
- when a Prompt 10-style slice turns those read-only catalog surfaces into a
  repo-owned role-configuration control plane, keep this file, the root
  AI/docs entrypoints, and the module READMEs aligned in the same patch;
  current examples include `policies/role_config_registry.json`, the
  role-config preview/apply routes under `/api/agents/roles/{role}/config*`,
  the generated frontend contract bindings for those routes, and the rule that
  `Agents` becomes the control desk while `Contracts` stays inspector-first and
  `task_contract` remains the only execution authority

## Key Commands

- `npm run bootstrap`
- `npm run test`
- `npm run test:quick`
- `npm run space:audit`
- `npm run docker:runtime:audit`
- `bash scripts/check_repo_hygiene.sh`
- `pre-commit run --all-files`

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
