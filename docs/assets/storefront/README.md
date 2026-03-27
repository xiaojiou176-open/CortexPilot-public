# Storefront Assets

Tracked assets in this directory exist for public README, release, landing-page,
and social-preview use.

## Current Files

- `hero-command-tower.svg`: README and landing-page hero asset
- `first-loop-storyboard.svg`: shareable storyboard for the PM -> Command Tower -> Runs story
- `first-loop-storyboard.png`: exportable static storyboard preview
- `first-loop-storyboard.gif`: tracked storyboard animation (not a live product capture)
- `dashboard-home-live-1440x900.png`: tracked real screenshot from the dashboard home page in local degraded mode
- `dashboard-command-tower-live-1440x900.png`: tracked real Command Tower screenshot in local degraded mode
- `dashboard-runs-live-1440x900.png`: tracked real Runs screenshot in local degraded mode
- `dashboard-live-degraded-loop.gif`: tracked real dashboard GIF in local degraded mode
- `desktop-shell-live-1440x900.png`: tracked real screenshot from the desktop snapshot pipeline
- `social-preview-source.svg`: source artwork for a GitHub social preview export
- `social-preview-1280x640.png`: exported GitHub social preview candidate
- `demo-status.md`: explicit status ledger for real demo/benchmark asset closure

## Rules

- keep filenames descriptive and stable
- keep the public story aligned with `PM -> Command Tower -> Runs / Evidence`
- do not point README or docs at `.runtime-cache/` image artifacts
- keep `social-preview-source.svg` as the editable source and `social-preview-1280x640.png` as the upload candidate
- treat `first-loop-storyboard.gif` as a storyboard animation, not as a real live-product recording
- label degraded local screenshots honestly when backend data is unavailable
- label degraded local GIF captures honestly when backend data is unavailable
- regenerate tracked exports on macOS with `bash scripts/export_storefront_assets.sh` (supports `inkscape` or `rsvg-convert` as optional SVG fallbacks)
