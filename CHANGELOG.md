# Changelog

All notable changes to this repository will be documented in this file.

## Unreleased

### Changed

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
- pinned transitive `picomatch` and `brace-expansion` security fixes across the root, dashboard, and desktop lockfile surfaces so GitHub Dependabot findings close on the same documented change set
- removed the optional dashboard `depcheck` package because the dead-code gate already skips when the probe is absent and the package kept an unpatchable `brace-expansion` advisory alive in the default workspace lock surface

## 2026-03-24

### Changed

- prepared the repository for a rebuilt public main history
- converted the repository license to MIT
- simplified README, contributor, security, support, and AI navigation files
