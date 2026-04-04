# Frontend API Contract

`@cortexpilot/frontend-api-contract` is the repo-owned contract package for
frontend-safe CortexPilot route names, query shapes, and generated types.

Current package boundary: this package is still a `private` workspace package.
The truthful adoption path today is repo-local consumption, clone-and-reuse,
or vendored internal reuse, not registry install from npm.

## What lives here

- `index.d.ts`: stable root entrypoint that re-exports the generated contract
  surface for the main API layer
- `ui-flow.d.ts`: stable root entrypoint that re-exports generated UI-flow
  types for frontend consumers
- `generated/index.d.ts`: current generated contract-facing exports for the
  main API surface
- `generated/ui-flow.d.ts`: current generated UI-flow-facing exports
- stable import boundaries for frontend packages that should not import backend
  modules directly

## What this package is for

Use this package when you want:

- route and query names that stay aligned with the generated frontend contract
- typed control-plane read surfaces without importing backend modules
- a stable contract layer below `@cortexpilot/frontend-api-client`

## What this package is not

- not a hosted SDK
- not a public marketplace artifact
- not an official Codex / Claude Code / OpenClaw plugin package
- not a replacement for the read-only MCP server

## Shortest truthful onboarding order

1. Start with the public [compatibility matrix](https://xiaojiou176-open.github.io/CortexPilot-public/compatibility/) when your team still needs the shortest “which adoption ladder fits us?” answer.
2. Continue to the public [API quickstart](https://xiaojiou176-open.github.io/CortexPilot-public/api/) when you want the human-readable HTTP boundary.
3. Continue to the public [builder quickstart](https://xiaojiou176-open.github.io/CortexPilot-public/builders/) when you want the package map.
4. Import `@cortexpilot/frontend-api-contract` when you are working inside the same repo or a vendored workspace copy and need generated route/query/type truth without backend imports.

## Key entrypoints

- `../index.d.ts`: current generated contract exports
- `../ui-flow.d.ts`: generated UI-flow exports
- `../../frontend-api-client/README.md`: thin client layer that sits above this contract package
- `../../frontend-shared/README.md`: shared presentation substrate that sits beside this package
