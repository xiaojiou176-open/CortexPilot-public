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
  and a dedicated Run Compare page so operator triage is not limited to the
  dashboard.
