import os
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

from cortexpilot_orch.config import load_config
from cortexpilot_orch.runtime.retention import apply_retention_plan, build_retention_plan, write_retention_report


def _touch(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.suffix:
        path.write_text("x", encoding="utf-8")
    else:
        path.mkdir(parents=True, exist_ok=True)


def _age(path: Path, *, days: int = 0, hours: int = 0) -> None:
    ts = (datetime.now(timezone.utc) - timedelta(days=days, hours=hours)).timestamp()
    os.utime(path, (ts, ts))


def test_retention_dry_plan_and_apply(tmp_path: Path, monkeypatch) -> None:
    runtime_root = tmp_path / "runtime"
    runs_root = runtime_root / "runs"
    worktree_root = runtime_root / "worktrees"
    logs_root = tmp_path / "logs"
    cache_root = tmp_path / "cache"

    monkeypatch.setenv("CORTEXPILOT_RUNTIME_ROOT", str(runtime_root))
    monkeypatch.setenv("CORTEXPILOT_RUNS_ROOT", str(runs_root))
    monkeypatch.setenv("CORTEXPILOT_WORKTREE_ROOT", str(worktree_root))
    monkeypatch.setenv("CORTEXPILOT_LOGS_ROOT", str(logs_root))
    monkeypatch.setenv("CORTEXPILOT_CACHE_ROOT", str(cache_root))
    monkeypatch.setenv("CORTEXPILOT_RETENTION_RUN_DAYS", "1")
    monkeypatch.setenv("CORTEXPILOT_RETENTION_MAX_RUNS", "1")
    monkeypatch.setenv("CORTEXPILOT_RETENTION_LOG_DAYS", "1")
    monkeypatch.setenv("CORTEXPILOT_RETENTION_WORKTREE_DAYS", "1")
    monkeypatch.setenv("CORTEXPILOT_RETENTION_LOG_MAX_FILES", "1")
    monkeypatch.setenv("CORTEXPILOT_RETENTION_CACHE_HOURS", "1")

    run_old = runs_root / "run_old"
    run_new = runs_root / "run_new"
    _touch(run_old)
    _touch(run_new)

    worktree_old = worktree_root / "run_old"
    _touch(worktree_old)

    log_old = logs_root / "runtime" / "old.log"
    log_new = logs_root / "runtime" / "new.log"
    _touch(log_old)
    _touch(log_new)

    cache_old = cache_root / "runtime" / "stale.bin"
    cache_non_contract_old = cache_root / "stale-runs" / "stale.bin"
    _touch(cache_old)
    _touch(cache_non_contract_old)

    _age(run_old, days=2)
    _age(worktree_old, days=2)
    _age(log_old, days=2)
    _age(cache_old, hours=2)
    _age(cache_non_contract_old, hours=2)

    cfg = load_config()
    plan = build_retention_plan(cfg)
    assert plan.total_candidates >= 1
    report_path = write_retention_report(cfg, plan, applied=False, apply_result=None)
    payload = json.loads(report_path.read_text(encoding="utf-8"))
    assert payload["cleanup_scope"]["included_roots"]["cache"] == str(cache_root)
    assert payload["cleanup_scope"]["protected_live_roots"]["active_contract"] == str(runtime_root / "active")
    assert payload["cache_namespace_summary"]["candidate_bucket_counts"]["runtime"] >= 1
    assert payload["cache_namespace_summary"]["candidate_bucket_counts"]["stale-runs"] >= 1
    assert "stale-runs" in payload["cache_namespace_summary"]["non_contract_buckets"]
    assert set(payload["log_lane_summary"]) == {"runtime", "error", "access", "e2e", "ci", "governance"}
    assert payload["log_lane_summary"]["runtime"]["file_count"] >= 1
    assert payload["space_bridge"]["exists"] is False

    result = apply_retention_plan(cfg, plan)
    assert result["removed_total"] >= 1
    assert (
        not run_old.exists()
        or not worktree_old.exists()
        or not log_old.exists()
        or not cache_old.exists()
        or not cache_non_contract_old.exists()
    )
    assert "cache" in result["removed"]
