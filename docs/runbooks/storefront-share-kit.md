# Storefront Share Kit

Use this file as the minimum public sharing kit for CortexPilot.

For the first public release window, `news_digest` is the only official
happy-path baseline for proof-oriented copy. Other slices may exist in product
surfaces, but they should not be presented as equally release-proven yet.

## Punchline

Governed AI task orchestration with evidence, replay, and operator visibility.

## 10-Second Story

1. Start a task from PM.
2. Watch it move through Command Tower.
3. Open the run and inspect evidence or replay.

## Current Tracked Assets

- `docs/assets/storefront/hero-command-tower.svg`
- `docs/assets/storefront/first-loop-storyboard.svg`
- `docs/assets/storefront/first-loop-storyboard.gif`
- `docs/assets/storefront/dashboard-home-live-1440x900.png`
- `docs/assets/storefront/dashboard-command-tower-live-1440x900.png`
- `docs/assets/storefront/dashboard-runs-live-1440x900.png`
- `docs/assets/storefront/dashboard-live-degraded-loop.gif`
- `docs/assets/storefront/desktop-shell-live-1440x900.png`
- `docs/assets/storefront/social-preview-source.svg`
- `docs/assets/storefront/social-preview-1280x640.png`
- `docs/assets/storefront/demo-status.md`
- `docs/releases/assets/news-digest-healthy-proof-2026-03-27.md`
- `docs/releases/assets/news-digest-healthy-proof-gemini-2026-03-27.png`
- `docs/releases/assets/news-digest-healthy-proof-grok-2026-03-27.png`
- `docs/releases/assets/news-digest-benchmark-summary-2026-03-27.md`

## Proof Status By Asset Type

| Asset type | Current status | Safe public use |
| --- | --- | --- |
| Hero and storyboard art | tracked | use as explanation and storytelling |
| Local degraded dashboard captures | tracked | use only with degraded/local wording |
| Desktop snapshot preview | tracked | use as a UI preview, not as end-to-end proof |
| Healthy backend-backed `news_digest` capture set | present | safe to reference as repo-tracked proof, not as proof of live GitHub publication |
| Public benchmark artifact | present | safe to quote as a single-run baseline only |
| GitHub Release card | present | safe to reference the live release page and the tracked draft together |

## Current Gaps

- no tracked healthy live-capture GIF yet
- no broader multi-round public benchmark figure yet
- no live GitHub social preview upload yet

## Safe Post Angles

- why governed runs matter after “the agent replied”
- how evidence + replay changes debugging and review
- why CortexPilot is a control plane, not a generic agent demo
- anchor first-look copy on the `news_digest` path when referring to a public
  first run
- use the storyboard GIF only as a process explainer, not as proof of live runtime behavior
- describe `dashboard-home-live-1440x900.png` as a local degraded dashboard capture unless a healthy backend-backed capture replaces it
- describe `dashboard-live-degraded-loop.gif` as a local degraded dashboard capture unless a healthy backend-backed capture replaces it
- quote the current benchmark artifact only as a single-run `news_digest`
  baseline until a broader benchmark summary replaces it
- if mentioning the first release, link the live GitHub Release page first and
  treat `docs/releases/first-public-release-draft.md` as the repo-side source
  that fed those published notes
