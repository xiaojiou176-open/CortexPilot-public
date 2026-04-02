# Documentation

This repository keeps its public documentation intentionally small.

The product spine stays stable across the docs entrypoints:

- **Command Tower** for live operator visibility
- **Workflow Cases** for the case-level operating record
- **Proof & Replay** for evidence, compare, and replay review

`docs/index.html` is the current tracked GitHub Pages landing source for the
public docs surface. `docs/README.md` remains the repo-side documentation
summary for contributors and maintainers.

`configs/docs_nav_registry.json` is the machine source of truth for the active
docs inventory. This file is the human-readable summary of that registry.

## Repository Entry

This link stays outside the docs inventory registry. Treat it as the public
repository entrypoint rather than a registered docs page.

1. [../README.md](../README.md)

## Primary Registered Docs

These are the active registered docs that stay in the primary docs navigation.

1. [index.html](index.html)
2. [architecture/runtime-topology.md](architecture/runtime-topology.md)
3. [specs/00_SPEC.md](specs/00_SPEC.md)
4. [runbooks/onboarding-30min.md](runbooks/onboarding-30min.md)
5. [runbooks/space-governance.md](runbooks/space-governance.md)
6. [architecture/mcp-and-operator-copilot-v1.md](architecture/mcp-and-operator-copilot-v1.md)

## Supplemental Registered Docs

These files remain active and canonical, but they are not part of the primary
navigation set.

1. [runbooks/public-release-checklist.md](runbooks/public-release-checklist.md)
2. [runbooks/storefront-share-kit.md](runbooks/storefront-share-kit.md)
3. [runbooks/github-storefront-manual-steps.md](runbooks/github-storefront-manual-steps.md)
4. [releases/first-public-release-draft.md](releases/first-public-release-draft.md)
5. [assets/storefront/demo-status.md](assets/storefront/demo-status.md)
6. [assets/storefront/benchmark-methodology.md](assets/storefront/benchmark-methodology.md)
7. [architecture/ecosystem-and-builder-surfaces-v1.md](architecture/ecosystem-and-builder-surfaces-v1.md)
8. [builders/index.html](builders/index.html)
9. [ecosystem/index.html](ecosystem/index.html)
10. [use-cases/index.html](use-cases/index.html)
11. [ai-surfaces/index.html](ai-surfaces/index.html)
12. [mcp/index.html](mcp/index.html)
13. [api/index.html](api/index.html)

## What Each File Is For

- `docs/index.html`: search-facing landing source for the live GitHub Pages/docs surface
- `docs/architecture/runtime-topology.md`: system layout and major boundaries
- `docs/specs/00_SPEC.md`: active product and contract baseline
- `docs/runbooks/onboarding-30min.md`: shortest contributor handoff path
- `docs/runbooks/space-governance.md`: disk-space audit, gating, and cleanup workflow
- `docs/architecture/mcp-and-operator-copilot-v1.md`: Prompt 4 baseline for the read-only MCP node and run-scoped operator copilot
- `docs/runbooks/public-release-checklist.md`: user-facing GitHub release preparation checklist
- `docs/runbooks/storefront-share-kit.md`: tracked punchline and sharing kit for storefront work
- `docs/runbooks/github-storefront-manual-steps.md`: exact GitHub UI values and manual storefront steps
- `docs/releases/first-public-release-draft.md`: repo-side draft source for the first public GitHub Release
- `docs/assets/storefront/demo-status.md`: status ledger for tracked public demo and proof assets
- `docs/assets/storefront/benchmark-methodology.md`: public benchmark evidence contract and wording boundary
- `docs/architecture/ecosystem-and-builder-surfaces-v1.md`: ecosystem binding, first-run distribution loop, and current builder/client entry points
- `docs/builders/index.html`: public builder quickstart hub for current client/contract/shared entrypoints
- `docs/ecosystem/index.html`: public ecosystem positioning page for Codex / Claude Code / MCP plus adjacent comparison layers
- `docs/use-cases/index.html`: public first-run, proof, and share-ready asset guide
- `docs/ai-surfaces/index.html`: public AI operator / read-only MCP / API entrypoint map for truthful discoverability
- `docs/mcp/index.html`: public read-only MCP quickstart page for truthful protocol discovery
- `docs/api/index.html`: public API / contract quickstart page for OpenAPI, frontend client, and contract-facing types
- `apps/desktop/README.md`: desktop-owned module note for operator-surface locale/status hardening when desktop wording contracts change
- `policies/agent_registry.json`: machine SSOT for role-contract defaults such as purpose, prompt ref, MCP bundle ref, downstream-role expectations, and fail-closed posture
- `configs/env_direct_read_allowlist.json`: machine allowlist for governed backend direct env reads; update this alongside docs when a role/runtime helper legitimately reads env-backed model metadata
- `apps/orchestrator/src/cortexpilot_orch/api/main_pm_intake_helpers.py`: PM-facing helper surface that now returns a contract-derived `role_binding_summary`, and the same read model now persists into run manifests for stable post-run inspection without becoming execution authority
- `apps/orchestrator/src/cortexpilot_orch/api/main_runs_handlers.py`: run-detail helper surface that now returns a stable `role_binding_read_model` derived from persisted contract truth for read-only inspection

## Public CI Contract

- default public CI is hosted-first and GitHub-hosted
- fork PRs stay on low-privilege checks only and must not touch secrets or
  live/external systems
- maintainer-owned PRs still stay on GitHub-hosted policy/core lanes
- protected sensitive lanes (`ui-truth`, `resilience-and-e2e`,
  `release-evidence`) are manual `workflow_dispatch` paths gated by the
  `owner-approved-sensitive` environment
- `configs/ci_governance_policy.json` is the machine SSOT for repo-side CI
  routing; `configs/github_control_plane_policy.json` is the live GitHub
  control-plane contract

## Documentation Rules

- keep docs English-first
- keep docs public-facing and minimal
- treat `configs/docs_nav_registry.json` as the machine docs inventory SSOT
- keep `docs/README.md` as a summary, not a second handwritten source of truth
- treat `configs/github_control_plane_policy.json` as the machine SSOT for
  required check names, and reuse the root `README.md` summary instead of
  repeating the literal list here
- state public support boundaries explicitly when a module is intentionally out of scope
- current desktop public support boundary is macOS-only; Linux/BSD desktop
  evidence is manual or historical, unsupported, and not part of the default
  closeout contract
- move runtime evidence, generated output, and internal scratch material out of
  tracked docs
- when dashboard dependency lock refreshes land, treat the dashboard lockfile
  and the root workspace lockfiles as one documented maintenance change set
- when dashboard or desktop dependency maintenance changes the shipped build
  contract, sync the root docs entrypoints in the same patch; the current
  examples are the optional dashboard `depcheck` removal from the maintained
  lock surface and the desktop Vite 8 / Rolldown function-based chunking note
- when a single closeout patch spans both dashboard and desktop packaging, pair
  these docs updates with the root AI entrypoints (`AGENTS.md` / `CLAUDE.md`)
  so doc-sync gates can follow the decision chain without guessing
- when dashboard/operator labels or intake/probe contracts move, keep the
  module READMEs and root entrypoints aligned in the same patch; the current
  examples are the English-first Command Tower regression surface and the
  intake/probe response fields that now omit absent `task_template` data
- when CI maintenance changes the runtime report namespace or the Python
  dependency audit contract, sync this summary and the root entrypoints in the
  same patch; the current examples are `.runtime-cache/test_output/ci/` and
  `configs/pip_audit_ignored_advisories.json`, plus the dashboard and desktop
  ENOSPC recovery knobs plus the Docker daemon precheck retry knobs registered
  in `configs/env.registry.json`; current CI contract changes also include the
  upstream receipt refresh fallback to `scripts/verify_upstream_slices.py --mode smoke`
  and the strict hosted-first live-provider rule that allows
  process env first and `~/.codex/config.toml` second while keeping dotenv and
  shell-export fallbacks disabled on mainline
