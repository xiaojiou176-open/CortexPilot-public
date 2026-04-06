# news_digest Benchmark Route Receipt - 2026-03-27

This file is a tracked route/blocker receipt for the first public `news_digest`
benchmark. It is not a healthy public benchmark artifact.

## Goal

The first public benchmark contract requires a real tracked run for the
official `news_digest` happy path before any public numbers can be quoted.

## Commands Executed

1. Planning-only suite selection check:

   ```bash
   bash scripts/bench_e2e_speed.sh --rounds 1 --ui-full-gemini-strict --dry-run
   ```

   - exit code: `0`
   - runtime output:
     - `.runtime-cache/test_output/benchmarks/bench_20260327_093007/raw_results.json`
     - `.runtime-cache/test_output/benchmarks/bench_20260327_093007/summary.json`
     - `.runtime-cache/test_output/benchmarks/bench_20260327_093007/summary.md`

2. Shortest real benchmark attempt available in the current script:

   ```bash
   bash scripts/bench_e2e_speed.sh --rounds 1 --dashboard-high-risk --stop-on-failure
   ```

   - exit code: `0` from the benchmark wrapper
   - runtime output:
     - `.runtime-cache/test_output/benchmarks/bench_20260327_093113/raw_results.json`
     - `.runtime-cache/test_output/benchmarks/bench_20260327_093113/summary.json`
     - `.runtime-cache/test_output/benchmarks/bench_20260327_093113/summary.md`

## Real Attempt Result

The real run produced a tracked runtime summary, but it is not publishable as
the first `news_digest` benchmark:

- suite: `dashboard_high_risk_e2e`
- command: `npm run dashboard:e2e:high-risk-actions:real`
- round result: `success=false`, `exit_code=1`
- failure category: `report_missing`
- summary path:
  `.runtime-cache/test_output/benchmarks/bench_20260327_093113/summary.md`

## Why This Does Not Satisfy The Public Contract

1. The benchmark contract requires the official `news_digest` happy path first.
2. The currently runnable real suite is not `news_digest`-specific:
   - `scripts/e2e_dashboard_high_risk_actions_real.sh` stamps the scenario as
     `dashboard high risk actions real e2e`
   - the same script seeds the backend with the objective
     `dashboard high risk actions real e2e seed`
3. The real run failed before it could emit the expected per-suite report:
   - dashboard log:

     ```text
     ❌ [install-dashboard-deps] forbidden root node_modules detected
     Run: bash scripts/cleanup_workspace_modules.sh
     ```

   - no fresh per-suite JSON was written under
     `.runtime-cache/test_output/ui_regression/`

## Shortest Next Path

1. Restore the workspace to a benchmark-runnable state by clearing the
   forbidden root `node_modules` via the repo cleanup workflow.
2. Add or route a benchmark suite that actually exercises the public
   `news_digest` happy path instead of the dashboard high-risk scenario.
3. Re-run the benchmark and copy the resulting runtime summary out of
   `.runtime-cache/` into a tracked path under `docs/releases/assets/` or
   `docs/assets/storefront/`.

## Truth Boundary

- A real benchmark attempt was executed on `2026-03-27`.
- A real runtime summary exists for that attempt.
- No healthy public `news_digest` benchmark figure exists yet.
