from __future__ import annotations

from datetime import datetime, timezone
import json
import logging
from pathlib import Path
from typing import Any, Callable


_logger = logging.getLogger(__name__)


def load_locks(
    *,
    runtime_root: Path,
    load_contract_fn: Callable[[str], dict],
) -> list[dict]:
    locks_dir = runtime_root / "locks"
    if not locks_dir.exists():
        return []
    entries = []
    for lock_path in sorted(locks_dir.glob("*.lock")):
        raw = lock_path.read_text(encoding="utf-8").splitlines()
        record = {"lock_id": lock_path.stem, "run_id": "", "path": "", "ts": ""}
        for line in raw:
            if line.startswith("run_id="):
                record["run_id"] = line.replace("run_id=", "", 1).strip()
            elif line.startswith("path="):
                record["path"] = line.replace("path=", "", 1).strip()
            elif line.startswith("ts="):
                record["ts"] = line.replace("ts=", "", 1).strip()
        if record["run_id"]:
            contract = load_contract_fn(record["run_id"])
            assigned = contract.get("assigned_agent", {}) if isinstance(contract.get("assigned_agent"), dict) else {}
            record["agent_id"] = assigned.get("agent_id", "")
            record["role"] = assigned.get("role", "")
        entries.append(record)
    return entries


def load_worktrees(
    *,
    list_worktrees_lines_fn: Callable[[], list[str]],
    worktree_root: Path,
) -> list[dict]:
    try:
        lines = list_worktrees_lines_fn()
    except Exception as exc:  # noqa: BLE001
        return [{"error": str(exc)}]
    entries: list[dict] = []
    current: dict | None = None
    for line in lines:
        if line.startswith("worktree "):
            if current:
                entries.append(current)
            current = {"path": line.replace("worktree ", "", 1).strip()}
            continue
        if current is None:
            continue
        if line.startswith("HEAD "):
            current["head"] = line.replace("HEAD ", "", 1).strip()
        elif line.startswith("branch "):
            current["branch"] = line.replace("branch ", "", 1).strip()
        elif line.startswith("locked"):
            current["locked"] = True
    if current:
        entries.append(current)
    for entry in entries:
        path = Path(entry.get("path", ""))
        try:
            rel = path.resolve().relative_to(worktree_root)
            entry["run_id"] = rel.parts[0] if rel.parts else ""
            if len(rel.parts) > 1:
                entry["task_id"] = rel.parts[1]
        except Exception as exc:  # noqa: BLE001
            _logger.debug("main_state_store_helpers: worktree path resolution failed: %s", exc)
            entry["run_id"] = entry.get("run_id", "")
    return entries


def select_baseline_by_window(
    *,
    run_id: str,
    window: dict,
    runs_root: Path,
    parse_iso_ts_fn: Callable[[str], datetime],
) -> str | None:
    start_raw = window.get("created_at") or window.get("start_ts")
    end_raw = window.get("finished_at") or window.get("end_ts")
    start_ts = parse_iso_ts_fn(start_raw) if start_raw else None
    end_ts = parse_iso_ts_fn(end_raw) if end_raw else None

    candidates: list[tuple[datetime, str]] = []
    for run_dir in runs_root.glob("*"):
        manifest_path = run_dir / "manifest.json"
        if not manifest_path.exists():
            continue
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        candidate_id = manifest.get("run_id") or run_dir.name
        if candidate_id == run_id:
            continue
        ts_raw = manifest.get("created_at") or manifest.get("start_ts")
        if ts_raw:
            try:
                ts = parse_iso_ts_fn(ts_raw)
            except Exception as exc:  # noqa: BLE001
                _logger.debug("main_state_store_helpers: parse_iso_ts_fn failed for %s: %s", ts_raw, exc)
                ts = datetime.fromtimestamp(manifest_path.stat().st_mtime, tz=timezone.utc)
        else:
            ts = datetime.fromtimestamp(manifest_path.stat().st_mtime, tz=timezone.utc)
        if start_ts and ts < start_ts:
            continue
        if end_ts and ts > end_ts:
            continue
        candidates.append((ts, candidate_id))

    if not candidates:
        return None
    candidates.sort(key=lambda item: item[0], reverse=True)
    return candidates[0][1]


def read_events(*, run_id: str, runs_root: Path) -> list[dict]:
    events_path = runs_root / run_id / "events.jsonl"
    if not events_path.exists():
        return []
    items = []
    for line in events_path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        try:
            items.append(json.loads(line))
        except json.JSONDecodeError:
            items.append({"raw": line})
    return items


def read_events_incremental(
    *,
    run_id: str,
    runs_root: Path,
    offset: int = 0,
    since: str | None = None,
    limit: int | None = None,
    tail: bool = False,
    filter_events_fn: Callable[..., list[dict[str, Any]]] | None = None,
) -> tuple[list[dict], int]:
    events_path = runs_root / run_id / "events.jsonl"
    if not events_path.exists():
        return [], 0

    next_offset = 0
    items: list[dict] = []
    with events_path.open("r", encoding="utf-8") as handle:
        file_size = events_path.stat().st_size
        safe_offset = 0 if offset is None else max(0, int(offset))
        if safe_offset > file_size:
            safe_offset = 0
        handle.seek(safe_offset)
        for raw_line in handle:
            line = raw_line.rstrip("\n")
            if not line.strip():
                continue
            try:
                items.append(json.loads(line))
            except json.JSONDecodeError:
                items.append({"raw": line})
        next_offset = handle.tell()

    if callable(filter_events_fn):
        return filter_events_fn(items, since=since, limit=limit, tail=tail), next_offset

    return items, next_offset


def collect_workflows(*, runs_root: Path) -> dict[str, dict]:
    workflows: dict[str, dict] = {}
    for run_dir in sorted(runs_root.glob("*")):
        manifest_path = run_dir / "manifest.json"
        if not manifest_path.exists():
            continue
        try:
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            continue
        workflow = manifest.get("workflow") if isinstance(manifest.get("workflow"), dict) else None
        if not workflow:
            continue
        workflow_id = str(workflow.get("workflow_id", "")).strip()
        if not workflow_id:
            continue
        entry = workflows.setdefault(
            workflow_id,
            {
                "workflow_id": workflow_id,
                "task_queue": workflow.get("task_queue", ""),
                "namespace": workflow.get("namespace", ""),
                "status": workflow.get("status", ""),
                "runs": [],
                "_latest_ts": datetime.min.replace(tzinfo=timezone.utc),
            },
        )
        created_raw = manifest.get("created_at") or manifest.get("start_ts")
        try:
            created_at = (
                datetime.fromisoformat(str(created_raw).replace("Z", "+00:00"))
                if created_raw
                else datetime.fromtimestamp(manifest_path.stat().st_mtime, tz=timezone.utc)
            )
        except Exception:  # noqa: BLE001
            created_at = datetime.fromtimestamp(manifest_path.stat().st_mtime, tz=timezone.utc)
        entry["runs"].append(
            {
                "run_id": manifest.get("run_id"),
                "task_id": manifest.get("task_id"),
                "status": manifest.get("status"),
                "created_at": manifest.get("created_at") or manifest.get("start_ts"),
            }
        )
        status = workflow.get("status")
        if isinstance(status, str) and status.strip() and created_at >= entry["_latest_ts"]:
            entry["status"] = status
            entry["task_queue"] = workflow.get("task_queue", entry["task_queue"])
            entry["namespace"] = workflow.get("namespace", entry["namespace"])
            entry["_latest_ts"] = created_at
    for entry in workflows.values():
        entry.pop("_latest_ts", None)
    return workflows
