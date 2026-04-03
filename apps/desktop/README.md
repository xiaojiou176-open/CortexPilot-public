# Desktop Module

`apps/desktop/` is the Tauri shell for CortexPilot.

## What It Owns

- desktop navigation and operator workflows
- command visibility and review surfaces
- native shell integration

## Key Commands

```bash
npm --prefix apps/desktop install
npm --prefix apps/desktop run dev
npm --prefix apps/desktop run build
npm --prefix apps/desktop run test
npm --prefix apps/desktop run tauri:dev
```

## Notes

- runtime output belongs under `.runtime-cache/`, not tracked source
- public desktop support is currently limited to macOS
- Linux/BSD desktop native smoke and GTK/WebKitGTK dependency chains are kept
  as manual or historical evidence only, not as default required support lanes
- Desktop production builds run on Vite 8 / Rolldown, so vendor chunk splitting
  must stay in the function-based `manualChunks` form used by
  `apps/desktop/vite.config.ts`; object-style chunk maps regress `vite build`
  and the `ui-audit` closeout lane with `manualChunks is not a function`.
- Keep desktop module docs updated whenever `vite.config.ts` or the desktop
  lockfile changes, because the quick doc-drift gate treats desktop packaging
  changes as README-owned maintenance work rather than invisible tooling churn.
- release and notarization helpers remain available through `npm --prefix apps/desktop run tauri:*`
- The desktop PM shell now loads registry-driven task packs from
  `/api/pm/task-packs`, supports first-session Flight Plan preview, and carries
  task-pack payloads into desktop-first session bootstrap before the operator
  sends the first message.
- Desktop workflow surfaces now expose workflow-case summaries, queue / SLA
  state, queue scheduling inputs (`priority`, `scheduled_at`, `deadline_at`),
  a read-only `Workflow read model` card sourced from
  `workflow_case_read_model`, and a dedicated Run Compare page so operator
  triage is not limited to the dashboard.
- High-frequency desktop operator surfaces now keep their `Run Detail` /
  `Overview` chrome closer to the shared locale and status-presentation
  substrate. Current examples include run-detail tabs, replay/compare empty
  states, action-bar copy, and locale-aware recent-exception labels in the
  Overview page.
- Desktop `Run Detail` and `Overview` now keep their high-frequency operator
  copy on the shared `@cortexpilot/frontend-shared/uiCopy` contract and route
  status labels through shared status-presentation helpers, so `en` / `zh-CN`
  operator rendering does not depend on page-local literal maps.
- Desktop `Run Detail` now also mirrors `role_binding_read_model` inside the
  existing `Run overview` card, so the persisted binding summary is visible on
  the primary operator surface while `task_contract` remains the only execution
  authority.
- Desktop `Agents` now mirrors the same read-only role catalog semantics as the
  dashboard while keeping a compact table/card layout, so operators can inspect
  role bundle/runtime posture without turning the page into a control panel.
- Desktop `Contracts` now mirrors the same bundle/runtime inspector semantics
  as the dashboard while keeping the compact desktop card layout, so contract
  envelopes and derived binding summaries stay aligned across both operator
  shells.
- The desktop Workflow Case detail surface now mirrors the latest linked run's
  `workflow_case_read_model`, but it presents that card as read-only operator
  context rather than a second execution-authority switch.
