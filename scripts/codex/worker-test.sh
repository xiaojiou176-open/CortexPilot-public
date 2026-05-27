#!/usr/bin/env bash
set -euo pipefail
CODEX_HOME="$HOME/.codex-homes/codeflow-worker-test"
export CODEX_HOME
exec codex "$@"
