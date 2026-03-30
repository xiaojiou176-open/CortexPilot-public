#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Any

ROOT_DIR = Path(__file__).resolve().parents[1]
ORCH_SRC = ROOT_DIR / "apps" / "orchestrator" / "src"
if str(ORCH_SRC) not in sys.path:
    sys.path.insert(0, str(ORCH_SRC))

from cortexpilot_orch.contract.validator import ContractValidator


def _queue_path() -> Path:
    runtime_root = Path(os.getenv("CORTEXPILOT_RUNTIME_ROOT", ".runtime-cache/cortexpilot"))
    return runtime_root / "queue.jsonl"


def _load_latest_items(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    state: dict[str, dict[str, Any]] = {}
    order: list[str] = []
    for raw in path.read_text(encoding="utf-8").splitlines():
        text = raw.strip()
        if not text:
            continue
        try:
            payload = json.loads(text)
        except json.JSONDecodeError:
            continue
        task_id = str(payload.get("task_id") or "").strip()
        if not task_id:
          continue
        if task_id not in state:
            order.append(task_id)
            state[task_id] = {}
        state[task_id].update(payload)
    return [state[task_id] for task_id in order if task_id in state]


def main() -> int:
    path = _queue_path()
    items = _load_latest_items(path)
    validator = ContractValidator()
    violations: list[str] = []

    for index, item in enumerate(items):
        if not isinstance(item, dict):
            violations.append(f"queue item #{index} is not an object")
            continue
        required = {"priority", "eligible", "queue_state", "sla_state"}
        missing = sorted(key for key in required if key not in item)
        if missing:
            violations.append(f"queue item {item.get('task_id', index)} missing fields: {', '.join(missing)}")
            continue
        try:
            validator.validate_report(item, "queue_item.v1.json")
        except Exception as exc:  # noqa: BLE001
            violations.append(f"queue item {item.get('task_id', index)} schema invalid: {exc}")
        scheduled_at = item.get("scheduled_at")
        if scheduled_at:
            try:
                validator.validate_report(
                    {
                        "task_id": item.get("task_id"),
                        "workflow_id": item.get("workflow_id", ""),
                        "source_run_id": item.get("source_run_id", ""),
                        "scheduled_at": scheduled_at,
                        "deadline_at": item.get("deadline_at", ""),
                        "priority": item.get("priority", 0),
                    },
                    "scheduled_run.v1.json",
                )
            except Exception as exc:  # noqa: BLE001
                violations.append(f"scheduled run {item.get('task_id', index)} invalid: {exc}")

    if violations:
        print("schedule-boundary failed")
        for violation in violations:
            print(f"- {violation}")
        return 1

    print("schedule-boundary ok")
    print(f"items={len(items)} path={path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
