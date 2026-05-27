from __future__ import annotations

import importlib.util
from pathlib import Path


def _load_module() -> object:
    script_path = Path(__file__).resolve().parents[3] / "scripts" / "check_dependency_review_gate.py"
    spec = importlib.util.spec_from_file_location("openvibecoding_dependency_review_gate", script_path)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)
    return module


def test_load_policy_parses_flat_yaml_scalars(tmp_path: Path) -> None:
    module = _load_module()
    config_path = tmp_path / "dependency-review-config.yml"
    config_path.write_text(
        "fail-on-severity: high\nlicense-check: true\nwarn-only: false\n",
        encoding="utf-8",
    )

    payload = module.load_policy(config_path)

    assert payload == {
        "fail-on-severity": "high",
        "license-check": True,
        "warn-only": False,
    }


def test_extract_changes_accepts_plain_list_payload() -> None:
    module = _load_module()
    payload = [{"name": "lodash", "change_type": "added"}]

    changes = module.extract_changes(payload)

    assert changes == payload


def test_evaluate_changes_flags_high_and_skips_removed_dependencies() -> None:
    module = _load_module()
    changes = [
        {
            "ecosystem": "npm",
            "name": "lodash",
            "version": "4.17.21",
            "change_type": "added",
            "vulnerabilities": [
                {"ghsa_id": "GHSA-1234", "severity": "high"},
                {"ghsa_id": "GHSA-low", "severity": "low"},
            ],
        },
        {
            "ecosystem": "pip",
            "name": "legacy-lib",
            "version": "1.0.0",
            "change_type": "removed",
            "vulnerabilities": [
                {"ghsa_id": "GHSA-removed", "severity": "critical"},
            ],
        },
    ]

    violations = module.evaluate_changes(changes, fail_on_severity="high")

    assert violations == ["npm/lodash@4.17.21 introduced high vulnerability GHSA-1234"]

