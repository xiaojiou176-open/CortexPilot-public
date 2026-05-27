#!/usr/bin/env bash
set -euo pipefail
CODEX_HOME="$HOME/.codex-homes/agentcoder-worker-infra"
export CODEX_HOME
exec codex "$@"
