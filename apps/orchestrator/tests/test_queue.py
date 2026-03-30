import hashlib
import json
from pathlib import Path
from datetime import datetime, timedelta, timezone

import pytest

from cortexpilot_orch.contract.validator import ContractValidator
from cortexpilot_orch.queue import QueueStore


def _output_schema_artifacts(role: str = "worker") -> list[dict]:
    schema_root = Path(__file__).resolve().parents[3] / "schemas"
    schema_name = "agent_task_result.v1.json"
    if role.lower() in {"reviewer"}:
        schema_name = "review_report.v1.json"
    if role.lower() in {"test", "test_runner"}:
        schema_name = "test_report.v1.json"
    schema_path = schema_root / schema_name
    sha = hashlib.sha256(schema_path.read_bytes()).hexdigest()
    return [
        {
            "name": f"output_schema.{role.lower()}",
            "uri": f"schemas/{schema_name}",
            "sha256": sha,
        }
    ]


def _valid_contract() -> dict:
    return {
        "task_id": "task_queue_01",
        "owner_agent": {"role": "WORKER", "agent_id": "agent-1", "codex_thread_id": ""},
        "assigned_agent": {"role": "WORKER", "agent_id": "agent-1", "codex_thread_id": ""},
        "inputs": {"spec": "queue test", "artifacts": _output_schema_artifacts("worker")},
        "required_outputs": [{"name": "out.txt", "type": "file", "acceptance": "ok"}],
        "allowed_paths": ["out.txt"],
        "forbidden_actions": ["rm -rf"],
        "acceptance_tests": [{"name": "noop", "cmd": "echo hello", "must_pass": True}],
        "tool_permissions": {
            "filesystem": "read-only",
            "shell": "on-request",
            "network": "deny",
            "mcp_tools": ["codex"],
        },
        "mcp_tool_set": ["01-filesystem"],
        "timeout_retry": {"timeout_sec": 1, "max_retries": 0, "retry_backoff_sec": 0},
        "rollback": {"strategy": "git_reset_hard", "baseline_ref": "HEAD"},
        "evidence_links": [],
        "log_refs": {"run_id": "", "paths": {}},
    }


def test_queue_enqueue_and_claim(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    runtime_root = tmp_path / "runtime"
    monkeypatch.setenv("CORTEXPILOT_RUNTIME_ROOT", str(runtime_root))

    contract = _valid_contract()
    contract_path = tmp_path / "contract.json"
    contract_path.write_text(json.dumps(contract), encoding="utf-8")

    validator = ContractValidator()
    validator.validate_contract_file(contract_path)

    store = QueueStore()
    store.enqueue(contract_path, contract["task_id"], owner="agent-1")

    pending = store.next_pending()
    assert pending is not None
    assert pending.get("task_id") == contract["task_id"]

    store.mark_claimed(contract["task_id"], run_id="run-1")
    assert store.next_pending() is None

    store.mark_done(contract["task_id"], run_id="run-1", status="SUCCESS")
    items = store.list_items()
    assert items[-1].get("status") == "SUCCESS"


def test_queue_store_respects_priority_and_schedule(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    runtime_root = tmp_path / "runtime"
    monkeypatch.setenv("CORTEXPILOT_RUNTIME_ROOT", str(runtime_root))

    store = QueueStore()
    contract_path = tmp_path / "contract.json"
    contract_path.write_text(json.dumps(_valid_contract()), encoding="utf-8")
    future_ts = (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat()
    breached_ts = (datetime.now(timezone.utc) - timedelta(minutes=5)).isoformat()

    store.enqueue(contract_path, "task-low", owner="agent-1", metadata={"priority": 1})
    store.enqueue(contract_path, "task-high", owner="agent-1", metadata={"priority": 9})
    store.enqueue(contract_path, "task-future", owner="agent-1", metadata={"priority": 20, "scheduled_at": future_ts})
    store.enqueue(contract_path, "task-breached", owner="agent-1", metadata={"priority": 3, "deadline_at": breached_ts})

    next_item = store.next_pending()
    assert next_item is not None
    assert next_item["task_id"] == "task-high"

    items = {item["task_id"]: item for item in store.list_items()}
    assert items["task-future"]["eligible"] is False
    assert items["task-future"]["sla_state"] == "scheduled"
    assert items["task-breached"]["sla_state"] == "breached"
