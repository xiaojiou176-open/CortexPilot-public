#!/usr/bin/env bash
set -euo pipefail
CODEX_HOME="$HOME/.codex-homes/agentcoder-pm"
export CODEX_HOME
exec codex "$@"
