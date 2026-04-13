from __future__ import annotations

import json
from pathlib import Path

from cortexpilot_orch.scheduler.completion_governance import evaluate_completion_governance


def _write_artifact(run_dir: Path, filename: str, payload: object) -> None:
    artifacts_dir = run_dir / "artifacts"
    artifacts_dir.mkdir(parents=True, exist_ok=True)
    (artifacts_dir / filename).write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def test_evaluate_completion_governance_marks_complete_when_required_checks_pass(tmp_path: Path) -> None:
    run_dir = tmp_path / "run-complete"
    _write_artifact(
        run_dir,
        "planning_worker_prompt_contracts.json",
        [
            {
                "prompt_contract_id": "worker-1",
                "done_definition": {"acceptance_checks": ["repo_hygiene", "test_report", "review_report"]},
                "continuation_policy": {
                    "on_incomplete": "reply_auditor_reprompt_and_continue_same_session",
                    "on_blocked": "spawn_independent_temporary_unblock_task",
                },
            }
        ],
    )
    task_result = {
        "status": "SUCCESS",
        "summary": "Completed the scoped worker assignment.",
        "gates": {
            "diff_gate": {"passed": True},
            "policy_gate": {"passed": True},
            "review_gate": {"passed": True},
            "tests_gate": {"passed": True},
        },
    }
    test_report = {"status": "PASS"}
    review_report = {"verdict": "PASS"}

    report, updated_unblock_tasks = evaluate_completion_governance(
        contract={"acceptance_tests": [{"cmd": ["pytest", "-q"]}]},
        run_dir=run_dir,
        task_result=task_result,
        test_report=test_report,
        review_report=review_report,
        status="SUCCESS",
        failure_reason="",
        generated_at="2026-04-12T21:00:00Z",
    )

    assert report["overall_verdict"] == "complete"
    assert report["dod_checker"]["status"] == "passed"
    assert report["reply_auditor"]["status"] == "accepted"
    assert report["continuation_decision"]["selected_action"] == "none"
    assert updated_unblock_tasks is None


def test_evaluate_completion_governance_queues_unblock_task_for_blocked_run(tmp_path: Path) -> None:
    run_dir = tmp_path / "run-blocked"
    _write_artifact(
        run_dir,
        "planning_worker_prompt_contracts.json",
        [
            {
                "prompt_contract_id": "worker-1",
                "done_definition": {"acceptance_checks": ["repo_hygiene", "test_report"]},
                "continuation_policy": {
                    "on_incomplete": "reply_auditor_reprompt_and_continue_same_session",
                    "on_blocked": "spawn_independent_temporary_unblock_task",
                },
            }
        ],
    )
    _write_artifact(
        run_dir,
        "planning_unblock_tasks.json",
        [
            {
                "version": "v1",
                "unblock_task_id": "unblock-worker-1",
                "source_prompt_contract_id": "worker-1",
                "objective": "Unblock the scoped worker assignment",
                "scope_hint": "Inspect the external blocker.",
                "assigned_agent": {"role": "WORKER", "agent_id": "agent-1"},
                "owner": "L0",
                "mode": "independent_temporary_task",
                "status": "proposed",
                "trigger": "spawn_independent_temporary_unblock_task",
                "reason": "an external blocker requires an L0-managed unblock task",
                "verification_requirements": ["repo_hygiene"],
            }
        ],
    )
    task_result = {
        "status": "FAILED",
        "summary": "Blocked on an external dependency.",
        "gates": {
            "diff_gate": {"passed": True},
            "policy_gate": {"passed": True},
            "review_gate": {"passed": True},
            "tests_gate": {"passed": False},
        },
    }
    test_report = {"status": "FAIL"}
    review_report = {"verdict": "PASS"}

    report, updated_unblock_tasks = evaluate_completion_governance(
        contract={},
        run_dir=run_dir,
        task_result=task_result,
        test_report=test_report,
        review_report=review_report,
        status="FAILURE",
        failure_reason="external blocker",
        generated_at="2026-04-12T21:00:00Z",
    )

    assert report["overall_verdict"] == "queue_unblock_task"
    assert report["reply_auditor"]["status"] == "blocked"
    assert report["continuation_decision"]["selected_action"] == "spawn_independent_temporary_unblock_task"
    assert report["continuation_decision"]["unblock_task_id"] == "unblock-worker-1"
    assert updated_unblock_tasks is not None
    assert updated_unblock_tasks[0]["status"] == "queued"
