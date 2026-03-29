from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from cortexpilot_orch.config import CortexPilotConfig

CANONICAL_CACHE_NAMESPACES = ("runtime", "test", "build")
RETENTION_REPORT_SCHEMA_VERSION = 5
RETENTION_SCOPE_LABELS = ("runs", "worktrees", "logs", "cache", "codex_homes", "intakes", "contracts")


@dataclass(frozen=True)
class RetentionPlan:
    run_candidates: list[Path]
    worktree_candidates: list[Path]
    log_candidates: list[Path]
    cache_candidates: list[Path]
    codex_home_candidates: list[Path]
    intake_candidates: list[Path]
    contract_candidates: list[Path]

    @property
    def total_candidates(self) -> int:
        return (
            len(self.run_candidates)
            + len(self.worktree_candidates)
            + len(self.log_candidates)
            + len(self.cache_candidates)
            + len(self.codex_home_candidates)
            + len(self.intake_candidates)
            + len(self.contract_candidates)
        )


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _cutoff(days: int) -> datetime:
    return _utc_now() - timedelta(days=days)


def _cutoff_hours(hours: int) -> datetime:
    return _utc_now() - timedelta(hours=hours)


def _mtime_utc(path: Path) -> datetime:
    return datetime.fromtimestamp(path.stat().st_mtime, tz=timezone.utc)


def _safe_collect_dirs(root: Path) -> list[Path]:
    if not root.exists():
        return []
    return sorted([item for item in root.iterdir() if item.is_dir()])


def _safe_collect_files(root: Path) -> list[Path]:
    if not root.exists():
        return []
    return sorted([item for item in root.rglob("*") if item.is_file()])


def _cache_namespace(path: Path, cache_root: Path) -> str:
    try:
        relative = path.resolve().relative_to(cache_root.resolve())
    except ValueError:
        return "__out_of_scope__"
    return relative.parts[0] if relative.parts else "__root__"


def _cache_namespace_summary(cache_candidates: list[Path], cache_root: Path) -> dict[str, Any]:
    bucket_counts: dict[str, int] = {}
    for path in cache_candidates:
        bucket = _cache_namespace(path, cache_root)
        bucket_counts[bucket] = bucket_counts.get(bucket, 0) + 1
    non_contract_buckets = sorted(
        bucket
        for bucket in bucket_counts
        if bucket not in CANONICAL_CACHE_NAMESPACES
    )
    return {
        "canonical_namespaces": list(CANONICAL_CACHE_NAMESPACES),
        "candidate_bucket_counts": dict(sorted(bucket_counts.items())),
        "non_contract_buckets": non_contract_buckets,
    }


def _test_output_root(cfg: CortexPilotConfig) -> Path:
    return cfg.runtime_root.parent / "test_output"


def _test_output_visibility_summary(test_output_root: Path) -> dict[str, Any]:
    if not test_output_root.exists():
        return {
            "path": str(test_output_root),
            "exists": False,
            "total_files": 0,
            "total_size_bytes": 0,
            "root_level_files": [],
            "bucket_file_counts": {},
        }

    total_files = 0
    total_size_bytes = 0
    bucket_file_counts: dict[str, int] = {}
    root_level_files: list[str] = []
    for path in sorted(test_output_root.rglob("*")):
        if not path.is_file():
            continue
        total_files += 1
        total_size_bytes += path.stat().st_size
        relative = path.relative_to(test_output_root)
        if len(relative.parts) == 1:
            root_level_files.append(str(relative))
            bucket = "__root__"
        else:
            bucket = relative.parts[0]
        bucket_file_counts[bucket] = bucket_file_counts.get(bucket, 0) + 1

    return {
        "path": str(test_output_root),
        "exists": True,
        "total_files": total_files,
        "total_size_bytes": total_size_bytes,
        "root_level_files": root_level_files,
        "bucket_file_counts": dict(sorted(bucket_file_counts.items())),
    }


def _cleanup_scope(cfg: CortexPilotConfig) -> dict[str, Any]:
    return {
        "labels": list(RETENTION_SCOPE_LABELS),
        "included_roots": {
            "runs": str(cfg.runs_root),
            "worktrees": str(cfg.worktree_root),
            "logs": str(cfg.logs_root),
            "cache": str(cfg.cache_root),
            "codex_homes": str(cfg.runtime_root / "codex-homes"),
            "intakes": str(cfg.runtime_root / "intakes"),
            "contracts": str(cfg.runtime_contract_root),
        },
        "observed_roots": {
            "test_output": str(_test_output_root(cfg)),
        },
        "protected_live_roots": {
            "active_contract": str(cfg.runtime_root / "active"),
        },
        "excluded_examples": [
            str(cfg.runtime_root / "backups"),
            str(cfg.runtime_root / "temp"),
            str(cfg.runtime_root / "locks"),
        ],
    }


def _log_lane_summary(cfg: CortexPilotConfig) -> dict[str, Any]:
    summary: dict[str, Any] = {}
    for lane in ("runtime", "error", "access", "e2e", "ci", "governance"):
        lane_root = cfg.logs_root / lane
        files = _safe_collect_files(lane_root)
        total_size_bytes = sum(path.stat().st_size for path in files)
        newest_mtime = max((_mtime_utc(path) for path in files), default=None)
        oldest_mtime = min((_mtime_utc(path) for path in files), default=None)
        max_file_size_bytes = max((path.stat().st_size for path in files), default=0)
        summary[lane] = {
            "path": str(lane_root),
            "file_count": len(files),
            "total_size_bytes": total_size_bytes,
            "newest_mtime": newest_mtime.isoformat() if newest_mtime else None,
            "oldest_mtime": oldest_mtime.isoformat() if oldest_mtime else None,
            "rotation_headroom_bytes_estimate": max(int(cfg.logging.max_bytes) - max_file_size_bytes, 0),
            "max_file_size_bytes": max_file_size_bytes,
        }
    return summary


def _space_bridge(cfg: CortexPilotConfig) -> dict[str, Any]:
    report_path = cfg.runtime_root / "reports" / "space_governance" / "report.json"
    if not report_path.exists():
        return {
            "path": str(report_path),
            "exists": False,
            "latest_space_audit_generated_at": None,
            "repo_internal_total_bytes": 0,
            "repo_external_related_total_bytes": 0,
            "shared_observation_total_bytes": 0,
        }
    try:
        payload = json.loads(report_path.read_text(encoding="utf-8"))
    except Exception:
        return {
            "path": str(report_path),
            "exists": True,
            "latest_space_audit_generated_at": None,
            "repo_internal_total_bytes": 0,
            "repo_external_related_total_bytes": 0,
            "shared_observation_total_bytes": 0,
        }
    summary = payload.get("summary", {})
    return {
        "path": str(report_path),
        "exists": True,
        "latest_space_audit_generated_at": payload.get("generated_at"),
        "repo_internal_total_bytes": int(summary.get("repo_internal_total_bytes", 0)),
        "repo_external_related_total_bytes": int(summary.get("repo_external_related_total_bytes", 0)),
        "shared_observation_total_bytes": int(summary.get("shared_observation_total_bytes", 0)),
    }


def _overflow_log_candidates(logs_root: Path, max_files: int) -> list[Path]:
    if max_files <= 0:
        return []
    by_group: dict[Path, list[Path]] = {}
    for path in _safe_collect_files(logs_root):
        group = path.parent
        by_group.setdefault(group, []).append(path)

    overflow: list[Path] = []
    for files in by_group.values():
        if len(files) <= max_files:
            continue
        sorted_files = sorted(files, key=_mtime_utc, reverse=True)
        overflow.extend(sorted_files[max_files:])
    return overflow


def _collect_contract_artifacts(contract_root: Path) -> list[Path]:
    buckets = ("results", "reviews", "tasks")
    items: list[Path] = []
    for bucket in buckets:
        base = contract_root / bucket
        if not base.exists():
            continue
        for child in sorted(base.iterdir()):
            if child.is_dir() and child.name.startswith("run_"):
                items.append(child)
            elif child.is_file() and child.name.startswith("task-") and child.suffix == ".json":
                items.append(child)
    return items


def build_retention_plan(cfg: CortexPilotConfig) -> RetentionPlan:
    runs = _safe_collect_dirs(cfg.runs_root)
    worktrees = _safe_collect_dirs(cfg.worktree_root)
    logs = _safe_collect_files(cfg.logs_root)
    caches = _safe_collect_files(cfg.cache_root)
    codex_homes = _safe_collect_dirs(cfg.runtime_root / "codex-homes")
    intakes = _safe_collect_dirs(cfg.runtime_root / "intakes")
    contract_artifacts = _collect_contract_artifacts(cfg.runtime_contract_root)

    run_cutoff = _cutoff(cfg.retention_run_days)
    worktree_cutoff = _cutoff(cfg.retention_worktree_days)
    log_cutoff = _cutoff(cfg.retention_log_days)
    cache_cutoff = _cutoff_hours(cfg.retention_cache_hours)
    codex_home_cutoff = _cutoff(cfg.retention_codex_home_days)
    intake_cutoff = _cutoff(cfg.retention_intake_days)
    contract_cutoff = _cutoff(cfg.retention_run_days)

    expired_runs = [path for path in runs if _mtime_utc(path) < run_cutoff]
    if len(runs) > cfg.retention_max_runs:
        sorted_runs = sorted(runs, key=_mtime_utc)
        overflow = len(runs) - cfg.retention_max_runs
        expired_runs.extend(sorted_runs[:overflow])
    unique_runs = sorted(set(expired_runs))

    expired_worktrees = [path for path in worktrees if _mtime_utc(path) < worktree_cutoff]

    aged_logs = [path for path in logs if _mtime_utc(path) < log_cutoff]
    overflow_logs = _overflow_log_candidates(cfg.logs_root, cfg.retention_log_max_files)
    expired_logs = sorted(set(aged_logs + overflow_logs))

    expired_caches = [path for path in caches if _mtime_utc(path) < cache_cutoff]

    expired_codex_homes = [path for path in codex_homes if _mtime_utc(path) < codex_home_cutoff]
    if len(codex_homes) > cfg.retention_max_codex_homes:
        sorted_codex_homes = sorted(codex_homes, key=_mtime_utc)
        overflow = len(codex_homes) - cfg.retention_max_codex_homes
        expired_codex_homes.extend(sorted_codex_homes[:overflow])
    unique_codex_homes = sorted(set(expired_codex_homes))

    expired_intakes = [path for path in intakes if _mtime_utc(path) < intake_cutoff]
    if len(intakes) > cfg.retention_max_intakes:
        sorted_intakes = sorted(intakes, key=_mtime_utc)
        overflow = len(intakes) - cfg.retention_max_intakes
        expired_intakes.extend(sorted_intakes[:overflow])
    unique_intakes = sorted(set(expired_intakes))

    expired_contracts = [path for path in contract_artifacts if _mtime_utc(path) < contract_cutoff]
    if len(contract_artifacts) > cfg.retention_max_runs:
        sorted_contracts = sorted(contract_artifacts, key=_mtime_utc)
        overflow = len(contract_artifacts) - cfg.retention_max_runs
        expired_contracts.extend(sorted_contracts[:overflow])
    unique_contracts = sorted(set(expired_contracts))

    return RetentionPlan(
        run_candidates=unique_runs,
        worktree_candidates=expired_worktrees,
        log_candidates=expired_logs,
        cache_candidates=expired_caches,
        codex_home_candidates=unique_codex_homes,
        intake_candidates=unique_intakes,
        contract_candidates=unique_contracts,
    )


def _safe_remove_path(path: Path, allowed_root: Path) -> bool:
    try:
        path.resolve().relative_to(allowed_root.resolve())
    except ValueError:
        return False
    if not path.exists():
        return False
    if path.is_dir():
        for child in sorted(path.rglob("*"), reverse=True):
            if child.is_file() or child.is_symlink():
                child.unlink(missing_ok=True)
            elif child.is_dir():
                child.rmdir()
        path.rmdir()
    else:
        path.unlink(missing_ok=True)
    return True


def apply_retention_plan(cfg: CortexPilotConfig, plan: RetentionPlan) -> dict[str, Any]:
    removed: dict[str, list[str]] = {
        "runs": [],
        "worktrees": [],
        "logs": [],
        "cache": [],
        "codex_homes": [],
        "intakes": [],
        "contracts": [],
    }

    for path in plan.run_candidates:
        if _safe_remove_path(path, cfg.runs_root):
            removed["runs"].append(str(path))
    for path in plan.worktree_candidates:
        if _safe_remove_path(path, cfg.worktree_root):
            removed["worktrees"].append(str(path))
    for path in plan.log_candidates:
        if _safe_remove_path(path, cfg.logs_root):
            removed["logs"].append(str(path))
    for path in plan.cache_candidates:
        if _safe_remove_path(path, cfg.cache_root):
            removed["cache"].append(str(path))
    codex_homes_root = cfg.runtime_root / "codex-homes"
    for path in plan.codex_home_candidates:
        if _safe_remove_path(path, codex_homes_root):
            removed["codex_homes"].append(str(path))
    intakes_root = cfg.runtime_root / "intakes"
    for path in plan.intake_candidates:
        if _safe_remove_path(path, intakes_root):
            removed["intakes"].append(str(path))
    for path in plan.contract_candidates:
        if _safe_remove_path(path, cfg.runtime_contract_root):
            removed["contracts"].append(str(path))

    return {
        "applied_at": _utc_now().isoformat(),
        "removed": removed,
        "removed_total": sum(len(items) for items in removed.values()),
    }


def write_retention_report(cfg: CortexPilotConfig, plan: RetentionPlan, applied: bool, apply_result: dict[str, Any] | None) -> Path:
    reports_dir = cfg.runtime_root / "reports"
    reports_dir.mkdir(parents=True, exist_ok=True)
    report_path = reports_dir / "retention_report.json"
    payload = {
        "schema_version": RETENTION_REPORT_SCHEMA_VERSION,
        "generated_at": _utc_now().isoformat(),
        "applied": applied,
        "policy": {
            "retention_run_days": cfg.retention_run_days,
            "retention_max_runs": cfg.retention_max_runs,
            "retention_log_days": cfg.retention_log_days,
            "retention_worktree_days": cfg.retention_worktree_days,
            "retention_log_max_files": cfg.retention_log_max_files,
            "retention_cache_hours": cfg.retention_cache_hours,
            "retention_codex_home_days": cfg.retention_codex_home_days,
            "retention_max_codex_homes": cfg.retention_max_codex_homes,
            "retention_intake_days": cfg.retention_intake_days,
            "retention_max_intakes": cfg.retention_max_intakes,
        },
        "cleanup_scope": _cleanup_scope(cfg),
        "candidates": {
            "runs": [str(path) for path in plan.run_candidates],
            "worktrees": [str(path) for path in plan.worktree_candidates],
            "logs": [str(path) for path in plan.log_candidates],
            "cache": [str(path) for path in plan.cache_candidates],
            "codex_homes": [str(path) for path in plan.codex_home_candidates],
            "intakes": [str(path) for path in plan.intake_candidates],
            "contracts": [str(path) for path in plan.contract_candidates],
            "total": plan.total_candidates,
        },
        "cache_namespace_summary": _cache_namespace_summary(plan.cache_candidates, cfg.cache_root),
        "log_lane_summary": _log_lane_summary(cfg),
        "space_bridge": _space_bridge(cfg),
        "test_output_visibility": _test_output_visibility_summary(_test_output_root(cfg)),
        "result": apply_result
        or {
            "removed": {
                "runs": [],
                "worktrees": [],
                "logs": [],
                "cache": [],
                "codex_homes": [],
                "intakes": [],
                "contracts": [],
            },
            "removed_total": 0,
        },
    }
    report_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return report_path
