#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

CURRENT_RUN_ROOT=".runtime-cache/openvibecoding/reports/ci/current_run"
CURRENT_RUN_ROUTE_REPORT=".runtime-cache/openvibecoding/reports/ci/routes/local-advisory.json"
CURRENT_RUN_SOURCE_MANIFEST="${CURRENT_RUN_ROOT}/source_manifest.json"
CURRENT_RUN_CONSISTENCY_JSON="${CURRENT_RUN_ROOT}/consistency.json"

cleanup_forbidden_python_residue() {
  local found=0
  while IFS= read -r path; do
    [[ -n "$path" ]] || continue
    found=1
    rm -rf "$path"
    echo "🧹 [truth-triage] removed transient residue: $path"
  done < <(
    find apps scripts tooling \
      \( -name '__pycache__' -o -name '.pytest_cache' \) \
      -type d 2>/dev/null | sort
  )
  if [[ "$found" -eq 0 ]]; then
    echo "🧹 [truth-triage] no forbidden transient Python residue found"
  fi
}

build_local_advisory_current_run_manifest() {
  local head_sha
  head_sha="$(git rev-parse HEAD)"
  mkdir -p "$CURRENT_RUN_ROOT" "$(dirname "$CURRENT_RUN_ROUTE_REPORT")"
  bash scripts/run_governance_py.sh scripts/build_ci_route_report.py seed \
    --output "$CURRENT_RUN_ROUTE_REPORT" \
    --route-id "local-advisory" \
    --trust-class "trusted" \
    --runner-class "local" \
    --cloud-bootstrap-allowed "false" \
    --github-run-id "local-run" \
    --github-run-attempt "local-attempt" \
    --github-sha "$head_sha" \
    --github-ref "local" \
    --github-event-name "local" \
    --job-observed "truth-triage"
  bash scripts/run_governance_py.sh scripts/build_ci_current_run_sources.py \
    --output "$CURRENT_RUN_SOURCE_MANIFEST" \
    --route-id "local-advisory" \
    --trust-class "trusted" \
    --runner-class "local" \
    --cloud-bootstrap-allowed "false" \
    --cloud-bootstrap-used "false" \
    --github-run-id "local-run" \
    --github-run-attempt "local-attempt" \
    --github-sha "$head_sha" \
    --github-ref "local" \
    --github-event-name "local" \
    --route-report "$CURRENT_RUN_ROUTE_REPORT"
}

preserve_authoritative_current_run_manifest() {
  python3 - <<'PY'
import json
from pathlib import Path

manifest = Path(".runtime-cache/openvibecoding/reports/ci/current_run/source_manifest.json")
consistency = Path(".runtime-cache/openvibecoding/reports/ci/current_run/consistency.json")
if not manifest.is_file() or not consistency.is_file():
    raise SystemExit(1)

manifest_payload = json.loads(manifest.read_text(encoding="utf-8"))
consistency_payload = json.loads(consistency.read_text(encoding="utf-8"))
is_authoritative = bool(consistency_payload.get("authoritative_current_truth"))
source_route = str(manifest_payload.get("source_route") or "").strip()

if is_authoritative and source_route and source_route != "local-advisory":
    raise SystemExit(0)
raise SystemExit(1)
PY
}

echo "🧭 [truth-triage] start"
echo
echo "== normalize transient residue =="
cleanup_forbidden_python_residue
echo
echo "== repo-side truth =="
OPENVIBECODING_HYGIENE_SKIP_UPSTREAM=1 bash scripts/check_repo_hygiene.sh
echo

echo "== external truth =="
bash scripts/run_governance_py.sh scripts/check_upstream_inventory.py --mode gate
bash scripts/run_governance_py.sh scripts/check_upstream_same_run_cohesion.py
echo

echo "== current-run truth =="
if preserve_authoritative_current_run_manifest; then
  echo "ℹ️ [truth-triage] preserving existing authoritative current-run manifest"
else
  build_local_advisory_current_run_manifest
fi
bash scripts/run_governance_py.sh scripts/check_ci_current_run_sources.py --source-manifest "$CURRENT_RUN_SOURCE_MANIFEST"
echo

echo "ℹ️ [truth-triage] completed"
echo "   repo-side truth: see current shell output"
echo "   external truth: .runtime-cache/test_output/governance/upstream_inventory_report.json + .runtime-cache/test_output/governance/upstream_same_run_cohesion.json"
echo "   current-run truth: .runtime-cache/openvibecoding/reports/ci/current_run/consistency.json"
