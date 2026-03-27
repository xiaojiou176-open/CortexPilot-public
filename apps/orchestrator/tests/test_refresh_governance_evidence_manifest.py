from __future__ import annotations

import importlib.util
import json
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[3]
SCRIPT_PATH = REPO_ROOT / "scripts" / "refresh_governance_evidence_manifest.py"


def _load_module():
    spec = importlib.util.spec_from_file_location("refresh_governance_evidence_manifest", SCRIPT_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError("failed to load refresh_governance_evidence_manifest module")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def test_reuse_upstream_records_reports_fresh_failures_and_missing_receipts(tmp_path: Path) -> None:
    module = _load_module()
    module.ROOT = tmp_path
    module.UPSTREAM_RECORD_FRESH_SEC = 3600

    provider_path = tmp_path / ".runtime-cache/test_output/governance/upstream/provider-runtime-path.json"
    ui_audit_path = tmp_path / ".runtime-cache/test_output/governance/upstream/ui-audit-playwright.json"

    _write_json(
        provider_path,
        {
            "integration_slice": "provider-runtime-path",
            "verification_mode": "smoke",
            "status": "passed",
            "last_verified_at": "2026-03-26T12:00:00+00:00",
            "last_verified_run_id": "run-provider",
            "verification_batch_id": "batch-1",
            "last_verified_artifact": ".runtime-cache/test_output/governance/upstream/provider-runtime-path.log",
            "command": "provider",
            "exit_code": 0,
            "rollback_path": "n/a",
            "failure_attribution_hint": "n/a",
        },
    )
    _write_json(
        ui_audit_path,
        {
            "integration_slice": "ui-audit-playwright",
            "verification_mode": "smoke",
            "status": "failed",
            "last_verified_at": "2026-03-26T12:01:00+00:00",
            "last_verified_run_id": "run-ui",
            "verification_batch_id": "batch-1",
            "last_verified_artifact": ".runtime-cache/test_output/governance/upstream/ui-audit-playwright.log",
            "command": "ui-audit",
            "exit_code": 130,
            "rollback_path": "n/a",
            "failure_attribution_hint": "n/a",
        },
    )

    check = {
        "id": "verification_smoke",
        "weight": 8,
        "artifacts": [
            ".runtime-cache/test_output/governance/upstream/provider-runtime-path.json",
            ".runtime-cache/test_output/governance/upstream/ui-audit-playwright.json",
            ".runtime-cache/test_output/governance/upstream/ci-core-image.json",
        ],
    }

    result = module._reuse_upstream_verification_records(check)

    assert result is not None
    assert result["ok"] is False
    assert result["command"] == ["reuse:fresh-upstream-records"]
    assert any(not row["exists"] for row in result["artifacts"])
    assert "missing slices: .runtime-cache/test_output/governance/upstream/ci-core-image.json" in result["output"]
    assert "failing slices: ui-audit-playwright: failed" in result["output"]


def test_truncate_output_caps_large_check_logs() -> None:
    module = _load_module()
    module.CHECK_OUTPUT_MAX_CHARS = 16

    truncated = module._truncate_output("0123456789abcdefghijklmnop")

    assert truncated.startswith("0123456789abcdef")
    assert "[truncated " in truncated
