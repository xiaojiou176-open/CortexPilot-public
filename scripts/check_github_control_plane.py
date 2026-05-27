#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_POLICY = ROOT / "configs" / "github_control_plane_policy.json"
DEFAULT_OUTPUT = ROOT / ".runtime-cache" / "test_output" / "governance" / "github_control_plane_report.json"


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _gh_json(path: str) -> tuple[int, dict]:
    proc = subprocess.run(["gh", "api", path], cwd=ROOT, capture_output=True, text=True)
    raw = (proc.stdout or proc.stderr).strip()
    payload: dict
    try:
        payload = json.loads(raw) if raw else {}
    except Exception:  # noqa: BLE001
        payload = {"raw": raw}
    return proc.returncode, payload


def _repo_path_exists(relative_path: str) -> bool:
    return (ROOT / relative_path).exists()


def _security_feature_status(repo_payload: dict, feature_name: str) -> str:
    security = repo_payload.get("security_and_analysis")
    if not isinstance(security, dict):
        return ""
    feature = security.get(feature_name)
    if not isinstance(feature, dict):
        return ""
    return str(feature.get("status") or "").strip()


def _org_configuration_id(platform_evidence: dict) -> str:
    cfg = platform_evidence.get("org_code_security_configuration")
    if not isinstance(cfg, dict):
        return ""
    return str(cfg.get("configuration_id") or "").strip()


def _org_config_proves_feature(
    org_config_payload: dict,
    org_repo_payload: list[dict] | dict,
    *,
    repo_id: int | None,
    feature_name: str,
    required_repository_status: str,
) -> bool:
    if repo_id is None:
        return False
    feature_value = str(org_config_payload.get(feature_name) or "").strip()
    if feature_value != "enabled":
        return False
    if not isinstance(org_repo_payload, list):
        return False
    for item in org_repo_payload:
        if not isinstance(item, dict):
            continue
        repo = item.get("repository")
        if not isinstance(repo, dict):
            continue
        if repo.get("id") != repo_id:
            continue
        status = str(item.get("status") or "").strip()
        return status == required_repository_status
    return False


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate live GitHub control-plane settings against repo policy.")
    parser.add_argument("--policy", default=str(DEFAULT_POLICY))
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT))
    args = parser.parse_args()

    policy = json.loads(Path(args.policy).read_text(encoding="utf-8"))
    owner = str(policy["owner"]).strip()
    repo = str(policy["repo"]).strip()
    default_branch = str(policy["default_branch"]).strip()
    errors: list[str] = []
    warnings: list[str] = []

    repo_code, repo_payload = _gh_json(f"repos/{owner}/{repo}")
    actions_code, actions_payload = _gh_json(f"repos/{owner}/{repo}/actions/permissions")
    branch_code, branch_payload = _gh_json(f"repos/{owner}/{repo}/branches/{default_branch}/protection")
    env_code, env_payload = _gh_json(f"repos/{owner}/{repo}/environments")
    pvr_code, pvr_payload = _gh_json(f"repos/{owner}/{repo}/private-vulnerability-reporting")
    vuln_alerts_code, vuln_alerts_payload = _gh_json(f"repos/{owner}/{repo}/vulnerability-alerts")
    codeql_code, codeql_payload = _gh_json(f"repos/{owner}/{repo}/code-scanning/default-setup")
    dependabot_code, dependabot_payload = _gh_json(f"repos/{owner}/{repo}/dependabot/alerts?per_page=1")
    org_config_id = ""
    org_config_code = 0
    org_config_payload: dict = {}
    org_config_repos_code = 0
    org_config_repos_payload: list[dict] | dict = []

    if repo_code != 0:
        errors.append(f"gh api repo fetch failed: {repo_payload}")
    else:
        if str(repo_payload.get("default_branch") or "") != default_branch:
            errors.append(
                f"default_branch drift: repo={repo_payload.get('default_branch')!r}, policy={default_branch!r}"
            )

    expected_actions = policy.get("required_actions_permissions", {})
    if actions_code != 0:
        errors.append(f"gh api actions permissions failed: {actions_payload}")
    else:
        for key, expected in expected_actions.items():
            actual = actions_payload.get(key)
            if actual != expected:
                errors.append(f"actions permission drift for {key}: actual={actual!r} expected={expected!r}")

    required_envs = set(policy.get("required_environments", []))
    if env_code != 0:
        errors.append(f"gh api environments failed: {env_payload}")
    else:
        actual_envs = {str(item.get("name") or "").strip() for item in env_payload.get("environments", []) if isinstance(item, dict)}
        missing_envs = sorted(name for name in required_envs if name and name not in actual_envs)
        if missing_envs:
            errors.append(f"missing required environments: {', '.join(missing_envs)}")

    if policy.get("branch_protection_required", False):
        if branch_code != 0:
            errors.append(f"branch protection unavailable or mismatched: {branch_payload}")
        else:
            required_checks = policy.get("required_checks") or []
            if isinstance(required_checks, list) and required_checks:
                actual_checks = branch_payload.get("required_status_checks") if isinstance(branch_payload, dict) else {}
                contexts = actual_checks.get("contexts") if isinstance(actual_checks, dict) else []
                actual_set = {str(item).strip() for item in contexts if str(item).strip()}
                missing = sorted(str(item).strip() for item in required_checks if str(item).strip() and str(item).strip() not in actual_set)
                if missing:
                    errors.append(f"missing required checks: {', '.join(missing)}")

    platform_evidence = policy.get("platform_evidence") if isinstance(policy.get("platform_evidence"), dict) else {}
    if platform_evidence:
        org_config_id = _org_configuration_id(platform_evidence)
        if org_config_id:
            org_config_code, org_config_payload = _gh_json(f"orgs/{owner}/code-security/configurations/{org_config_id}")
            org_config_repos_code, org_config_repos_payload = _gh_json(
                f"orgs/{owner}/code-security/configurations/{org_config_id}/repositories"
            )
        pvr_required = bool((platform_evidence.get("private_vulnerability_reporting") or {}).get("required"))
        if pvr_required:
            if pvr_code != 0:
                errors.append(f"private vulnerability reporting not proven: {pvr_payload}")
        vulnerability_alerts_required = bool((platform_evidence.get("vulnerability_alerts") or {}).get("required"))
        if vulnerability_alerts_required and vuln_alerts_code != 0:
            errors.append(f"vulnerability alerts not proven: {vuln_alerts_payload}")
        repo_id = repo_payload.get("id") if isinstance(repo_payload, dict) else None
        required_repo_status = str(
            ((platform_evidence.get("org_code_security_configuration") or {}) if isinstance(platform_evidence.get("org_code_security_configuration"), dict) else {}).get("required_repository_status")
            or "enforced"
        ).strip()
        for feature_name in (
            "secret_scanning",
            "secret_scanning_push_protection",
            "secret_scanning_non_provider_patterns",
            "secret_scanning_validity_checks",
        ):
            feature_rule = platform_evidence.get(feature_name) if isinstance(platform_evidence.get(feature_name), dict) else {}
            if feature_rule.get("required"):
                status = _security_feature_status(repo_payload, feature_name)
                if status != "enabled" and not _org_config_proves_feature(
                    org_config_payload,
                    org_config_repos_payload,
                    repo_id=repo_id if isinstance(repo_id, int) else None,
                    feature_name=feature_name,
                    required_repository_status=required_repo_status,
                ):
                    errors.append(
                        f"{feature_name} drift: actual={status or 'missing'!r} expected='enabled'"
                    )
        org_cfg_rule = platform_evidence.get("org_code_security_configuration") if isinstance(platform_evidence.get("org_code_security_configuration"), dict) else {}
        if org_cfg_rule.get("required"):
            if org_config_code != 0:
                errors.append(f"org code-security configuration not proven: {org_config_payload}")
            elif org_config_repos_code != 0:
                errors.append(f"org code-security configuration repository binding not proven: {org_config_repos_payload}")
        dependabot_rule = platform_evidence.get("dependabot_config") if isinstance(platform_evidence.get("dependabot_config"), dict) else {}
        dependabot_path = str(dependabot_rule.get("path") or "").strip()
        if dependabot_path and not _repo_path_exists(dependabot_path):
            errors.append(f"missing dependabot config: {dependabot_path}")
        elif dependabot_path and dependabot_code != 0:
            errors.append(f"dependabot alerts not proven: {dependabot_payload}")
        codeql_workflow_rule = platform_evidence.get("codeql_workflow") if isinstance(platform_evidence.get("codeql_workflow"), dict) else {}
        codeql_workflow_path = str(codeql_workflow_rule.get("path") or "").strip()
        if codeql_workflow_path and not _repo_path_exists(codeql_workflow_path):
            errors.append(f"missing codeql workflow: {codeql_workflow_path}")
        codeql_config_rule = platform_evidence.get("codeql_config") if isinstance(platform_evidence.get("codeql_config"), dict) else {}
        codeql_config_path = str(codeql_config_rule.get("path") or "").strip()
        if codeql_config_path and not _repo_path_exists(codeql_config_path):
            errors.append(f"missing codeql config: {codeql_config_path}")
        deploy_story_rule = platform_evidence.get("deploy_story") if isinstance(platform_evidence.get("deploy_story"), dict) else {}
        deploy_story_path = str(deploy_story_rule.get("path") or "").strip()
        expected_note = str(deploy_story_rule.get("expected_note") or "").strip()
        if deploy_story_path and not _repo_path_exists(deploy_story_path):
            errors.append(f"missing deploy story evidence doc: {deploy_story_path}")
        elif deploy_story_path and expected_note:
            content = (ROOT / deploy_story_path).read_text(encoding="utf-8")
            if expected_note not in content:
                warnings.append(f"deploy story note not found in {deploy_story_path}: expected '{expected_note}'")

    report = {
        "generated_at": _utc_now(),
        "owner": owner,
        "repo": repo,
        "default_branch": default_branch,
        "repo_payload": repo_payload if repo_code == 0 else {"error": repo_payload},
        "actions_permissions": actions_payload if actions_code == 0 else {"error": actions_payload},
        "branch_protection": branch_payload if branch_code == 0 else {"error": branch_payload},
        "environments": env_payload if env_code == 0 else {"error": env_payload},
        "private_vulnerability_reporting": pvr_payload if pvr_code == 0 else {"error": pvr_payload},
        "vulnerability_alerts": {"enabled": True} if vuln_alerts_code == 0 else {"error": vuln_alerts_payload},
        "security_and_analysis": repo_payload.get("security_and_analysis") if repo_code == 0 else {"error": repo_payload},
        "org_code_security_configuration": org_config_payload if org_config_id and org_config_code == 0 else {"error": org_config_payload} if org_config_id else {},
        "org_code_security_configuration_repositories": org_config_repos_payload if org_config_id and org_config_repos_code == 0 else {"error": org_config_repos_payload} if org_config_id else {},
        "codeql_default_setup": codeql_payload if codeql_code == 0 else {"error": codeql_payload},
        "dependabot_alerts": dependabot_payload if dependabot_code == 0 else {"error": dependabot_payload},
        "errors": errors,
        "warnings": warnings,
    }
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    if errors:
        print("❌ [github-control-plane] violations:")
        for item in errors:
            print(f"- {item}")
        if warnings:
            print("⚠️ [github-control-plane] warnings:")
            for item in warnings:
                print(f"- {item}")
        return 1

    print(f"✅ [github-control-plane] policy satisfied: {output_path.relative_to(ROOT)}")
    if warnings:
        print("⚠️ [github-control-plane] warnings:")
        for item in warnings:
            print(f"- {item}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
