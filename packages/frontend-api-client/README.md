# Frontend API Client

`@cortexpilot/frontend-api-client` is the thin JavaScript/TypeScript client
layer for CortexPilot frontend consumers.

## What it exposes today

- `createFrontendApiClient`
- `createDashboardApiClient`
- `createDesktopApiClient`
- shared auth, HTTP, and SSE cores for the same API surface

This package is useful when you want one import boundary for:

- runs and run reports
- Workflow Cases and queue posture
- run/workflow binding read models that stay explicitly below execution authority
- PM intake and command-tower overview routes
- approvals, reviews, and operator-facing control-plane reads

## Minimal example

```ts
import { createDashboardApiClient } from "@cortexpilot/frontend-api-client";

const client = createDashboardApiClient({
  baseUrl: "http://localhost:8000",
  resolveToken: () => window.localStorage.getItem("cortexpilot.token") || undefined,
});

const overview = await client.fetchCommandTowerOverview();
const workflows = await client.fetchWorkflows();
```

## Current boundary

- This is a thin client surface, not a full SDK platform.
- It wraps the current HTTP routes that power the dashboard and desktop shells.
- It does not replace the backend orchestration runtime or the read-only MCP
  server.
- Prompt 7-style frontend slices should treat `role_binding_read_model` and
  `workflow_case_read_model` as read-only operator surfaces; the task contract
  remains the execution authority.
