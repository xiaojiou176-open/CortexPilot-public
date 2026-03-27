# Security Policy

## Reporting A Vulnerability

- Do not open a public issue or pull request for a suspected security problem.
- Current private reporting path: if GitHub shows the private vulnerability
  reporting form for this repository, submit the report at
  `https://github.com/xiaojiou176-open/CortexPilot/security/advisories/new`.
- If that form is unavailable, do not disclose details publicly. This
  repository does not currently document an additional verified fallback
  private reporting channel, so none should be assumed.
- Wait for maintainer acknowledgement through the advisory flow before sharing
  any details publicly.

## In Scope

Please report issues involving:

- credential handling or secret exposure
- authorization, approval, or replay surfaces
- browser profile, cookie, or automation isolation
- telemetry, evidence, and log redaction
- CI, release, or supply-chain integrity

## What To Include

- affected path or feature
- reproduction steps
- expected and actual behavior
- impact assessment
- any temporary mitigation you tested

## What Not To Include

- real secrets, cookies, tokens, or private data
- exploit details in public channels
- large unrelated refactors mixed with a security report

## Response Expectations

- security reports are triaged on a best-effort basis
- no SLA or bounty program is promised
- coordinated disclosure is preferred

Thank you for helping keep CortexPilot safer for contributors and users.
