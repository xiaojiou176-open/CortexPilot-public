# Frontend Shared

Shared frontend-only presentation helpers and types for the dashboard and
desktop operator surfaces.

Current package boundary: this package is still a `private` workspace package.
The truthful adoption path today is repo-local consumption, clone-and-reuse,
or vendored internal reuse, not registry install from npm.

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
- This package is not published for public registry install today.

## Human-readable entrypoints

If you want the public explanation for how this shared substrate fits into
Codex / Claude Code / OpenClaw workflows, use:

- [Compatibility matrix](https://xiaojiou176-open.github.io/CortexPilot-public/compatibility/)
- [Integration guide](https://xiaojiou176-open.github.io/CortexPilot-public/integrations/)
- [Read-only MCP quickstart](https://xiaojiou176-open.github.io/CortexPilot-public/mcp/)
- [API quickstart](https://xiaojiou176-open.github.io/CortexPilot-public/api/)
- [Contract package guide](../frontend-api-contract/docs/README.md)
- [Skills quickstart](https://xiaojiou176-open.github.io/CortexPilot-public/skills/)
