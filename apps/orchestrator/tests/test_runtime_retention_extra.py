import os
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

import cortexpilot_orch.config as config_module
from cortexpilot_orch.config import load_config
from cortexpilot_orch.runtime.retention import (
    RetentionPlan,
    _overflow_log_candidates,
    _safe_remove_path,
    build_retention_plan,
    write_retention_report,
)


def _touch_file(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("x", encoding="utf-8")


def _set_age(path: Path, *, days: int = 0, hours: int = 0) -> None:
    ts = (datetime.now(timezone.utc) - timedelta(days=days, hours=hours)).timestamp()
    os.utime(path, (ts, ts))


def test_retention_helpers_overflow_and_safe_remove(tmp_path: Path) -> None:
    logs_root = tmp_path / "logs"
    runtime_dir = logs_root / "runtime"
    e2e_dir = logs_root / "e2e"
    newest_runtime = runtime_dir / "new.log"
    oldest_runtime = runtime_dir / "old.log"
    newest_e2e = e2e_dir / "new.log"
    oldest_e2e = e2e_dir / "old.log"

    for path in [newest_runtime, oldest_runtime, newest_e2e, oldest_e2e]:
        _touch_file(path)

    _set_age(oldest_runtime, days=2)
    _set_age(oldest_e2e, days=2)

    assert _overflow_log_candidates(logs_root, 0) == []

    overflow = _overflow_log_candidates(logs_root, 1)
    assert sorted(str(item.relative_to(logs_root)) for item in overflow) == sorted(
        [
            "runtime/old.log",
            "e2e/old.log",
        ]
    )

    inside_root = tmp_path / "inside"
    outside_file = tmp_path / "outside" / "file.log"
    _touch_file(outside_file)
    assert _safe_remove_path(outside_file, inside_root) is False

    nested_dir = inside_root / "a" / "b"
    _touch_file(nested_dir / "leaf.txt")
    assert _safe_remove_path(inside_root / "a", inside_root) is True
    assert not (inside_root / "a").exists()

    missing = inside_root / "missing.log"
    assert _safe_remove_path(missing, inside_root) is False


def test_build_retention_plan_and_write_report_for_empty_roots(tmp_path: Path, monkeypatch) -> None:
    runtime_root = tmp_path / "runtime"
    monkeypatch.setenv("CORTEXPILOT_RUNTIME_ROOT", str(runtime_root))
    monkeypatch.setenv("CORTEXPILOT_RUNS_ROOT", str(runtime_root / "runs"))
    monkeypatch.setenv("CORTEXPILOT_WORKTREE_ROOT", str(runtime_root / "worktrees"))
    monkeypatch.setenv("CORTEXPILOT_LOGS_ROOT", str(runtime_root / "logs"))
    monkeypatch.setenv("CORTEXPILOT_CACHE_ROOT", str(runtime_root / "cache"))

    cfg = load_config()
    plan = build_retention_plan(cfg)
    assert plan == RetentionPlan([], [], [], [], [], [], [])

    report_path = write_retention_report(cfg, plan, applied=False, apply_result=None)
    payload = report_path.read_text(encoding="utf-8")
    assert '"applied": false' in payload.lower()
    assert '"total": 0' in payload
    assert '"removed_total": 0' in payload
    assert '"protected_live_roots"' in payload


def test_config_fails_when_explicit_env_file_missing(monkeypatch) -> None:
    config_module._ENV_LOADED = False
    monkeypatch.setenv("CORTEXPILOT_ENV_FILE", "/tmp/cortexpilot-env-file-should-not-exist.env")
    with pytest.raises(RuntimeError, match="CORTEXPILOT_ENV_FILE not found"):
        load_config()


def test_config_ignores_legacy_base_url_alias_and_keeps_canonical(monkeypatch) -> None:
    config_module._ENV_LOADED = False
    monkeypatch.delenv("CORTEXPILOT_ENV_FILE", raising=False)
    monkeypatch.setenv("CORTEXPILOT_PROVIDER_BASE_URL", "https://api.primary.local/v1")
    monkeypatch.setenv("OPENAI_BASE_URL", "https://api.shadow.local/v1")
    cfg = load_config()
    assert cfg.runner.agents_base_url == "https://api.primary.local/v1"
