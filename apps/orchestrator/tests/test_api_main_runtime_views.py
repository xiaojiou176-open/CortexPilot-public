import json
from pathlib import Path

from fastapi.testclient import TestClient

from .helpers.api_main_test_io import (
    _output_schema_artifacts,
    _write_artifact,
    _write_contract,
    _write_events,
    _write_lock,
    _write_manifest,
)
from cortexpilot_orch.api import main as api_main


def test_api_workflows_list_and_detail(tmp_path: Path, monkeypatch) -> None:
    runs_root = tmp_path / "runs"
    monkeypatch.setenv("CORTEXPILOT_RUNS_ROOT", str(runs_root))

    run_a = runs_root / "run_a"
    run_b = runs_root / "run_b"
    run_c = runs_root / "run_c"
    _write_manifest(
        run_a,
        {
            "run_id": "run_a",
            "task_id": "task_a",
            "status": "RUNNING",
            "created_at": "2024-01-01T00:00:00Z",
            "workflow": {
                "workflow_id": "wf-alpha",
                "task_queue": "cortexpilot-orch",
                "namespace": "default",
                "status": "RUNNING",
            },
        },
    )
    _write_manifest(
        run_b,
        {
            "run_id": "run_b",
            "task_id": "task_b",
            "status": "SUCCESS",
            "created_at": "2024-01-02T00:00:00Z",
            "workflow": {
                "workflow_id": "wf-alpha",
                "task_queue": "cortexpilot-orch",
                "namespace": "default",
                "status": "SUCCESS",
            },
        },
    )
    _write_manifest(
        run_c,
        {
            "run_id": "run_c",
            "task_id": "task_c",
            "status": "FAILURE",
            "created_at": "2024-01-03T00:00:00Z",
            "workflow": {
                "workflow_id": "wf-beta",
                "task_queue": "cortexpilot-orch",
                "namespace": "default",
                "status": "FAILURE",
            },
        },
    )
    _write_events(run_a, [json.dumps({"event": "WORKFLOW_BOUND", "context": {"workflow_id": "wf-alpha"}})])
    _write_events(
        run_b,
        [json.dumps({"event": "WORKFLOW_STATUS", "context": {"workflow_id": "wf-alpha", "status": "SUCCESS"}})],
    )

    client = TestClient(api_main.app)

    resp = client.get("/api/workflows")
    assert resp.status_code == 200
    payload = resp.json()
    workflow_ids = [item["workflow_id"] for item in payload]
    assert "wf-alpha" in workflow_ids
    assert "wf-beta" in workflow_ids

    detail = client.get("/api/workflows/wf-alpha")
    assert detail.status_code == 200
    body = detail.json()
    assert body["workflow"]["workflow_id"] == "wf-alpha"
    assert len(body["runs"]) == 2
    assert any(item.get("_run_id") == "run_a" for item in body["events"])

    missing = client.get("/api/workflows/missing")
    assert missing.status_code == 404


def test_api_agents_policies_locks_worktrees(tmp_path: Path, monkeypatch) -> None:
    runtime_root = tmp_path / "runtime"
    runs_root = runtime_root / "runs"
    locks_dir = runtime_root / "locks"
    worktree_root = runtime_root / "worktrees"
    repo_root = tmp_path / "repo"
    policies_dir = repo_root / "policies"
    tools_dir = repo_root / "tooling"

    policies_dir.mkdir(parents=True, exist_ok=True)
    tools_dir.mkdir(parents=True, exist_ok=True)
    (policies_dir / "agent_registry.json").write_text(
        json.dumps(
            {
                "version": "v1",
                "agents": [{"agent_id": "agent-1", "role": "WORKER", "label": "worker"}],
            }
        ),
        encoding="utf-8",
    )
    (policies_dir / "command_allowlist.json").write_text(
        json.dumps({"version": "v1", "allow": [], "deny_substrings": []}),
        encoding="utf-8",
    )
    (policies_dir / "forbidden_actions.json").write_text(
        json.dumps({"version": "v1", "forbidden_actions": ["rm -rf"]}),
        encoding="utf-8",
    )
    (tools_dir / "registry.json").write_text(
        json.dumps({"installed": ["codex"], "integrated": ["codex"]}),
        encoding="utf-8",
    )

    monkeypatch.setenv("CORTEXPILOT_RUNTIME_ROOT", str(runtime_root))
    monkeypatch.setenv("CORTEXPILOT_RUNS_ROOT", str(runs_root))
    monkeypatch.setenv("CORTEXPILOT_WORKTREE_ROOT", str(worktree_root))
    monkeypatch.setenv("CORTEXPILOT_REPO_ROOT", str(repo_root))

    run_id = "run_lock"
    run_dir = runs_root / run_id
    _write_manifest(run_dir, {"run_id": run_id, "task_id": "task", "status": "SUCCESS"})
    _write_contract(run_dir, {"assigned_agent": {"agent_id": "agent-1", "role": "WORKER"}})
    _write_lock(locks_dir, "lock-1", run_id, "allowed/file.txt", "2024-01-01T00:00:00Z")

    worktree_path = worktree_root / run_id
    monkeypatch.setattr(
        api_main.worktree_manager,
        "list_worktrees",
        lambda: [
            f"worktree {worktree_path}",
            "HEAD abc123",
            "branch refs/heads/cortexpilot-run-run_lock",
            "locked",
        ],
    )

    client = TestClient(api_main.app)

    agents = client.get("/api/agents")
    assert agents.status_code == 200
    payload = agents.json()
    assert payload["agents"][0]["agent_id"] == "agent-1"
    assert payload["agents"][0]["lock_count"] == 1

    policies = client.get("/api/policies")
    assert policies.status_code == 200
    assert policies.json()["agent_registry"]["version"] == "v1"

    locks = client.get("/api/locks")
    assert locks.status_code == 200
    assert locks.json()[0]["run_id"] == run_id

    worktrees = client.get("/api/worktrees")
    assert worktrees.status_code == 200
    assert worktrees.json()[0]["run_id"] == run_id


def test_api_pm_intake_flow(tmp_path: Path, monkeypatch) -> None:
    runtime_root = tmp_path / "runtime"
    runs_root = runtime_root / "runs"
    repo_root = tmp_path / "repo"
    schema_root = repo_root / "schemas"
    schema_root.mkdir(parents=True, exist_ok=True)
    for name in [
        "pm_intake_request.v1.json",
        "pm_intake_response.v1.json",
        "plan.schema.json",
        "plan_bundle.v1.json",
    ]:
        src = Path(__file__).resolve().parents[3] / "schemas" / name
        (schema_root / name).write_text(src.read_text(encoding="utf-8"), encoding="utf-8")

    monkeypatch.setenv("CORTEXPILOT_RUNTIME_ROOT", str(runtime_root))
    monkeypatch.setenv("CORTEXPILOT_RUNS_ROOT", str(runs_root))
    monkeypatch.setenv("CORTEXPILOT_REPO_ROOT", str(repo_root))
    monkeypatch.setenv("GEMINI_API_KEY", "")  # force provider fallback path

    client = TestClient(api_main.app)
    payload = {
        "objective": "add endpoint",
        "allowed_paths": ["apps/orchestrator/src"],
        "mcp_tool_set": ["01-filesystem"],
    }
    created = client.post("/api/intake", json=payload)
    assert created.status_code == 200
    created_payload = created.json()
    assert created_payload["browser_policy_preset"] == "safe"
    assert isinstance(created_payload.get("effective_browser_policy"), dict)
    intake_id = created_payload["intake_id"]
    answered = client.post(f"/api/intake/{intake_id}/answers", json={"answers": ["none"]})
    assert answered.status_code == 200
    assert answered.json()["status"] == "READY"


def test_api_pm_intake_custom_policy_requires_privileged_role(tmp_path: Path, monkeypatch) -> None:
    runtime_root = tmp_path / "runtime"
    runs_root = runtime_root / "runs"
    repo_root = tmp_path / "repo"
    schema_root = repo_root / "schemas"
    schema_root.mkdir(parents=True, exist_ok=True)
    for name in [
        "pm_intake_request.v1.json",
        "pm_intake_response.v1.json",
        "plan.schema.json",
        "plan_bundle.v1.json",
    ]:
        src = Path(__file__).resolve().parents[3] / "schemas" / name
        (schema_root / name).write_text(src.read_text(encoding="utf-8"), encoding="utf-8")

    monkeypatch.setenv("CORTEXPILOT_RUNTIME_ROOT", str(runtime_root))
    monkeypatch.setenv("CORTEXPILOT_RUNS_ROOT", str(runs_root))
    monkeypatch.setenv("CORTEXPILOT_REPO_ROOT", str(repo_root))

    client = TestClient(api_main.app)

    denied = client.post(
        "/api/intake",
        json={
            "objective": "x",
            "allowed_paths": ["apps/orchestrator/src"],
            "mcp_tool_set": ["01-filesystem"],
            "browser_policy_preset": "custom",
            "requester_role": "PM",
            "browser_policy": {
                "profile_mode": "allow_profile",
                "stealth_mode": "plugin",
                "human_behavior": {"enabled": True, "level": "medium"},
            },
        },
    )
    assert denied.status_code == 400

    allowed = client.post(
        "/api/intake",
        json={
            "objective": "x",
            "allowed_paths": ["apps/orchestrator/src"],
            "mcp_tool_set": ["01-filesystem"],
            "browser_policy_preset": "custom",
            "requester_role": "OPS",
            "browser_policy": {
                "profile_mode": "allow_profile",
                "stealth_mode": "plugin",
                "human_behavior": {"enabled": True, "level": "medium"},
            },
        },
    )
    assert allowed.status_code == 200
    payload = allowed.json()
    assert payload["browser_policy_preset"] == "custom"
    assert payload["effective_browser_policy"]["stealth_mode"] == "plugin"


def test_api_search_promote_and_agent_status(tmp_path: Path, monkeypatch) -> None:
    runs_root = tmp_path / "runs"
    runtime_root = tmp_path / "runtime"
    monkeypatch.setenv("CORTEXPILOT_RUNS_ROOT", str(runs_root))
    monkeypatch.setenv("CORTEXPILOT_RUNTIME_ROOT", str(runtime_root))

    run_id = "run_search"
    run_dir = runs_root / run_id
    _write_manifest(run_dir, {"run_id": run_id, "task_id": "task_search", "status": "RUNNING"})
    _write_contract(
        run_dir,
        {
            "assigned_agent": {"role": "SEARCHER", "agent_id": "agent-1"},
            "allowed_paths": ["docs"],
            "inputs": {"artifacts": _output_schema_artifacts("searcher")},
        },
    )
    _write_events(
        run_dir,
        [
            json.dumps(
                {
                    "event": "HUMAN_APPROVAL_REQUIRED",
                    "context": {
                        "reason": ["network on-request requires approval"],
                        "actions": ["approve network"],
                        "verify_steps": ["click approve"],
                        "resume_step": "policy_gate",
                    },
                }
            )
        ],
    )
    (run_dir / "diff_name_only.txt").write_text("docs/README.md\n", encoding="utf-8")
    _write_artifact(
        run_dir,
        "search_results.json",
        {
            "latest": {
                "results": [
                    {
                        "provider": "chatgpt_web",
                        "results": [{"title": "Example", "href": "https://example.com"}],
                    }
                ]
            }
        },
    )
    _write_artifact(run_dir, "verification.json", {"latest": {"verification": {"ok": True}}})
    _write_artifact(run_dir, "purified_summary.json", {"latest": {"summary": {"consensus_domains": ["example.com"]}}})

    client = TestClient(api_main.app)
    search_resp = client.get(f"/api/runs/{run_id}/search")
    assert search_resp.status_code == 200
    assert search_resp.json()["raw"]["latest"]["results"][0]["provider"] == "chatgpt_web"

    promote_resp = client.post(
        f"/api/runs/{run_id}/evidence/promote",
        headers={"x-cortexpilot-role": "TECH_LEAD"},
    )
    assert promote_resp.status_code == 200
    assert promote_resp.json()["ok"] is True
    assert (run_dir / "reports" / "evidence_bundle.json").exists()

    status_resp = client.get(f"/api/agents/status?run_id={run_id}")
    assert status_resp.status_code == 200
    status_payload = status_resp.json()["agents"][0]
    assert status_payload["stage"] == "WAITING_APPROVAL"

    pending_resp = client.get("/api/god-mode/pending", headers={"x-cortexpilot-role": "TECH_LEAD"})
    assert pending_resp.status_code == 200
    pending_payload = pending_resp.json()[0]
    assert pending_payload["run_id"] == run_id
    assert pending_payload["resume_step"] == "policy_gate"
