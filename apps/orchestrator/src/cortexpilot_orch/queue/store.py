from __future__ import annotations

import json
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from contextlib import contextmanager

try:
    import fcntl
except Exception:  # noqa: BLE001
    fcntl = None


def _now_ts() -> str:
    return datetime.now(timezone.utc).isoformat()


class QueueStore:
    def __init__(self, queue_path: Path | None = None) -> None:
        runtime_root = Path(os.getenv("CORTEXPILOT_RUNTIME_ROOT", ".runtime-cache/cortexpilot"))
        self._queue_path = queue_path or (runtime_root / "queue.jsonl")
        self._queue_path.parent.mkdir(parents=True, exist_ok=True)
        self._queue_path.touch(exist_ok=True)

    def _append(self, payload: dict[str, Any]) -> dict[str, Any]:
        data = dict(payload)
        data.setdefault("ts", _now_ts())
        data.setdefault("queue_id", uuid.uuid4().hex)
        line = json.dumps(data, ensure_ascii=False)
        with self._locked_handle("a+") as handle:
            handle.seek(0, os.SEEK_END)
            handle.write(line + "\n")
            handle.flush()
            os.fsync(handle.fileno())
        return data

    @contextmanager
    def _locked_handle(self, mode: str):
        with self._queue_path.open(mode, encoding="utf-8") as handle:
            if fcntl is None:
                raise RuntimeError("QueueStore requires fcntl for fail-closed file locking")
            fcntl.flock(handle.fileno(), fcntl.LOCK_EX)
            try:
                yield handle
            finally:
                fcntl.flock(handle.fileno(), fcntl.LOCK_UN)

    def enqueue(self, contract_path: Path, task_id: str, owner: str = "") -> dict[str, Any]:
        payload = {
            "event": "QUEUE_ENQUEUE",
            "status": "PENDING",
            "task_id": task_id,
            "owner": owner,
            "contract_path": str(contract_path),
        }
        return self._append(payload)

    def mark_claimed(self, task_id: str, run_id: str) -> dict[str, Any]:
        payload = {
            "event": "QUEUE_CLAIM",
            "status": "CLAIMED",
            "task_id": task_id,
            "run_id": run_id,
        }
        return self._append(payload)

    def mark_done(self, task_id: str, run_id: str, status: str) -> dict[str, Any]:
        payload = {
            "event": "QUEUE_DONE",
            "status": status,
            "task_id": task_id,
            "run_id": run_id,
        }
        return self._append(payload)

    def _load_state_from_lines(self, lines: list[str]) -> tuple[list[str], dict[str, dict[str, Any]]]:
        order: list[str] = []
        state: dict[str, dict[str, Any]] = {}
        for line in lines:
            if not line.strip():
                continue
            try:
                payload = json.loads(line)
            except json.JSONDecodeError:
                continue
            task_id = payload.get("task_id")
            if not isinstance(task_id, str) or not task_id:
                continue
            if task_id not in state:
                order.append(task_id)
                state[task_id] = {}
            merged = dict(state[task_id])
            merged.update(payload)
            state[task_id] = merged
        return order, state

    def _load_state(self) -> tuple[list[str], dict[str, dict[str, Any]]]:
        return self._load_state_from_lines(self._queue_path.read_text(encoding="utf-8").splitlines())

    def next_pending(self) -> dict[str, Any] | None:
        order, state = self._load_state()
        for task_id in order:
            item = state.get(task_id, {})
            if item.get("status") == "PENDING":
                return item
        return None

    def claim_next(self, run_id: str = "") -> dict[str, Any] | None:
        with self._locked_handle("a+") as handle:
            handle.seek(0)
            order, state = self._load_state_from_lines(handle.read().splitlines())
            for task_id in order:
                item = state.get(task_id, {})
                if item.get("status") != "PENDING":
                    continue
                claim_payload = {
                    "event": "QUEUE_CLAIM",
                    "status": "CLAIMED",
                    "task_id": task_id,
                    "run_id": run_id,
                    "ts": _now_ts(),
                    "queue_id": uuid.uuid4().hex,
                }
                handle.seek(0, os.SEEK_END)
                handle.write(json.dumps(claim_payload, ensure_ascii=False) + "\n")
                handle.flush()
                os.fsync(handle.fileno())
                claimed = dict(item)
                claimed.update(claim_payload)
                return claimed
        return None

    def list_items(self) -> list[dict[str, Any]]:
        order, state = self._load_state()
        return [state[task_id] for task_id in order if task_id in state]
