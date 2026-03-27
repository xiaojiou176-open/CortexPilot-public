# GitHub Storefront Manual Steps

Use this checklist when applying the remaining GitHub UI changes for CortexPilot.

## 1. About

Recommended About text:

> Governed AI task orchestration with evidence, replay, and operator visibility.

Website field:

- leave empty until `docs/index.html` is actually published on GitHub Pages or an equivalent public URL

## 2. Topics

Recommended topic set:

- `ai-agents`
- `orchestration`
- `auditability`
- `evidence`
- `replay`
- `control-plane`
- `developer-tools`
- `fastapi`
- `nextjs`
- `tauri`

## 3. Social Preview

Repo-side presence of the asset is not proof that the GitHub setting is already live.
Treat the file below as the tracked upload candidate until the GitHub UI is updated and
the repository page is visually rechecked.

Upload this file:

- `docs/assets/storefront/social-preview-1280x640.png`

Source of truth:

- `docs/assets/storefront/social-preview-source.svg`

## 4. Discussions

Preferred state:

- Discussions are already enabled on the live repository
- create categories:
  - `Q&A`
  - `Ideas`
  - `Announcements`

If Discussions are disabled again in the future:

- reflect that choice in `README.md` or `SUPPORT.md`

## 5. First GitHub Release

Recommended release title:

> CortexPilot v0.1.0-alpha.1 — public storefront baseline

Draft notes source:

- `docs/releases/first-public-release-draft.md`

## 6. Pages / Landing

Repo-side presence of `docs/index.html` is not evidence that GitHub Pages is enabled.

If GitHub Pages is enabled from `/docs`:

- publish `docs/index.html`
- verify the final public URL
- then update the GitHub Website field to that URL
