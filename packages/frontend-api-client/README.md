# Frontend API Client

`@cortexpilot/frontend-api-client` is the thin JavaScript/TypeScript client
layer for CortexPilot frontend consumers.

## What it exposes today

- `createFrontendApiClient`
- `createDashboardApiClient`
- `createDesktopApiClient`
- `createControlPlaneStarter`
- shared auth, HTTP, and SSE cores for the same API surface

This package is useful when you want one import boundary for:

- runs and run reports
- Workflow Cases and queue posture
- run/workflow binding read models that stay explicitly below execution authority
- PM intake and command-tower overview routes
- approvals, reviews, and operator-facing control-plane reads
- role-configuration fetch / preview / apply routes for repo-owned role
  defaults, including the same mutation-role header discipline used by other
  operator mutation surfaces
- contract-backed workflow, queue, PM-session, and command-tower path/query bindings

## Minimal example

```ts
import {
  createControlPlaneStarter,
  createDashboardApiClient,
} from "@cortexpilot/frontend-api-client";

const client = createDashboardApiClient({
  baseUrl: "http://localhost:8000",
  resolveToken: () => window.localStorage.getItem("cortexpilot.token") || undefined,
  resolveMutationRole: () => "TECH_LEAD",
});

const starter = createControlPlaneStarter(client);

const bootstrap = await starter.fetchBootstrap({ role: "WORKER" });
const preview = await starter.previewRoleDefaults("WORKER", {
  runtime_binding: {
    provider: "cliproxyapi",
    model: "gpt-5.4",
  },
});
```

## External integration starter

Use `createControlPlaneStarter(...)` when another dashboard, desktop shell, or
builder tool needs the shortest repo-owned path into the current control-plane
story.

It gives external consumers one place to:

- bootstrap Command Tower overview + agents + contracts + optional role config
- preview role-default changes without inventing a second client wrapper
- apply role-default changes with the same mutation-role header discipline the
  existing operator surfaces already use
- stay inside the truthful boundary where role defaults are configurable but
  `task_contract` remains the execution authority

The starter also exposes guarded queue helpers for trusted repo operators:

- preview queue enqueue changes from one run through the same repo-owned HTTP
  control-plane boundary
- cancel a pending queue item through the same mutation-role header discipline

Those queue helpers stay outside the default public builder promise. They are
repo-owned operator add-ons, not a claim that the public MCP contract is
write-capable.

## Repo-owned starter example

If you want a copy-pasteable starting point instead of reading the helpers one
by one, use the repo-owned example:

```bash
node packages/frontend-api-client/examples/control_plane_starter.local.mjs
```

That example bootstraps:

- Command Tower overview
- `/api/agents`
- `/api/contracts`
- optional role-config preview for one role

The quickest useful preview run looks like this:

```bash
node packages/frontend-api-client/examples/control_plane_starter.local.mjs \
  --base-url http://127.0.0.1:10000 \
  --role WORKER \
  --mutation-role TECH_LEAD \
  --preview-provider cliproxyapi \
  --preview-model gpt-5.4
```

Apply stays opt-in on purpose:

```bash
node packages/frontend-api-client/examples/control_plane_starter.local.mjs \
  --base-url http://127.0.0.1:10000 \
  --role WORKER \
  --mutation-role TECH_LEAD \
  --preview-provider cliproxyapi \
  --preview-model gpt-5.4 \
  --apply
```

The example stays inside the truthful boundary:

- it demonstrates bootstrap + preview
- apply only happens when you pass `--apply`
- it does not imply hosted SDK behavior
- it does not replace the backend orchestration runtime
- queue preview/cancel remain repo-owned operator HTTP surfaces; they do not
  promote the public MCP contract into write-capable MCP
- `task_contract` remains the execution authority even when role-default apply
  is available through the same client under local operator policy

## Current boundary

- This is a thin client surface, not a full SDK platform.
- It wraps the current HTTP routes that power the dashboard and desktop shells.
- Where `@cortexpilot/frontend-api-contract` already publishes frontend-safe
  route or query truth, this client reuses that contract instead of keeping a
  second handwritten path map.
- It does not replace the backend orchestration runtime or the read-only MCP
  server.
- Queue preview/cancel and the queue-only MCP pilot server are later-gated
  operator mutation groundwork, not public write-capable MCP.
- The control-plane starter is a builder convenience layer, not a second
  execution authority or a hosted SDK runtime.
- Prompt 7-style frontend slices should treat `role_binding_read_model` and
  `workflow_case_read_model` as read-only operator surfaces; the task contract
  remains the execution authority.

## Human-readable entrypoints

If you are onboarding a Codex / Claude Code / OpenClaw workflow and want the
repo's truthful public explanation before you read the package internals, start
here:

- [Integration guide](https://xiaojiou176-open.github.io/CortexPilot-public/integrations/)
- [Builder quickstart](https://xiaojiou176-open.github.io/CortexPilot-public/builders/)
- [Contract package guide](../frontend-api-contract/docs/README.md)
- [Skills quickstart](https://xiaojiou176-open.github.io/CortexPilot-public/skills/)
