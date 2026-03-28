#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any

import yaml


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_POLICY = ROOT / "configs" / "ci_governance_policy.json"
DOCKER_CI = ROOT / "scripts" / "docker_ci.sh"


def _require(condition: bool, errors: list[str], message: str) -> None:
    if not condition:
        errors.append(message)


def _parse_strict_allowlist(path: Path) -> list[str]:
    text = path.read_text(encoding="utf-8")
    match = re.search(r"STRICT_CI_CORTEXPILOT_ENV_ALLOWLIST=\((.*?)\)", text, re.S)
    if not match:
        return []
    items = []
    for raw in match.group(1).splitlines():
        item = raw.strip()
        if not item or item.startswith("#"):
            continue
        items.append(item)
    return items


def _has_strict_dotenv_boundary(text: str) -> bool:
    accepted_patterns = (
        'if [[ ! -v "${var_name}" ]] && ! is_truthy "${GITHUB_ACTIONS:-0}"',
        'if [[ -z "${!var_name+x}" ]] && ! is_truthy "${GITHUB_ACTIONS:-0}"',
    )
    return any(pattern in text for pattern in accepted_patterns)


def _sanitize_violation_message(message: str) -> str:
    return re.sub(r"(?i)(token|secret|password|api[_-]?key)[^\\s]*", "[redacted]", str(message))


def _job_text(job: dict[str, Any]) -> str:
    return json.dumps(job, ensure_ascii=False, sort_keys=True)


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate repo CI workflow against ci_governance_policy.json.")
    parser.add_argument("--policy", default=str(DEFAULT_POLICY), help="Policy JSON path")
    parser.add_argument("--root", default=str(ROOT), help="Repo root to validate")
    args = parser.parse_args()

    repo_root = Path(args.root).resolve()
    policy_path = Path(args.policy).resolve()
    policy = json.loads(policy_path.read_text(encoding="utf-8"))
    workflow_path = repo_root / str(policy["workflow_file"])
    workflow_text = workflow_path.read_text(encoding="utf-8")
    workflow = yaml.safe_load(workflow_text)
    jobs: dict[str, Any] = workflow.get("jobs") or {}
    errors: list[str] = []
    docker_ci_path = repo_root / "scripts" / "docker_ci.sh"
    docker_ci_text = docker_ci_path.read_text(encoding="utf-8")

    concurrency = workflow.get("concurrency") or {}
    expected_group = policy["concurrency"]["group"]
    _require(concurrency.get("group") == expected_group, errors, f"concurrency.group must be `{expected_group}`")
    _require(bool(concurrency.get("cancel-in-progress")) is bool(policy["concurrency"]["cancel_in_progress"]) and concurrency.get("cancel-in-progress") == policy["concurrency"]["cancel_in_progress"], errors, "concurrency.cancel-in-progress drift")

    for job_name in policy["required_jobs"]:
      _require(job_name in jobs, errors, f"missing required job `{job_name}`")

    route_contract = policy.get("route_contract") or {}
    for route_id in ("untrusted_pr", "trusted_pr", "push_main", "workflow_dispatch"):
        route_policy = route_contract.get(route_id)
        _require(isinstance(route_policy, dict), errors, f"route_contract missing `{route_id}`")
        if not isinstance(route_policy, dict):
            continue
        _require(bool(route_policy.get("event_names")), errors, f"route_contract.{route_id}.event_names missing")
        _require(route_policy.get("runner_class") in {"github_hosted", "self_hosted"}, errors, f"route_contract.{route_id}.runner_class invalid")
        _require(route_policy.get("trust_class") in {"trusted", "untrusted"}, errors, f"route_contract.{route_id}.trust_class invalid")
        for job_name in route_policy.get("required_jobs") or []:
            _require(job_name in jobs, errors, f"route_contract.{route_id} references unknown job `{job_name}`")
        for artifact_prefix in route_policy.get("required_artifact_prefixes") or []:
            dynamic_route_artifact = "ci-route-report-${{ needs.ci-trust-boundary.outputs.route_id }}-"
            _require(
                artifact_prefix in workflow_text or (
                    artifact_prefix.startswith("ci-route-report-") and dynamic_route_artifact in workflow_text
                ),
                errors,
                f"route_contract.{route_id} missing workflow artifact prefix `{artifact_prefix}`",
            )

    for job_name in policy["runner_contract"]["github_hosted"]:
        job = jobs.get(job_name) or {}
        _require(job.get("runs-on") == "ubuntu-24.04", errors, f"{job_name} must run on ubuntu-24.04")
    for job_name in policy["runner_contract"]["self_hosted"]:
        job = jobs.get(job_name) or {}
        _require(job.get("runs-on") == ["self-hosted", "shared-pool"], errors, f"{job_name} must run on [self-hosted, shared-pool]")

    trust_boundary_job = jobs.get("ci-trust-boundary") or {}
    trust_outputs = trust_boundary_job.get("outputs") or {}
    _require("route_id" in trust_outputs, errors, "ci-trust-boundary must export route_id")

    pr_gate_needs = set((jobs.get("pr-ci-gate") or {}).get("needs") or [])
    _require({"quick-feedback", "ci-trust-boundary"}.issubset(pr_gate_needs), errors, "pr-ci-gate must depend on quick-feedback + ci-trust-boundary")

    trusted_pr_policy = route_contract.get("trusted_pr") or {}
    pr_release_gate = jobs.get("pr-release-critical-gates") or {}
    trusted_gate_needs = set(pr_release_gate.get("needs") or [])
    if trusted_pr_policy:
        expected_trusted_gate_needs = set(trusted_pr_policy.get("required_jobs") or []) - {"pr-release-critical-gates", "pr-ci-gate"}
        _require(
            trusted_gate_needs == expected_trusted_gate_needs,
            errors,
            "trusted_pr route drift: pr-release-critical-gates.needs must match trusted_pr required upstream jobs",
        )
        pr_release_gate_text = _job_text(pr_release_gate)
        expected_trusted_artifact_prefixes = [
            prefix
            for prefix in trusted_pr_policy.get("required_artifact_prefixes") or []
            if not str(prefix).startswith("ci-route-report-")
        ]
        for prefix in expected_trusted_artifact_prefixes:
            _require(
                prefix in pr_release_gate_text,
                errors,
                f"trusted_pr route drift: pr-release-critical-gates missing artifact prefix `{prefix}`",
            )
        for forbidden_prefix in (
            "ci-ui-truth-artifacts-",
            "ci-resilience-and-e2e-artifacts-",
            "ci-release-evidence-artifacts-",
        ):
            _require(
                forbidden_prefix not in pr_release_gate_text,
                errors,
                f"trusted_pr route drift: pr-release-critical-gates must not reference `{forbidden_prefix}`",
            )

    release_job = jobs.get("release-evidence") or {}
    release_needs = set(release_job.get("needs") or [])
    _require(set(policy["trusted_semantic_jobs"][:-1]).issubset(release_needs), errors, "release-evidence must depend on earlier trusted semantic slices")

    def _upload_paths(job_name: str) -> str:
        job = jobs.get(job_name) or {}
        text_parts = []
        for step in job.get("steps") or []:
            if "uses" in step and "upload-artifact" in str(step.get("uses")):
                with_block = step.get("with") or {}
                text_parts.append(str(with_block.get("path", "")))
        return "\n".join(text_parts)

    for job_name in policy["trusted_semantic_jobs"]:
        upload_text = _upload_paths(job_name)
        for root in policy["artifact_roots_required"]:
            _require(root in upload_text, errors, f"{job_name} upload artifact path missing `{root}`")
    release_upload_text = _upload_paths("release-evidence")
    for root in policy["artifact_roots_release_required"]:
        _require(root in release_upload_text, errors, f"release-evidence upload artifact path missing `{root}`")

    strict_env = policy.get("strict_env_contract") or {}
    expected_allowlist = strict_env.get("allowlisted_cortexpilot_env") or []
    parsed_allowlist = _parse_strict_allowlist(docker_ci_path)
    _require(parsed_allowlist == expected_allowlist, errors, "strict_env_contract.allowlisted_cortexpilot_env drift vs scripts/docker_ci.sh")
    if strict_env.get("forbid_dotenv_fallback") is True:
        _require(_has_strict_dotenv_boundary(docker_ci_text), errors, "docker_ci strict dotenv boundary missing")
        _require('append_strict_ci_cortexpilot_allowlist' in docker_ci_text, errors, "docker_ci strict allowlist hook missing")

    freshness = policy.get("freshness_contract") or {}
    _require(isinstance(freshness.get("max_report_age_sec"), int) and int(freshness.get("max_report_age_sec")) > 0, errors, "freshness_contract.max_report_age_sec invalid")
    _require(bool(freshness.get("required_report_metadata_fields")), errors, "freshness_contract.required_report_metadata_fields missing")

    cloud = policy.get("cloud_bootstrap_contract") or {}
    allowed_jobs = set(cloud.get("allowed_job_names") or [])
    permission_key = str(cloud.get("required_permission_key") or "")
    permission_value = str(cloud.get("required_permission_value") or "")
    for job_name, job in jobs.items():
        permissions = job.get("permissions") or {}
        if permissions.get(permission_key) == permission_value and job_name not in allowed_jobs:
            errors.append(f"{job_name} must not request {permission_key}: {permission_value}")
    for job_name in allowed_jobs:
        job = jobs.get(job_name) or {}
        permissions = job.get("permissions") or {}
        _require(permissions.get(permission_key) == permission_value, errors, f"{job_name} missing {permission_key}: {permission_value}")
        _require("cloud_bootstrap_allowed" in str(job.get("if") or ""), errors, f"{job_name} must gate on cloud_bootstrap_allowed")

    _require("CORTEXPILOT_CI_ROUTE_ID" in docker_ci_text, errors, "docker_ci must pass route metadata into strict container path")

    if errors:
        print("❌ [ci-governance-policy] violations:")
        print(f"- count={len(errors)}")
        for item in errors:
            print(f"- {_sanitize_violation_message(item)}")
        return 1
    print("✅ [ci-governance-policy] workflow satisfies governance policy")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
