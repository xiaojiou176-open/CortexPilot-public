# Frontend Shared

Shared frontend-only presentation helpers and types for the dashboard and
desktop operator surfaces.

## What lives here

- `uiCopy`: shared brand, shell, operator, approval, and page-level copy
- `uiLocale`: preferred UI locale detection, persistence, and toggle helpers
- `statusPresentation`: locale-aware status, stage, CTA, and datetime helpers
- `types`: frontend-facing shared report/type surfaces that sit above the raw
  API contract

## What does not live here

- backend-facing HTTP contract definitions
- generated API path/query bindings
- runtime orchestration logic
- MCP server contracts

## Current boundary

- This package is part of the frontend presentation substrate, not a standalone
  public SDK.
- Public API contract types stay in `@cortexpilot/frontend-api-contract`.
- Client entry points stay in `@cortexpilot/frontend-api-client`.

## Human-readable entrypoints

If you want the public explanation for how this shared substrate fits into
Codex / Claude Code / OpenClaw workflows, use:

- [Integration guide](https://xiaojiou176-open.github.io/CortexPilot-public/integrations/)
- [Contract package guide](../frontend-api-contract/docs/README.md)
- [Skills quickstart](https://xiaojiou176-open.github.io/CortexPilot-public/skills/)
