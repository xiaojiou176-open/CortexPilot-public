# Documentation

This repository keeps its public documentation intentionally small.

If GitHub Pages is later enabled from `/docs`, `docs/index.html` is the
search-facing landing page source. `docs/README.md` remains the repo-side
documentation summary for contributors and maintainers.

`configs/docs_nav_registry.json` is the machine source of truth for the active
docs inventory. This file is the human-readable summary of that registry.

## Primary Navigation

These are the active canonical docs that stay in the primary docs navigation.

1. [../README.md](../README.md)
2. [index.html](index.html)
3. [architecture/runtime-topology.md](architecture/runtime-topology.md)
4. [specs/00_SPEC.md](specs/00_SPEC.md)
5. [runbooks/onboarding-30min.md](runbooks/onboarding-30min.md)
6. [runbooks/space-governance.md](runbooks/space-governance.md)

## Supplemental Registered Docs

These files remain active and canonical, but they are not part of the primary
navigation set.

1. [runbooks/public-release-checklist.md](runbooks/public-release-checklist.md)
2. [runbooks/storefront-share-kit.md](runbooks/storefront-share-kit.md)
3. [runbooks/github-storefront-manual-steps.md](runbooks/github-storefront-manual-steps.md)

## What Each File Is For

- `docs/index.html`: search-facing landing source for a future Pages/docs surface
- `docs/architecture/runtime-topology.md`: system layout and major boundaries
- `docs/specs/00_SPEC.md`: active product and contract baseline
- `docs/runbooks/onboarding-30min.md`: shortest contributor handoff path
- `docs/runbooks/space-governance.md`: disk-space audit, gating, and cleanup workflow
- `docs/runbooks/public-release-checklist.md`: user-facing GitHub release preparation checklist
- `docs/runbooks/storefront-share-kit.md`: tracked punchline and sharing kit for storefront work
- `docs/runbooks/github-storefront-manual-steps.md`: exact GitHub UI values and manual storefront steps

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
