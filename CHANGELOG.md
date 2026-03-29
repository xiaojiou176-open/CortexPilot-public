# Changelog

All notable changes to this repository will be documented in this file.

## Unreleased

### Changed

- closed the public hosted-first loop by moving sensitive verification lanes onto protected `workflow_dispatch` environments, aligning CI route validators/helpers with GitHub-hosted current truth, and syncing the root/module docs plus generated governance fragments with the live public collaboration contract
- let self-hosted CI Docker lanes fall back to direct `bash scripts/docker_ci.sh ...`
  execution when passwordless sudo is unavailable, so `main` push jobs no
  longer fail immediately on runners that can use Docker without an interactive
  sudo prompt
- aligned the live public GitHub repository, Pages, release, and security-reporting links around `CortexPilot-public` so repo-side docs no longer point at stale repo URLs
- synchronized root AI entrypoints, README, support/security docs, and GitHub issue/PR templates with the current public security-reporting boundary and fallback-channel follow-up
- fixed docs inventory drift by registering `docs/index.html` plus release/proof docs in the docs navigation registry and upgrading the navigation checker to catch summary-vs-registry drift
- aligned the trusted PR CI governance contract with the real workflow aggregation path and extended the checker/tests to catch route-semantic drift
- moved the RUM writer onto config-driven log roots and `log_event.v2`-shaped metadata, then verified the path with targeted orchestrator tests
- expanded repository-level provenance tracking from a single icon bundle to storefront and release-proof asset bundles, and taught the runtime artifact / clean-room checks about the package-local frontend client module cache
- hardened the PM chat E2E runner to follow the current English-first PM intake surface instead of older Chinese-only control labels
- clarified the first public release contract so repo docs now separate tracked proof, missing proof, and live GitHub manual steps
- locked the first public proof-oriented happy path to `news_digest` in release-facing docs until other slices have their own healthy proof
- documented the minimum public benchmark artifact contract and the truth boundary for repo-tracked storefront assets
- rewrote the public README around the PM -> Command Tower -> Runs story instead of repo-internal layout first
- added tracked storefront assets for README hero and social preview source art
- added a minimal Pages-ready landing source under `docs/index.html` with title and description metadata
- split visitor quickstart from contributor onboarding so the first success path is easier to copy and verify
- reduced the public documentation surface to a smaller English-first set
- removed archive, governance, and rehearsal-heavy docs from the public tree
- switched repository collaboration files to an open-source posture
- excluded agent state, runtime caches, logs, and other forbidden surfaces from the public repo seed
- added disk-space governance tooling with audit reports, cleanup preflight gates, and documented repo/external cache boundaries
- moved Gemini-backed UI audits out of default pre-push and PR-blocking lanes into explicit ui-truth / closeout paths
- removed Linux/BSD desktop from the public support contract and from default closeout-required governance receipts
- aligned the GitHub control-plane required check policy with the live PR gate names (`quick-feedback`, `pr-release-critical-gates`, `pr-ci-gate`)
- replaced the legacy `JARVIS` PM-session fixture with a neutral project key so governance closeout artifacts stay identity-clean
- aligned GitHub branch-protection required checks with the lightweight PR route so the live control-plane policy and `pr-ci-gate` stay in sync
- aligned GitHub branch protection required-check names with the active PR route gates (`Quick Feedback`, `PR Release-Critical Gates`, `PR CI Gate`)
- aligned dashboard contract tests with the current English-first Command Tower and RunDetail surfaces instead of older Chinese UI wording
- taught `scripts/ci_slice_runner.sh` to force `PYTHONDONTWRITEBYTECODE=1` so self-hosted policy/core slices stop generating `__pycache__` residue during `main` push validation
- moved CI stage logs, policy snapshots, and the orchestrator coverage JSON under `.runtime-cache/test_output/ci/` so the retention-report gate no longer flags root-level test-output residue on `main` push runs
- aligned remaining dashboard regression tests with the live English-first PM and Command Tower copy instead of legacy Chinese labels
- filtered secret-scan history noise down to a narrow set of known synthetic placeholder findings and removed the live embedded-credential sample from the external web probe tests
- added a machine-readable Python audit ignore contract for unfixed upstream advisories and taught the dependency gate to downgrade only those entries when `pip-audit` reports no fix version
- taught `install_dashboard_deps.sh` to recover from `ERR_PNPM_ENOSPC` by retrying with a workspace-local pnpm store and hardlink imports on self-hosted `main` validation lanes
- taught `install_desktop_deps.sh` to recover from `ERR_PNPM_ENOSPC` with the same workspace-local retry strategy, while scoping hardlink imports to the recovery attempt and using per-attempt workspace retry stores
- taught `scripts/docker_ci.sh` to retry Docker daemon prechecks with bounded backoff so transient self-hosted socket refusal no longer fail-closes CI at the first probe
- pinned transitive `picomatch` and `brace-expansion` security fixes across the root, dashboard, and desktop lockfile surfaces so GitHub Dependabot findings close on the same documented change set
- removed the optional dashboard `depcheck` package because the dead-code gate already skips when the probe is absent and the package kept an unpatchable `brace-expansion` advisory alive in the default workspace lock surface
- aligned dashboard Command Tower regression tests with the current
  English-first operator surface and synced the root/module docs required by
  doc-sync gates
- aligned intake/probe helper tests and runtime helpers with the current
  response/writer contracts, including optional `task_template` emission and
  dedicated dashboard dependency install logs
- tightened the space-governance / retention contract so cleanup inventory,
  wave receipts, retention lane summaries, and test-output namespace discipline
  now agree on the same repo-local and repo-external cache boundaries

## 2026-03-24

### Changed

- prepared the repository for a rebuilt public main history
- converted the repository license to MIT
- simplified README, contributor, security, support, and AI navigation files
