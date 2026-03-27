import hashlib
import json
from pathlib import Path

import pytest

from cortexpilot_orch.contract.validator import ContractValidator, resolve_agent_registry_path


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
        "task_id": "task_test_01",
        "owner_agent": {"role": "WORKER", "agent_id": "agent-1", "codex_thread_id": ""},
        "assigned_agent": {"role": "WORKER", "agent_id": "agent-1", "codex_thread_id": ""},
        "inputs": {"spec": "test", "artifacts": _output_schema_artifacts("worker")},
        "required_outputs": [{"name": "out.txt", "type": "file", "acceptance": "ok"}],
        "allowed_paths": ["cortexpilot"],
        "forbidden_actions": ["rm -rf"],
        "acceptance_tests": [{"name": "noop", "cmd": "echo hello", "must_pass": True}],
        "tool_permissions": {
            "filesystem": "read-only",
            "shell": "on-request",
            "network": "deny",
            "mcp_tools": ["codex"],
        },
        "mcp_tool_set": ["01-filesystem"],
        "timeout_retry": {"timeout_sec": 1, "max_retries": 1, "retry_backoff_sec": 0},
        "rollback": {"strategy": "git_reset_hard", "baseline_ref": "HEAD"},
        "evidence_links": [],
        "log_refs": {"run_id": "", "paths": {}},
    }


def test_contract_schema_pass(tmp_path: Path):
    validator = ContractValidator()
    contract = _valid_contract()
    path = tmp_path / "contract.json"
    path.write_text(json.dumps(contract), encoding="utf-8")
    assert validator.validate_contract_file(path)["task_id"] == "task_test_01"


def test_contract_schema_missing_required_field():
    validator = ContractValidator()
    contract = _valid_contract()
    contract.pop("task_id")
    with pytest.raises(ValueError):
        validator.validate_contract(contract)


def test_contract_schema_unknown_field():
    validator = ContractValidator()
    contract = _valid_contract()
    contract["unknown_field"] = "nope"
    with pytest.raises(ValueError):
        validator.validate_contract(contract)


def test_contract_schema_runtime_provider_valid_values_pass():
    validator = ContractValidator()
    for provider in ("gemini", "openai", "anthropic", "cliproxyapi"):
        contract = _valid_contract()
        contract["runtime_options"] = {"provider": provider}
        validated = validator.validate_contract(contract)
        assert validated["runtime_options"]["provider"] == provider


def test_contract_schema_runtime_provider_invalid_value_fails():
    validator = ContractValidator()
    contract = _valid_contract()
    contract["runtime_options"] = {"provider": ""}
    with pytest.raises(ValueError):
        validator.validate_contract(contract)


def test_contract_schema_runner_claude_with_mcp_first_pass():
    validator = ContractValidator()
    contract = _valid_contract()
    contract["runtime_options"] = {"runner": "claude", "execution": {"mcp_first": True}}
    validated = validator.validate_contract(contract)
    assert validated["runtime_options"]["runner"] == "claude"
    assert validated["runtime_options"]["execution"]["mcp_first"] is True


def test_review_report_schema_pass():
    validator = ContractValidator()
    payload = {
        "run_id": "run-0001",
        "task_id": "task_test_01",
        "reviewer": {"role": "REVIEWER", "agent_id": "reviewer-1"},
        "reviewed_at": "2024-01-01T00:00:00Z",
        "verdict": "PASS",
        "summary": "ok",
        "scope_check": {"passed": True, "violations": []},
        "evidence": [],
        "produced_diff": False,
    }
    assert validator.validate_report(payload, "review_report.v1.json")["verdict"] == "PASS"


def test_test_report_schema_pass():
    validator = ContractValidator()
    payload = {
        "run_id": "run-0001",
        "task_id": "task_test_01",
        "runner": {"role": "TEST_RUNNER", "agent_id": "runner-1"},
        "started_at": "2024-01-01T00:00:00Z",
        "finished_at": "2024-01-01T00:01:00Z",
        "status": "PASS",
        "commands": [
            {
                "name": "echo",
                "cmd_argv": ["echo", "hello"],
                "must_pass": True,
                "timeout_sec": 600,
                "exit_code": 0,
                "duration_sec": 0.1,
                "stdout": {
                    "name": "stdout",
                    "path": "tests/stdout.log",
                    "sha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                },
                "stderr": {
                    "name": "stderr",
                    "path": "tests/stderr.log",
                    "sha256": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
                },
            }
        ],
        "artifacts": [],
    }
    assert validator.validate_report(payload, "test_report.v1.json")["status"] == "PASS"


def test_resolve_agent_registry_path_prefers_policies(tmp_path: Path, monkeypatch) -> None:
    repo_root = tmp_path / "repo"
    policies_dir = repo_root / "policies"
    policies_dir.mkdir(parents=True, exist_ok=True)
    preferred = policies_dir / "agent_registry.json"
    preferred.write_text("{}", encoding="utf-8")

    assert resolve_agent_registry_path(repo_root) == preferred

    override = repo_root / "custom" / "agents.json"
    override.parent.mkdir(parents=True, exist_ok=True)
    override.write_text("{}", encoding="utf-8")
    monkeypatch.setenv("CORTEXPILOT_AGENT_REGISTRY", "custom/agents.json")
    assert resolve_agent_registry_path(repo_root) == override
