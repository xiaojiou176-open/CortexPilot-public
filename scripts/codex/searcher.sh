#!/usr/bin/env bash
set -euo pipefail
CODEX_HOME="$HOME/.codex-homes/codeflow-searcher"
export CODEX_HOME
exec codex "$@"
