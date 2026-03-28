# CortexPilot v0.1.0-alpha.1 - repo-side first public release draft

This file is the repo-side draft source for the first public GitHub Release. It
is not the live release page itself, and future edits to this file do not
retroactively prove that the published release notes were updated.

This draft is the first public storefront baseline for CortexPilot.

## Why this release matters

CortexPilot is not just an agent demo repository. It is a governed AI task
orchestration control plane with evidence, replay, and operator visibility.

This release makes that story much clearer on the public surface.

## What changed

- rewrote the root README around the PM -> Command Tower -> Runs loop
- added tracked storefront assets for hero art and social preview
- added a Pages-ready landing source with title and description metadata
- split the first-success quickstart from contributor onboarding
- added release and storefront runbooks for future maintenance
- clarified the repo-side proof contract for the first public release bundle

## What to look at first

1. `README.md`
2. `docs/index.html`
3. `docs/runbooks/public-release-checklist.md`
4. `docs/runbooks/storefront-share-kit.md`

## Official First Public Path

The first public release contract treats `news_digest` as the only official
happy-path baseline for proof-oriented copy and future benchmark publication.

## Present Repo-Side Proof

- release notes draft exists in this file
- README and storefront docs exist and are aligned to the current public story
- tracked explainer assets and limited-scope captures exist in
  `docs/assets/storefront/`
- a tracked healthy `news_digest` proof summary now exists in
  `docs/releases/assets/news-digest-healthy-proof-2026-03-27.md`
- a tracked single-run public baseline now exists in
  `docs/releases/assets/news-digest-benchmark-summary-2026-03-27.md`

## Live Publication State

- GitHub social preview still needs to be configured in repository settings
- GitHub Discussions are enabled on the live repository
- the live GitHub Release is now
  `https://github.com/xiaojiou176-open/CortexPilot-public/releases/tag/v0.1.0-alpha.1`
- no broader multi-round benchmark artifact is published yet
- GitHub Pages is enabled from `/docs`, and the live site is now
  `https://xiaojiou176-open.github.io/CortexPilot-public/`

## Verification

```bash
CORTEXPILOT_HOST_COMPAT=1 bash scripts/test_quick.sh --no-related
TMPDIR=/path/to/tmpdir bash scripts/check_repo_hygiene.sh
```

## Release Note Guardrails

- do not describe storyboard assets as healthy proof
- do not describe degraded local captures as healthy end-to-end evidence
- do not quote benchmark numbers outside the tracked artifact or without keeping
  the current single-run scope explicit
