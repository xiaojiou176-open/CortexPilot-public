#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "🔐 [security] start secret scanning"

is_truthy() {
  case "${1:-}" in
    1 | true | TRUE | yes | YES | y | Y | on | ON)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

is_mainline_context() {
  if is_truthy "${CI:-0}"; then
    return 0
  fi
  if [[ "${CORTEXPILOT_CI_PROFILE:-}" == "strict" ]]; then
    return 0
  fi
  if [[ "${GITHUB_REF_NAME:-}" == "main" || "${GITHUB_BASE_REF:-}" == "main" ]]; then
    return 0
  fi
  return 1
}

require_scanner_default="0"
if is_mainline_context; then
  require_scanner_default="1"
fi
REQUIRE_SCANNER="${CORTEXPILOT_SECURITY_REQUIRE_SCANNER:-$require_scanner_default}"

if command -v trufflehog >/dev/null 2>&1; then
  echo "🚀 [security] scanning git history with trufflehog"
  tmp_output="$(mktemp "${TMPDIR:-/tmp}/cortexpilot-trufflehog.XXXXXX.jsonl")"
  cleanup_tmp_output() {
    rm -f "$tmp_output"
  }
  trap cleanup_tmp_output EXIT
  set +e
  trufflehog git "file://$ROOT_DIR" \
    --json \
    --results=verified,unknown,unverified \
    --filter-unverified \
    --fail-on-scan-errors \
    >"$tmp_output"
  trufflehog_status=$?
  set -e
  if [[ $trufflehog_status -ne 0 ]]; then
    echo "❌ [security] trufflehog scan failed (exit=$trufflehog_status)" >&2
    cat "$tmp_output" >&2 || true
    exit "$trufflehog_status"
  fi
  if [[ -s "$tmp_output" ]]; then
    echo "❌ [security] trufflehog findings detected:" >&2
    cat "$tmp_output" >&2
    exit 1
  fi
  echo "✅ [security] trufflehog scan passed"
  exit 0
fi

if command -v gitleaks >/dev/null 2>&1; then
  echo "🚀 [security] scanning git repository with gitleaks"
  gitleaks git "$ROOT_DIR" --redact --verbose -c "$ROOT_DIR/.gitleaks.toml"
  echo "✅ [security] gitleaks scan passed"
  exit 0
fi

echo "⚠️ [security] trufflehog/gitleaks not found, using built-in regex gate"

if [[ "$REQUIRE_SCANNER" == "1" ]]; then
  echo "❌ [security] CORTEXPILOT_SECURITY_REQUIRE_SCANNER=1 but trufflehog/gitleaks is unavailable" >&2
  exit 1
fi

PATTERN_1='sk-[A-Za-z0-9]{24,}'
PATTERN_2='(?i)bearer[[:space:]]+[A-Za-z0-9._\-]{24,}'
PATTERN_3='(?i)(api[_-]?key|token|secret|password)[[:space:]]*[:=][[:space:]]*["'"''][A-Za-z0-9._\-]{16,}["'"'']'

matches="$({
  rg -n --hidden --no-messages -g '!**/.git/**' -g '!**/.venv/**' -g '!**/node_modules/**' -g '!**/.runtime-cache/**' -g '!**/*.lock' -g '!**/pnpm-lock.yaml' -e "$PATTERN_1" . || true
  rg -n --hidden --no-messages -g '!**/.git/**' -g '!**/.venv/**' -g '!**/node_modules/**' -g '!**/.runtime-cache/**' -g '!**/*.lock' -g '!**/pnpm-lock.yaml' -e "$PATTERN_2" . || true
  rg -n --hidden --no-messages -g '!**/.git/**' -g '!**/.venv/**' -g '!**/node_modules/**' -g '!**/.runtime-cache/**' -g '!**/*.lock' -g '!**/pnpm-lock.yaml' -e "$PATTERN_3" . || true
} | sort -u)"

if [[ -n "$matches" ]]; then
  echo "❌ [security] suspected sensitive data found; remediate immediately:" >&2
  echo "$matches" >&2
  exit 1
fi

echo "✅ [security] built-in secret scan passed"
