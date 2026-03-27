# news_digest Healthy Proof Route Receipt - 2026-03-27

This file is a tracked blocker receipt for a real `news_digest` healthy-proof
attempt. It is not a healthy public proof artifact.

## Goal

Generate a real backend-backed `news_digest` proof run that could later be
copied into a tracked proof bundle under `docs/`.

## Commands Executed

1. Direct `news_digest` pipeline attempt with the default effective browser
   policy:

   ```bash
   bash -lc 'source scripts/lib/env.sh >/dev/null 2>&1; export PYTHONPATH="$PWD/apps/orchestrator/src:$PWD"; export CORTEXPILOT_RUNTIME_ROOT="$PWD/.runtime-cache/w3-news-digest-attempt"; export CORTEXPILOT_RUNS_ROOT="$CORTEXPILOT_RUNTIME_ROOT/runs"; export CORTEXPILOT_WEB_HEADLESS=1; "$CORTEXPILOT_PYTHON" - <<'"'"'PY'"'"'
   import json
   from cortexpilot_orch.store.run_store import RunStore
   from cortexpilot_orch.runners.tool_runner import ToolRunner
   from cortexpilot_orch.scheduler.tool_execution_pipeline import run_search_pipeline

   store = RunStore()
   run_id = store.create_run("w3-news-digest")
   request = {
       "queries": ["Seattle AI site:theverge.com"],
       "providers": ["gemini_web", "grok_web"],
       "verify": {"providers": ["gemini_web"], "repeat": 1},
       "task_template": "news_digest",
       "template_payload": {
           "topic": "Seattle AI",
           "sources": ["theverge.com"],
           "time_range": "24h",
           "max_results": 3,
       },
   }
   result = run_search_pipeline(
       run_id,
       ToolRunner(run_id=run_id, store=store),
       store,
       request,
       requested_by={"role": "PM", "agent_id": "pm-w3"},
   )
   print(json.dumps({"run_id": run_id, "result": result}, ensure_ascii=False))
   PY'
   ```

   - exit code: `0`
   - run id: `run_20260327_093822_ad49b24b16ea4c1b8ba4d2bfc4b5a81d`
   - runtime outputs:
     - `.runtime-cache/w3-news-digest-attempt/runs/run_20260327_093822_ad49b24b16ea4c1b8ba4d2bfc4b5a81d/reports/news_digest_result.json`
     - `.runtime-cache/w3-news-digest-attempt/runs/run_20260327_093822_ad49b24b16ea4c1b8ba4d2bfc4b5a81d/reports/evidence_bundle.json`
     - `.runtime-cache/w3-news-digest-attempt/runs/run_20260327_093822_ad49b24b16ea4c1b8ba4d2bfc4b5a81d/artifacts/search_results.json`

2. Second real attempt after trying to route through the local Chrome `Default`
   profile via environment overrides:

   ```bash
   bash -lc 'source scripts/lib/env.sh >/dev/null 2>&1; export PYTHONPATH="$PWD/apps/orchestrator/src:$PWD"; export CORTEXPILOT_RUNTIME_ROOT="$PWD/.runtime-cache/w3-news-digest-attempt-profile"; export CORTEXPILOT_RUNS_ROOT="$CORTEXPILOT_RUNTIME_ROOT/runs"; export CORTEXPILOT_WEB_HEADLESS=1; export CORTEXPILOT_BROWSER_PROFILE_MODE=allow_profile; export CORTEXPILOT_BROWSER_PROFILE_NAME=Default; "$CORTEXPILOT_PYTHON" - <<'"'"'PY'"'"'
   import json
   from cortexpilot_orch.store.run_store import RunStore
   from cortexpilot_orch.runners.tool_runner import ToolRunner
   from cortexpilot_orch.scheduler.tool_execution_pipeline import run_search_pipeline

   store = RunStore()
   run_id = store.create_run("w3-news-digest-profile")
   request = {
       "queries": ["Seattle AI site:theverge.com"],
       "providers": ["gemini_web", "grok_web"],
       "verify": {"providers": ["gemini_web"], "repeat": 1},
       "task_template": "news_digest",
       "template_payload": {
           "topic": "Seattle AI",
           "sources": ["theverge.com"],
           "time_range": "24h",
           "max_results": 3,
       },
   }
   result = run_search_pipeline(
       run_id,
       ToolRunner(run_id=run_id, store=store),
       store,
       request,
       requested_by={"role": "PM", "agent_id": "pm-w3"},
   )
   print(json.dumps({"run_id": run_id, "result": result}, ensure_ascii=False))
   PY'
   ```

   - exit code: `0`
   - run id: `run_20260327_094000_b253922524f94e868f39bde6bfb50ae7`
   - runtime outputs:
     - `.runtime-cache/w3-news-digest-attempt-profile/runs/run_20260327_094000_b253922524f94e868f39bde6bfb50ae7/reports/news_digest_result.json`
     - `.runtime-cache/w3-news-digest-attempt-profile/runs/run_20260327_094000_b253922524f94e868f39bde6bfb50ae7/reports/evidence_bundle.json`
     - `.runtime-cache/w3-news-digest-attempt-profile/runs/run_20260327_094000_b253922524f94e868f39bde6bfb50ae7/artifacts/search_results.json`

## Real Attempt Result

Both real attempts generated runtime artifacts, but neither produced a healthy
proof artifact.

- `news_digest_result.json` was written in both runs, but the status is
  `FAILED`.
- `grok_web` returned a web response entry, but the overall task still failed
  because the required `gemini_web` provider failed in both the main and verify
  passes.
- The primary failure text is:

  ```text
  来源链路失败（provider=gemini_web）：input box not found
  ```

## Evidence

1. The first run's tracked result shows a failed public task result instead of
   a healthy digest:

   - file:
     `.runtime-cache/w3-news-digest-attempt/runs/run_20260327_093822_ad49b24b16ea4c1b8ba4d2bfc4b5a81d/reports/news_digest_result.json`
   - key fields:
     - `status: "FAILED"`
     - `failure_reason_zh: "来源链路失败（provider=gemini_web）：input box not found"`

2. The first run's copied runtime artifacts capture the `gemini_web` failure:

   - error file:
     `.runtime-cache/w3-news-digest-attempt/runs/run_20260327_093822_ad49b24b16ea4c1b8ba4d2bfc4b5a81d/artifacts/search/search_gemini_web_Seattle_AI_site_thever_20260327_093826_108336_0d3ab49b/error.txt`
   - page snapshot:
     `.runtime-cache/w3-news-digest-attempt/runs/run_20260327_093822_ad49b24b16ea4c1b8ba4d2bfc4b5a81d/artifacts/search/search_gemini_web_Seattle_AI_site_thever_20260327_093826_108336_0d3ab49b/page.html`
   - copied error text:

     ```text
     input box not found
     ```

3. A local Chrome profile directory does exist on this machine, including a
   `Default` profile:

   ```text
   Default
   Profile 10
   Profile 11
   Profile 12
   Profile 13
   Profile 4
   Profile 7
   Profile 8
   Profile 9
   ```

4. Even after exporting `CORTEXPILOT_BROWSER_PROFILE_MODE=allow_profile` and
   `CORTEXPILOT_BROWSER_PROFILE_NAME=Default`, the second run still recorded the
   effective browser context as `ephemeral` in the copied search artifacts.

   - copied artifact root example:
     `.runtime-cache/w3-news-digest-attempt-profile/runs/run_20260327_094000_b253922524f94e868f39bde6bfb50ae7/artifacts/search/search_gemini_web_Seattle_AI_site_thever_20260327_094003_780408_96c11cb9/`
   - observed context:

     ```json
     {"mode":"ephemeral","headless":true}
     ```

## Why This Does Not Satisfy The Healthy Proof Contract

1. The first public proof contract requires a healthy backend-backed
   `news_digest` result, not a failed `news_digest_result.json`.
2. `run_search_pipeline()` currently requires `gemini_web` and `grok_web`; a
   partial `grok_web` response is not enough to mark the run healthy.
3. In the current execution path, the environment-level profile override did not
   change the effective browser session away from `ephemeral`, so the retry did
   not establish a stronger logged-in provider path.

## Current Precise Blocker

In the current environment and direct `news_digest` execution path, the required
`gemini_web` provider fails with `input box not found` under the effective
`ephemeral` browser session. A second real attempt that exported
`CORTEXPILOT_BROWSER_PROFILE_MODE=allow_profile` and
`CORTEXPILOT_BROWSER_PROFILE_NAME=Default` still recorded an `ephemeral`
session in the copied artifacts, so the current runnable path did not produce a
healthy backend-backed proof run.

## Shortest Next Path

1. Decide whether the proof route is allowed to pass an explicit
   `browser_policy` that points to a real logged-in browser profile or cookie
   source for `gemini_web`.
2. If yes, rerun the same `news_digest` pipeline with that explicit policy and
   verify that both `gemini_web` and `grok_web` succeed before copying any
   runtime output into `docs/`.
3. If no, keep the public proof status as missing and treat this receipt as the
   latest blocker evidence.

## Truth Boundary

- Two real `news_digest` proof attempts were executed on `2026-03-27`.
- Both attempts produced fresh runtime artifacts and a `news_digest_result.json`
  report.
- Neither attempt produced a healthy backend-backed public proof artifact.
