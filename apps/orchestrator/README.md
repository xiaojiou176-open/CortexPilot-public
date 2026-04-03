# Orchestrator Module

`apps/orchestrator/` is the backend core of CortexPilot.

## What It Owns

- task intake and contract compilation
- intake preview and execution-plan prediction
- execution, review, replay, and evidence flows
- read-only MCP exposure for control-plane truth
- explain-only operator copilot brief generation
- API and CLI entrypoints
- gate enforcement and runtime state

## Key Paths

- `src/cortexpilot_orch/config.py`
- `src/cortexpilot_orch/planning/`
- `src/cortexpilot_orch/gates/`
- `src/cortexpilot_orch/store/`
- `src/cortexpilot_orch/policy/browser_policy_resolver.py`

## Search And Browser Policy Notes

- search-task execution resolves browser policy before a web provider runs
- `allow_profile` is the only supported profile-sharing mode for the current
  public `news_digest` proof path
- `allow_profile` can still degrade to `ephemeral` if the configured profile
  root is outside the allowlist
- the current `gemini_web` prompt path supports both classic text inputs and
  `contenteditable` textbox surfaces, so provider DOM changes do not silently
  break the `news_digest` proof route again

## Commands

```bash
bash scripts/run_orchestrator_pytest.sh apps/orchestrator/tests -q
bash scripts/run_orchestrator_cli.sh --help
```

## Runtime Provider Compatibility Notes

- `CORTEXPILOT_PROVIDER_BASE_URL` may point either at a normal OpenAI-compatible
  `/v1` endpoint or at the Switchyard runtime-first surface
  `/v1/runtime/invoke`.
- When the base URL points at `Switchyard /v1/runtime/invoke`, the orchestrator
  now forces the Agents SDK onto `chat_completions` instead of the default
  `responses` path, because Switchyard is being consumed as a runtime-first
  invoke surface rather than as a fake OpenAI-compatible gateway.
- The current thin slice supports:
  - standard BYOK routing when CortexPilot keeps a normal runtime provider such
    as `gemini`, `openai`, or `anthropic`
  - explicit web-provider routing when the model is written as
    `provider/model`, for example `chatgpt/gpt-4o` or `claude/claude-3-5-sonnet`
- the current runtime-first slice is limited to chat-style compatibility
  surfaces such as intake planning and operator-copilot briefs; it is not a
  generic replacement for every Agents runner path
- The current Switchyard adapter is intentionally chat-only. It does **not**
  expose tool-calling parity yet, so agent flows that require tool invocation
  must keep using a provider path that already supports those semantics.
- `agents_runner` therefore fails closed when `agents_base_url` points at
  `Switchyard /v1/runtime/invoke`, because that path still implies MCP tool
  execution semantics the adapter does not provide yet.

## Role Contract v1 Notes

- compiled task contracts now emit a resolved `role_contract` object so the
  assigned role, role purpose, prompt ref, MCP bundle ref, runtime binding,
  tool permissions, handoff posture, and fail-closed conditions are visible in
  one place instead of being inferred from scattered helpers alone
- intake preview now exposes `role_contract_summary` next to
  `contract_preview`, so operators can inspect the resolved role binding
  without reconstructing it from raw schema fields
- `run_intake(...)` now returns a contract-derived `role_binding_summary` read
  model, and the same summary is persisted into run manifests so PM-facing
  helpers plus post-run surfaces can inspect the same bundle/runtime state;
  registry-backed `mcp_bundle_ref` rows now surface their resolved tool set
  directly instead of falling back to an empty placeholder array
  without treating that summary as execution authority
- `get_run(...)` now also returns a stable `role_binding_read_model`, so run
  detail and read-only MCP consumers can inspect persisted bundle/runtime state
  without treating that read model as execution authority
  from `contract.json` without upgrading that read surface into execution
  authority
- the Prompt 8 frontend contract convergence now publishes the same run/workflow
  read-model truth through `docs/api/openapi.cortexpilot.json` and generated
  `@cortexpilot/frontend-api-contract` artifacts, so frontend consumers no
  longer have to infer Prompt 5/6/7 payload shapes from helper code alone
- role prompt refs now resolve from `policies/agents/codex/roles/` as the
  repository-owned prompt asset root when a worktree-local `codex/roles/`
  override is absent
- qualifying delivery roles now resolve `skills_bundle_ref` through the
  repo-owned `policies/skills_bundle_registry.json` surface; PM, SEARCHER, and
  RESEARCHER intentionally remain `null` to avoid widening non-delivery roles
  into a fake skills system
- handoff summaries remain structured evidence only; they no longer rewrite the
  execution instruction carried by the task contract

## Read-Only MCP + Copilot Notes

- the repo-local MCP entry is `python -m cortexpilot_orch.cli mcp-readonly-server`
- the MCP surface is intentionally **read-only only** and must not mutate runs,
  workflows, approvals, queue state, or provider state
- shared control-plane reads flow through
  `src/cortexpilot_orch/services/control_plane_read_service.py`
- workflow/control-plane reads now also carry `workflow_case_read_model`, which
  points back to the latest linked run's persisted `role_binding_summary`
  without turning workflow cards into execution authority
- dashboard and desktop Run Detail now project `role_binding_read_model` on
  their primary operator surfaces using the same read-only boundary, rather
  than keeping that binding summary hidden behind workflow-only surfaces
- `/api/agents` now also publishes a registry-backed role catalog that reuses
  the same `build_role_binding_summary(...)` authority/source grammar, so
  agents surfaces can inspect role defaults without inventing a second truth
  surface; the lightweight provider-capability import path that feeds those
  read models now stays free of unused helper imports and other dead-code noise
- `/api/agents/roles/{role}/config` plus `preview` / `apply` sibling routes now
  expose the repo-owned role configuration desk for future compiled defaults;
  these routes validate refs and runtime bindings fail-closed, preview the
  derived readback, and persist changes into
  `policies/role_config_registry.json` without promoting that surface into
  execution authority
- intake preview, run manifests, and operator-copilot briefs now also surface
  a derived runtime capability summary (`lane`, `compat_api_mode`,
  `provider_status`, `tool_execution`) so runtime/provider posture is readable
  from repo-owned control-plane reads without implying full tool parity
- the role-config runtime capability preview now resolves through
  `src/cortexpilot_orch/runners/provider_capability.py`, which keeps the
  advisory control-plane lane honest without forcing GitHub-hosted quick
  hygiene checks to import the full provider transport runtime
- `/api/contracts` now normalizes contract artifact rows into a read-only
  bundle/runtime inspector payload instead of leaving dashboard/desktop pages
  to guess from heterogeneous raw JSON blobs
- the bounded operator brief is generated by
  `src/cortexpilot_orch/services/operator_copilot.py`
- the current operator-copilot contract is explain-only, not a write or
  recovery action surface

## Probe Artifact Note

- `scripts/e2e_external_web_probe.py` does not persist `run_id` values in JSON
  status/report outputs. The writer helpers also no longer take `run_id`
  inputs; receipts now persist stage/category allowlists, epoch timing fields,
  and artifact summaries through dedicated safe summary scalars instead of
  reading from the mixed internal report state.
- Probe sanitizer coverage keeps secret-like fixture strings in direct helper
  tests, while JSON writer contract tests use non-sensitive placeholders so PR
  security scans do not mistake unit-test fixtures for persisted clear-text
  payloads.
- PM intake responses only emit `task_template` / `template_payload` when those
  fields are actually present, keeping the response payload aligned with the
  schema contract used by API and intake coverage tests.
- PM intake preview now emits an `execution_plan_report` advisory object through
  `/api/pm/intake/preview`, so operators can inspect the compiled contract
  shape, predicted reports/artifacts, and likely approval boundary before
  starting execution.
- PM task packs are now registry-driven from `contracts/packs/*.json`; the
  orchestrator normalizes `template_payload`, derives objective/search queries,
  and returns pack metadata through `/api/pm/task-packs`.
- Queue operations now expose `/api/queue`, `/api/queue/from-run/{run_id}`, and
  `/api/queue/run-next`, so the control plane can queue an existing run
  contract with `priority`, `scheduled_at`, and `deadline_at`, then derive
  queue/SLA state before execution starts.
- Pending approval views now synthesize an `approval_pack` summary from run
  events plus manifest metadata instead of exposing only the raw
  `HUMAN_APPROVAL_REQUIRED` payload.
- Successful public task slices now synthesize a `proof_pack` summary from the
  primary result report and evidence refs, so proof-oriented runs expose an
  operator-readable success pack without relying on release docs alone.
- Replay flows now persist both `replay_report.json` and
  `run_compare_report.json`, so Run Detail surfaces can show compare summaries
  without re-deriving them client-side.
- Workflow reads now persist a governed `workflow_case` snapshot under
  `.runtime-cache/cortexpilot/workflow-cases/`, so case metadata is not rebuilt
  from PM session bindings on every page load alone.

## Mainline CI Notes

- The orchestrator Python lock surface now carries explicit security pins for
  `cryptography`, `pyasn1`, `pyjwt`, and `requests`, and the default dependency
  gate now also pins `pygments==2.20.0`, which lets
  `configs/pip_audit_ignored_advisories.json` stay empty again instead of
  carrying a stale upstream-unfixed downgrade.
- CI policy snapshots, policy/core stage logs, and the orchestrator coverage
  JSON now live under `.runtime-cache/test_output/ci/`, which keeps retention
  reports free of root-level `test_output` residue during `main` push
  validation.
- Strict upstream governance refresh now reuses cached upstream receipts only
  when the full same-batch smoke bundle is present, fresh, and passed; missing,
  stale, failed, or mixed-batch receipts fall back to
  `scripts/verify_upstream_slices.py --mode smoke` so `main` validation
  regenerates real receipts instead of failing on missing files alone.
- PR-route governance closeout now treats `trusted_pr` route exemptions for
  `inventory_matrix_gate` and `same_run_cohesion` as optional evidence in the
  pre-push closeout builder, so lightweight PR-bound pushes do not fail merely
  because workflow-dispatch-only upstream receipts were intentionally skipped.
- Governance evidence refresh now also reuses a fresh
  `clean_room_recovery.json` receipt when that report already passed inside the
  freshness window, which keeps repeated PR-bound CI-fix pushes from rerunning
  the full clean-room bundle just to restate the same healthy local receipt.
- Mainline live-provider probes keep the stricter credential contract: process
  env first, `~/.codex/config.toml` second, while repo-local dotenv files and
  shell-export fallback stay disabled on `CI` / strict mainline contexts.
