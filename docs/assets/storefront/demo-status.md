# Demo Asset Status

This file tracks the public demo surfaces that are already present versus the
ones that still need a real capture pass.

## Present Today: Explainers And Supporting Assets

- `hero-command-tower.svg`: public hero image
- `first-loop-storyboard.svg`: shareable storyboard of the PM -> Command Tower -> Runs loop
- `first-loop-storyboard.png`: static storyboard export
- `first-loop-storyboard.gif`: storyboard animation export
- `dashboard-home-live-1440x900.png`: real dashboard home screenshot captured from a local production server
- `dashboard-command-tower-live-1440x900.png`: real Command Tower screenshot captured from a local production server
- `dashboard-runs-live-1440x900.png`: real Runs page screenshot captured from a local production server
- `dashboard-live-degraded-loop.gif`: real multi-page dashboard GIF captured from a local degraded run
- `desktop-shell-live-1440x900.png`: real desktop preview screenshot captured from the app snapshot pipeline
- `social-preview-source.svg`: editable social card source
- `social-preview-1280x640.png`: upload-ready social card candidate
- `docs/releases/assets/news-digest-healthy-proof-2026-03-27.md`: repo-tracked healthy `news_digest` proof summary
- `docs/releases/assets/news-digest-healthy-proof-gemini-2026-03-27.png`: successful Gemini proof screenshot
- `docs/releases/assets/news-digest-healthy-proof-grok-2026-03-27.png`: successful Grok proof screenshot
- `docs/releases/assets/news-digest-benchmark-summary-2026-03-27.md`: first tracked public `news_digest` baseline summary

## Current Proof Ledger

| Proof class | Current status | Notes |
| --- | --- | --- |
| Storyboard explainer assets | present | useful for explaining the loop, not proving runtime health |
| Real local degraded dashboard captures | present | honest supporting evidence, but not healthy backend-backed proof |
| Desktop preview capture | present | shows the shell surface only |
| Healthy backend-backed `news_digest` public proof set | present | tracked proof summary: `docs/releases/assets/news-digest-healthy-proof-2026-03-27.md` |
| Public benchmark artifact from a real tracked run | present | first tracked single-run baseline: `docs/releases/assets/news-digest-benchmark-summary-2026-03-27.md` |
| Published GitHub Release page/card | missing live publication | a repo-side draft exists, but publication has not happened yet |

## Still Missing

- a tracked healthy live-capture GIF for the official first public happy path
- a broader multi-round public benchmark artifact beyond the current single-run
  baseline summary
- a published GitHub Release page/card

## Why This File Exists

It prevents “we already have assets” from drifting into fake maturity. A source
file, a storyboard, a storyboard animation, and a production-ready live capture
are different things.

## Truth Boundary

- `dashboard-home-live-1440x900.png`, `dashboard-command-tower-live-1440x900.png`, `dashboard-runs-live-1440x900.png`, and `dashboard-live-degraded-loop.gif` are real captures from the dashboard server, but they were captured in a local degraded state where backend data was unavailable.
- `desktop-shell-live-1440x900.png` is a real screenshot from the desktop snapshot pipeline.
- `social-preview-1280x640.png` is a repo-tracked upload candidate for the GitHub social preview setting, not proof that the live GitHub setting has already been applied.
- `docs/releases/first-public-release-draft.md` is a repo-side release draft, not proof that a live GitHub Release has been published.
- `docs/releases/assets/news-digest-healthy-proof-2026-03-27.md` and the two
  copied screenshots are repo-tracked evidence from a successful local run,
  not proof that the live GitHub Release page has already been published.
- `docs/releases/assets/news-digest-benchmark-summary-2026-03-27.md` is a real
  single-run baseline summary, not a broad multi-round benchmark campaign.
- `docs/releases/assets/news-digest-benchmark-route-2026-03-27.md` remains a
  historical blocker receipt from an earlier failed benchmark route.
- `docs/releases/assets/news-digest-healthy-proof-route-2026-03-27.md` remains
  a historical blocker receipt from earlier failed healthy-proof attempts.
- None of these captures should be described as proof of a fully healthy end-to-end backend session.
