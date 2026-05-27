#!/usr/bin/env bash

if [[ -z "${__codeflow_env_bootstrapped:-}" ]]; then
  __codeflow_env_bootstrapped=1
  __codeflow_repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
  # Shared env bootstrap owns toolchain root resolution for shell entrypoints.
  source "$__codeflow_repo_root/scripts/lib/toolchain_env.sh"
  __codeflow_default_env_root="${CODEFLOW_DEFAULT_ENV_ROOT:-$HOME/.config/codeflow}"
  for __codeflow_env_file in \
    "${CODEFLOW_ENV_FILE:-}" \
    "$__codeflow_default_env_root/.env.local" \
    "$__codeflow_default_env_root/.env"; do
    [[ -n "$__codeflow_env_file" ]] || continue
    if [[ -f "$__codeflow_env_file" ]]; then
      set -a
      # shellcheck disable=SC1090
      source "$__codeflow_env_file"
      set +a
    fi
  done
  __codeflow_load_from_zsh_if_missing() {
    local key="$1"
    if [[ "${CODEFLOW_DISABLE_ZSH_ENV_FALLBACK:-0}" == "1" ]]; then
      return 0
    fi
    if [[ "${CI:-}" == "1" || "${CI:-}" == "true" || "${GITHUB_ACTIONS:-}" == "1" ]] && [[ "${CODEFLOW_ALLOW_ZSH_ENV_FALLBACK_ON_CI:-0}" != "1" ]]; then
      return 0
    fi
    if [[ -n "${!key:-}" ]]; then
      return 0
    fi
    if ! command -v zsh >/dev/null 2>&1; then
      return 0
    fi
    local raw
    raw="$(zsh -lc "printenv ${key} 2>/dev/null || true" | head -n 1)"
    if [[ -z "$raw" ]]; then
      for zsh_file in "$HOME/.zshenv" "$HOME/.zprofile" "$HOME/.zshrc"; do
        if [[ ! -f "$zsh_file" ]]; then
          continue
        fi
        raw="$(
          awk -v k="$key" '
            $0 ~ "^[[:space:]]*#" { next }
            {
              line=$0
              sub(/[[:space:]]+#.*$/, "", line)
              prefix="^[[:space:]]*(export[[:space:]]+)?"
              if (line ~ prefix k "[[:space:]]*=") {
                sub(prefix k "[[:space:]]*=[[:space:]]*", "", line)
                gsub(/^[[:space:]]+|[[:space:]]+$/, "", line)
                sub(/[[:space:]]*;[[:space:]]*$/, "", line)
                print line
              }
            }
          ' "$zsh_file" | tail -n 1
        )"
        if [[ -n "$raw" ]]; then
          break
        fi
      done
    fi
    if [[ -z "$raw" ]]; then
      return 0
    fi
    raw="${raw%\"}"
    raw="${raw#\"}"
    raw="${raw%\'}"
    raw="${raw#\'}"
    export "$key=$raw"
  }
  # Global-shell fallback for live tests: when current process env/.env is empty, try zsh login env.
  __codeflow_load_from_zsh_if_missing "GEMINI_API_KEY"
  __codeflow_load_from_zsh_if_missing "OPENAI_API_KEY"
  __codeflow_load_from_zsh_if_missing "ANTHROPIC_API_KEY"
  export CODEFLOW_MACHINE_CACHE_ROOT="${CODEFLOW_MACHINE_CACHE_ROOT:-$(codeflow_machine_cache_root "$__codeflow_repo_root")}"
  export CODEFLOW_TOOLCHAIN_CACHE_ROOT="${CODEFLOW_TOOLCHAIN_CACHE_ROOT:-$(codeflow_toolchain_cache_root "$__codeflow_repo_root")}"
  export CODEFLOW_PNPM_STORE_DIR="${CODEFLOW_PNPM_STORE_DIR:-$(codeflow_pnpm_store_dir "$__codeflow_repo_root")}"
  export PLAYWRIGHT_BROWSERS_PATH="${PLAYWRIGHT_BROWSERS_PATH:-$(codeflow_playwright_browsers_path "$__codeflow_repo_root")}"
  export CARGO_HOME="${CARGO_HOME:-$(codeflow_cargo_home "$__codeflow_repo_root")}"
  if __codeflow_python_bin="$(codeflow_python_bin "$__codeflow_repo_root" 2>/dev/null)"; then
    export CODEFLOW_PYTHON="${CODEFLOW_PYTHON:-$__codeflow_python_bin}"
    export VIRTUAL_ENV="${VIRTUAL_ENV:-$(codeflow_python_venv_root "$__codeflow_repo_root")}"
  fi
  unset -f __codeflow_load_from_zsh_if_missing
  unset __codeflow_python_bin
  unset __codeflow_repo_root
  unset __codeflow_env_file
  unset __codeflow_default_env_root
fi

codeflow_env_get() {
  local name="$1"
  local default_value="${2:-}"
  local value="${!name-}"
  if [[ -n "$value" ]]; then
    printf "%s" "$value"
    return
  fi
  printf "%s" "$default_value"
}

codeflow_env_is_true() {
  local raw="${1:-}"
  raw="$(printf "%s" "$raw" | tr '[:upper:]' '[:lower:]')"
  [[ "$raw" == "1" || "$raw" == "true" || "$raw" == "yes" || "$raw" == "on" ]]
}

codeflow_env_normalize_bool() {
  if codeflow_env_is_true "$1"; then
    printf "true"
    return
  fi
  printf "false"
}
