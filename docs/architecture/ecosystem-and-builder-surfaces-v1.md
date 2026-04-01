# Ecosystem And Builder Surfaces v1

This document explains how CortexPilot fits into today's coding-agent
ecosystem, how the public first-run loop turns into a shareable asset, and
where builders should connect without overclaiming a full SDK/platform story.

## Primary ecosystem bindings

These names are safe to use in the current front door because they match the
repo's real product boundary.

- **Codex**: CortexPilot is a command tower for Codex workflows that need
  governed runs, case records, approvals, and replayable proof.
- **Claude Code**: the same operator/control-plane story applies to Claude Code
  workflows.
- **MCP**: the current product truth is a **read-only MCP surface**. External
  tools can inspect runs, workflows, queue posture, approvals, and proof
  without mutating state.

## Adjacent ecosystem and comparison layer

These names belong in ecosystem/comparison language, not in the main hero.

- **OpenHands**: adjacent ecosystem mention for broader agent stacks and SDK/CLI
  surfaces.
- **OpenCode**: comparison-only and transition-sensitive; do not treat it as a
  primary anchor.
- **OpenClaw**: different category; keep it out of the current front door.

## First run to proof to share

The strongest public distribution loop today is:

1. Start one of the three public packs:
   - `news_digest`
   - `topic_brief`
   - `page_brief`
2. Confirm the outcome in:
   - **Command Tower**
   - **Workflow Cases**
   - **Proof & Replay**
3. Reuse the Workflow Case as a **share-ready asset** instead of trapping the
   result inside a one-off operator page.

That makes CortexPilot easier to explain, review, and circulate without
pretending it is already a hosted product.

## Builder entry points

Use these three layers together:

| Surface | What it is for | Where to start |
| --- | --- | --- |
| `@cortexpilot/frontend-api-client` | thin JS/TS client helpers for dashboard/desktop/web consumers | `packages/frontend-api-client/README.md` |
| `@cortexpilot/frontend-api-contract` | generated contract-facing types and route/query names | `packages/frontend-api-contract/index.d.ts` |
| `@cortexpilot/frontend-shared` | shared UI copy, locale, status, and frontend-only presentation helpers | `packages/frontend-shared/README.md` |

## Minimal builder example

```ts
import { createFrontendApiClient } from "@cortexpilot/frontend-api-client";

const client = createFrontendApiClient({
  baseUrl: "http://localhost:8000",
});

const runs = await client.fetchRuns();
const workflows = await client.fetchWorkflows();
const overview = await client.fetchCommandTowerOverview();
```

## Guardrails

- do not describe CortexPilot as a hosted operator product
- do not describe the current MCP surface as write-capable
- do not describe the current package surface as a full SDK platform
- do keep the public story anchored on:
  - Command Tower
  - Workflow Cases
  - Proof & Replay
  - read-only MCP
  - share-ready Workflow Case assets
