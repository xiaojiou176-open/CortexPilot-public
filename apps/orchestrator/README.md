# Orchestrator Module

`apps/orchestrator/` is the backend core of CortexPilot.

## What It Owns

- task intake and contract compilation
- execution, review, replay, and evidence flows
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
uv run pytest -q
python -m cortexpilot_orch.cli --help
```

## Probe Artifact Note

- `scripts/e2e_external_web_probe.py` does not persist `run_id` values in JSON
  status/report outputs. The writer helpers also no longer take `run_id`
  inputs, so probe receipts keep timestamps, stages, and artifact summaries
  only.
