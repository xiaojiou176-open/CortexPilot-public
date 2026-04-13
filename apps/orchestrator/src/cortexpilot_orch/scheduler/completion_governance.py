from __future__ import annotations

import json
from pathlib import Path
from typing import Any


def _load_json_artifact(run_dir: Path, filename: str) -> Any:
    path = run_dir / "artifacts" / filename
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None


def _normalize_records(payload: Any) -> list[dict[str, Any]]:
    if not isinstance(payload, list):
        return []
    normalized: list[dict[str, Any]] = []
    for item in payload:
        if isinstance(item, dict):
            normalized.append(dict(item))
    return normalized


def _coerce_gate_passed(task_result: dict[str, Any] | None, gate_name: str) -> bool:
    if not isinstance(task_result, dict):
        return False
    gates = task_result.get("gates")
    if not isinstance(gates, dict):
        return False
    gate = gates.get(gate_name)
    return bool(isinstance(gate, dict) and gate.get("passed"))


def _collect_required_checks(
    planning_contracts: list[dict[str, Any]],
    *,
    contract: dict[str, Any],
) -> list[str]:
    required_checks: list[str] = []
    for planning_contract in planning_contracts:
        done_definition = planning_contract.get("done_definition")
        if not isinstance(done_definition, dict):
            continue
        checks = done_definition.get("acceptance_checks")
        if not isinstance(checks, list):
            continue
        for item in checks:
            value = str(item).strip()
            if value and value not in required_checks:
                required_checks.append(value)
    if required_checks:
        return required_checks
    acceptance_tests = contract.get("acceptance_tests")
    if isinstance(acceptance_tests, list) and acceptance_tests:
        required_checks.extend(["test_report"])
    return required_checks or ["diff_gate", "policy_gate", "review_report", "test_report"]


def _check_required_item(
    check_name: str,
    *,
    task_result: dict[str, Any] | None,
    test_report: dict[str, Any] | None,
    review_report: dict[str, Any] | None,
    run_dir: Path,
    status: str,
) -> tuple[bool, str]:
    normalized = check_name.strip().lower()
    if normalized in {"diff_gate"}:
        return _coerce_gate_passed(task_result, "diff_gate"), check_name
    if normalized in {"policy_gate", "repo_hygiene"}:
        return _coerce_gate_passed(task_result, "policy_gate"), check_name
    if normalized in {"review_gate", "review_report"}:
        review_pass = _coerce_gate_passed(task_result, "review_gate")
        verdict_pass = isinstance(review_report, dict) and str(review_report.get("verdict") or "").upper() == "PASS"
        return review_pass and verdict_pass, check_name
    if normalized in {"tests_gate", "test_report"}:
        tests_pass = _coerce_gate_passed(task_result, "tests_gate")
        report_pass = isinstance(test_report, dict) and str(test_report.get("status") or "").upper() == "PASS"
        return tests_pass and report_pass, check_name
    if normalized == "task_result":
        return str(status).upper() == "SUCCESS", check_name
    if normalized == "evidence_report":
        return (run_dir / "reports" / "evidence_report.json").exists(), check_name
    if normalized == "prompt_artifact":
        return (run_dir / "artifacts" / "prompt_artifact.json").exists(), check_name
    return False, f"unknown:{check_name}"


def _collect_policy_action(
    planning_contracts: list[dict[str, Any]],
    field_name: str,
) -> str:
    for planning_contract in planning_contracts:
        continuation_policy = planning_contract.get("continuation_policy")
        if not isinstance(continuation_policy, dict):
            continue
        value = str(continuation_policy.get(field_name) or "").strip()
        if value:
            return value
    return ""


def _build_dod_checker(
    *,
    required_checks: list[str],
    task_result: dict[str, Any] | None,
    test_report: dict[str, Any] | None,
    review_report: dict[str, Any] | None,
    run_dir: Path,
    status: str,
) -> dict[str, Any]:
    unmet_checks: list[str] = []
    for check_name in required_checks:
        ok, label = _check_required_item(
            check_name,
            task_result=task_result,
            test_report=test_report,
            review_report=review_report,
            run_dir=run_dir,
            status=status,
        )
        if not ok:
            unmet_checks.append(label)
    if str(status).upper() != "SUCCESS" and "run_status" not in unmet_checks:
        unmet_checks.append("run_status")
    if unmet_checks:
        return {
            "status": "failed",
            "summary": "Required completion checks are still missing or failed.",
            "required_checks": required_checks,
            "unmet_checks": unmet_checks,
        }
    return {
        "status": "passed",
        "summary": "All completion checks required by the current run passed.",
        "required_checks": required_checks,
        "unmet_checks": [],
    }


def _build_reply_auditor(
    *,
    status: str,
    failure_reason: str,
    dod_checker: dict[str, Any],
    unblock_tasks: list[dict[str, Any]],
) -> dict[str, Any]:
    signals: list[str] = []
    if str(status).upper() != "SUCCESS":
        signals.append("run_status_not_success")
    if failure_reason:
        signals.append("failure_reason_present")
    if dod_checker.get("status") != "passed":
        signals.append("dod_unmet")
    if unblock_tasks and signals:
        return {
            "status": "blocked",
            "summary": "The run ended with blocker signals and an unblock path is available.",
            "signals": signals,
        }
    if signals:
        return {
            "status": "needs_follow_up",
            "summary": "The run still needs follow-up before it can be treated as complete.",
            "signals": signals,
        }
    return {
        "status": "accepted",
        "summary": "The run result passed the current reply audit checks.",
        "signals": [],
    }


def _queue_unblock_tasks(
    unblock_tasks: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]] | None, str]:
    if not unblock_tasks:
        return None, ""
    updated: list[dict[str, Any]] = []
    selected_id = ""
    for index, task in enumerate(unblock_tasks):
        task_copy = dict(task)
        if index == 0:
            task_copy["status"] = "queued"
            selected_id = str(task_copy.get("unblock_task_id") or "")
        updated.append(task_copy)
    return updated, selected_id


def evaluate_completion_governance(
    *,
    contract: dict[str, Any],
    run_dir: Path,
    task_result: dict[str, Any] | None,
    test_report: dict[str, Any] | None,
    review_report: dict[str, Any] | None,
    status: str,
    failure_reason: str,
    generated_at: str,
) -> tuple[dict[str, Any], list[dict[str, Any]] | None]:
    planning_contracts = _normalize_records(_load_json_artifact(run_dir, "planning_worker_prompt_contracts.json"))
    unblock_tasks = _normalize_records(_load_json_artifact(run_dir, "planning_unblock_tasks.json"))
    required_checks = _collect_required_checks(planning_contracts, contract=contract)
    dod_checker = _build_dod_checker(
        required_checks=required_checks,
        task_result=task_result,
        test_report=test_report,
        review_report=review_report,
        run_dir=run_dir,
        status=status,
    )
    reply_auditor = _build_reply_auditor(
        status=status,
        failure_reason=failure_reason,
        dod_checker=dod_checker,
        unblock_tasks=unblock_tasks,
    )
    on_incomplete = _collect_policy_action(planning_contracts, "on_incomplete")
    on_blocked = _collect_policy_action(planning_contracts, "on_blocked")

    updated_unblock_tasks: list[dict[str, Any]] | None = None
    unblock_task_id = ""
    selected_action = "none"
    action_source = "none"
    overall_verdict = "complete"
    continuation_summary = "No continuation action is required."

    if reply_auditor["status"] == "blocked" and on_blocked:
        selected_action = on_blocked
        action_source = "continuation_policy.on_blocked"
        updated_unblock_tasks, unblock_task_id = _queue_unblock_tasks(unblock_tasks)
        if updated_unblock_tasks:
            overall_verdict = "queue_unblock_task"
            continuation_summary = "The run is blocked. Queue the L0-managed unblock task before continuing."
        else:
            overall_verdict = "manual_triage"
            continuation_summary = "The run is blocked, but no persisted unblock task is available. Manual triage is required."
    elif reply_auditor["status"] == "needs_follow_up" and on_incomplete:
        selected_action = on_incomplete
        action_source = "continuation_policy.on_incomplete"
        overall_verdict = "continue_same_session"
        continuation_summary = "The run still needs follow-up. Continue the same session under the reply-auditor policy."
    elif reply_auditor["status"] == "accepted" and dod_checker["status"] == "passed":
        overall_verdict = "complete"
        continuation_summary = "All completion governance checks passed. No continuation is required."
    else:
        overall_verdict = "manual_triage"
        continuation_summary = "Completion governance could not select a safe automatic continuation path."

    report = {
        "report_type": "completion_governance_report",
        "generated_at": generated_at,
        "authority": "completion-governance-runtime",
        "source": "finalize_run",
        "execution_authority": "task_contract",
        "overall_verdict": overall_verdict,
        "dod_checker": dod_checker,
        "reply_auditor": reply_auditor,
        "continuation_decision": {
            "status": "selected" if selected_action != "none" else "none",
            "selected_action": selected_action,
            "action_source": action_source,
            "unblock_task_id": unblock_task_id,
            "summary": continuation_summary,
        },
        "context_pack": {
            "status": "not_wired",
            "summary": "Context Pack remains fallback-only, but no runtime producer/consumer is wired into finalize_run yet.",
        },
        "harness_request": {
            "status": "not_wired",
            "summary": "Harness Request has a schema home, but no request/apply lifecycle is wired into this run finalizer yet.",
        },
    }
    return report, updated_unblock_tasks
