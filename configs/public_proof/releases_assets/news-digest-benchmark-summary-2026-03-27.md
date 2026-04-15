# news_digest Public Baseline Benchmark Summary - 2026-03-27

This file records the first tracked public baseline summary for the official
`news_digest` happy path.

It is a single-run baseline, not a broad multi-round benchmark campaign.

## Benchmark Scope

- commit: `03b8bf9`
- run id: `run_20260327_102651_8274cd4519324674a3ddd67506febd83`
- happy path: `news_digest`
- query count: `1`
- requested source allowlist: `theverge.com`
- providers: `gemini_web`, `grok_web`
- repeat: `2`
- verify repeat: `1`
- web mode: `headless`
- session mode observed in runtime artifacts: `allow_profile`

## Aggregate Outcome

- pipeline result: `ok=true`
- main provider attempts: `4`
- recorded provider failures: `0`
- failure rate across main provider attempts: `0%`
- verification runs reported by the pipeline: `1`

## Provider Timing Summary

| Provider | Attempts | Successes | Average duration | Range |
| --- | --- | --- | --- | --- |
| `gemini_web` | 2 | 2 | `9532 ms` | `9532-9532 ms` |
| `grok_web` | 2 | 2 | `10331.5 ms` | `10317-10346 ms` |

## Reproduction Command

Use the exact proof command recorded in
`configs/public_proof/releases_assets/news-digest-healthy-proof-2026-03-27.md`.

This baseline intentionally reuses the same successful `news_digest` run so the
benchmark summary and proof summary stay tied to the same evidence set.

## Tracked Outputs

- `configs/public_proof/releases_assets/news-digest-healthy-proof-2026-03-27.md`
- `configs/public_proof/releases_assets/news-digest-healthy-proof-summary-2026-03-27.json`
- `configs/public_proof/releases_assets/news-digest-benchmark-summary-2026-03-27.json`
- `docs/releases/assets/news-digest-healthy-proof-gemini-2026-03-27.png`
- `docs/releases/assets/news-digest-healthy-proof-grok-2026-03-27.png`

## Copied Machine Summary

- `configs/public_proof/releases_assets/news-digest-benchmark-summary-2026-03-27.json`

Original runtime root before cleanup:

- `.runtime-cache/w3-news-digest-attempt-profile-allowlist-v2/runs/run_20260327_102651_8274cd4519324674a3ddd67506febd83`

## Truth Boundary

- This summary is fit for public baseline wording such as “first tracked
  `news_digest` baseline,” not for broad claims like “stable production
  benchmark” or “representative release average.”
- The numbers above come from one successful local run and should stay labeled
  as a single-run baseline until a broader benchmark artifact replaces them.
