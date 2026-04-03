# Dashboard Module

## Positioning

This module is the repository's **web operator surface**.

Read it as:

- the browser-based control surface for runs, sessions, reviews, and command
  visibility
- a way to inspect and operate CortexPilot Command Tower orchestration truth from the web
- a repo-owned UI for evaluating control-plane behavior

Do **not** read it as:

- a polished customer-facing SaaS product
- a standalone web application with its own independent product roadmap
- evidence that every workflow here is already broad-market ready

## Module Responsibility

- Provide run, workflow, session, and review visualization for CortexPilot Command Tower
  orchestration output.
- Surface operator-facing status, artifacts, and control points for the web.
- Surface intake preview, approval summaries, and run diagnostics as
  operator-readable decision objects rather than raw payloads alone.

## Why This Module Exists

If `apps/orchestrator/` is the machine room, `apps/dashboard/` is the glass
window operators use to see what the machine room is doing. Its job is
visibility and control, not pretending the whole repository is already a
finished consumer product.

## Input / Output

- Input: API responses from the orchestrator backend.
- Output: operational UI views for runs, events, contracts, reports, and
  command surfaces.

## High-value operator surfaces

- PM workspace: registry-driven task-pack selection plus `execution_plan_report`
  preview before execution starts.
- Agents: the first-screen role catalog now also hosts a repo-owned role
  configuration desk for previewing and saving future compiled defaults
  (`system_prompt_ref`, bundle refs, and role-level runtime binding) while
  `task_contract` remains the only execution authority.
- Workflow views: workflow-case summaries derived from run manifests and PM
  session bindings, now with queue/SLA read surfaces and a read-only
  `Workflow read model` card sourced from `workflow_case_read_model`.
- Run Detail: incident packs, approval summaries, replay compare reports, and a
  read-only role-binding summary in the existing `Status & Contract` card, so
  bundle/runtime posture is visible on the main run surface without creating a
  second execution-authority switch.
- Builder/public discovery: the home builder section now surfaces direct
  `Read-only MCP quickstart` and `API and contract quickstart` entry cards so
  operators can jump from the web control surface into the truthful public
  onboarding ladder before diving into package-level docs.

## Strongest Signals

- operator-first web workflows
- command visibility over product marketing polish
- alignment with the repository's three truth layers

## Key Config

- API base and frontend fetch layer are defined in `apps/dashboard/lib/api.ts`.
- Runtime defaults and startup commands are coordinated from the repo root
  quickstart in `README.md`.
- Dashboard dependency hotfixes should keep the root `package.json` overrides,
  root `pnpm-lock.yaml`, and `apps/dashboard/pnpm-lock.yaml` aligned so
  dashboard-only transitive patches do not drift from the workspace baseline.
- `apps/dashboard/pnpm-lock.yaml` is a maintained dashboard-specific lockfile;
  keep transitive security patch updates in the same change set when dashboard
  dependency metadata changes.
- The optional `depcheck` package is intentionally absent from the default
  dashboard dependency set; the dead-code gate already skips when the probe is
  unavailable, so leaving it out avoids carrying an otherwise unnecessary
  `brace-expansion` advisory path in the maintained lock surface.
- Dashboard dependency lock refreshes are repo-owned: when transitive package
  fixes land here, keep `apps/dashboard/pnpm-lock.yaml` aligned with the root
  `package.json` / `pnpm-lock.yaml` change set.
- Current transitive hardening includes the `yaml` override used through
  `cosmiconfig@7.1.0`; keep the dashboard lockfile and the root override in
  sync so the dashboard does not drift onto an older parser patch level.
- Current lock maintenance also pins patched `picomatch` / `brace-expansion`
  transitive paths through the repo-owned override set so GitHub security
  receipts and the dashboard lockfile stay aligned.
- When a dashboard security-only lock refresh lands, keep this module README in
  the same change set so doc-drift gates can trace the maintenance decision to
  the dashboard surface that actually owns the lockfile.

## Common Troubleshooting

- Dependencies missing: `pnpm --dir apps/dashboard install`
- Test failure: `pnpm --dir apps/dashboard test`
- Typecheck: `pnpm --dir apps/dashboard exec tsc -p tsconfig.typecheck.json --noEmit`

## Quality Gate

- Coverage gate (stage-1): >= 85%
- Command Tower regression tests now treat the English-first labels, drawer
  names, and quick-action copy as the canonical operator contract; update the
  dashboard tests in the same patch whenever those public-facing labels move.
- The current CI unblock patch also keeps the PM and RunDetail regression suite
  aligned with the English-first operator surface, including Command Tower
  session copy, PM composer controls, and RunDetail tab/status wording.
- Workflow Case detail now also renders the latest linked run's
  `workflow_case_read_model` for operator inspection, but that card remains a
  read-only mirror below `task_contract` execution authority.
- Run Detail now mirrors `role_binding_read_model` inside the existing
  `Status & Contract` card, and that note keeps `task_contract` explicit as the
  only execution authority.
- Agents now also uses a registry-backed read-only role catalog on the first
  screen, so operators can inspect skills/MCP/runtime posture before drilling
  into individual agent seats or scheduler backlog.
- Contracts now acts as a bundle/runtime inspector: each card keeps the task
  contract envelope visible while projecting the derived bundle/runtime summary
  as read-only operator context rather than a control surface; role-default
  edits belong on `Agents`, not on the contract inspector.
