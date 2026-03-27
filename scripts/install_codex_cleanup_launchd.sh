#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PY_SCRIPT="$REPO_ROOT/scripts/codex_process_cleanup.py"

if [[ ! -f "$PY_SCRIPT" ]]; then
  echo "❌ Missing cleanup script: $PY_SCRIPT" >&2
  exit 2
fi

LABEL="com.terry.codex-process-cleanup"
PLIST_PATH="$HOME/Library/LaunchAgents/$LABEL.plist"

INSTALL_DIR="$HOME/.codex/automation"
INSTALLED_SCRIPT="$INSTALL_DIR/codex_process_cleanup.py"
LOG_DIR="$HOME/.codex/runtime/logs"

mkdir -p "$LOG_DIR" "$HOME/Library/LaunchAgents" "$INSTALL_DIR"
cp "$PY_SCRIPT" "$INSTALLED_SCRIPT"
chmod +x "$INSTALLED_SCRIPT"

MIN_AGE_SEC="${MIN_AGE_SEC:-1800}"
INTERVAL_SEC="${INTERVAL_SEC:-900}"
INCLUDE_CURSOR="${INCLUDE_CURSOR:-0}"
ALSO_CLEAN_MCP="${ALSO_CLEAN_MCP:-0}"

ARGS=(
  "/usr/bin/env"
  "python3"
  "$INSTALLED_SCRIPT"
  "--min-age-sec"
  "$MIN_AGE_SEC"
  "--log-path"
  "$LOG_DIR/codex_process_cleanup.jsonl"
)

if [[ "$INCLUDE_CURSOR" == "1" ]]; then
  ARGS+=("--include-cursor")
fi
if [[ "$ALSO_CLEAN_MCP" == "1" ]]; then
  ARGS+=("--also-clean-mcp")
fi

{
  cat <<'PLIST_HEAD'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
PLIST_HEAD

  echo "  <key>Label</key>"
  echo "  <string>${LABEL}</string>"
  echo

  echo "  <key>ProgramArguments</key>"
  echo "  <array>"
  for arg in "${ARGS[@]}"; do
    escaped=${arg//&/&amp;}
    escaped=${escaped//</&lt;}
    escaped=${escaped//>/&gt;}
    echo "    <string>${escaped}</string>"
  done
  echo "  </array>"
  echo

  echo "  <key>RunAtLoad</key>"
  echo "  <true/>"
  echo

  echo "  <key>StartInterval</key>"
  echo "  <integer>${INTERVAL_SEC}</integer>"
  echo

  echo "  <key>StandardOutPath</key>"
  echo "  <string>${LOG_DIR}/codex_process_cleanup.launchd.out.log</string>"
  echo

  echo "  <key>StandardErrorPath</key>"
  echo "  <string>${LOG_DIR}/codex_process_cleanup.launchd.err.log</string>"
  echo "</dict>"
  echo "</plist>"
} > "$PLIST_PATH"

plutil -lint "$PLIST_PATH"

launchctl bootout "gui/$(id -u)/${LABEL}" >/dev/null 2>&1 || true
launchctl bootstrap "gui/$(id -u)" "$PLIST_PATH"
launchctl enable "gui/$(id -u)/${LABEL}" >/dev/null 2>&1 || true


echo "✅ Installed launchd auto-cleanup"
echo "- Label: ${LABEL}"
echo "- Plist: ${PLIST_PATH}"
echo "- Interval: ${INTERVAL_SEC}s"
echo "- Min age: ${MIN_AGE_SEC}s"
echo "- Include cursor app-server: ${INCLUDE_CURSOR}"
echo "- Also clean mcp-server: ${ALSO_CLEAN_MCP}"
echo "- Installed script: ${INSTALLED_SCRIPT}"
echo "- Runtime logs: ${LOG_DIR}"
