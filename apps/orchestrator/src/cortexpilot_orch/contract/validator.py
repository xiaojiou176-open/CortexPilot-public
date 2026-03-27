from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
from typing import Any, Iterable

from jsonschema import Draft202012Validator
from jsonschema.exceptions import ValidationError


_FORBIDDEN_PATH_MARKERS = {"*", "**", ".", "/"}
_GLOB_CHARS = {"*", "?", "["}
_WIDE_PATH_MARKERS = {"src", "docs"}
_REPO_ROOT = Path(__file__).resolve().parents[5]
_AGENT_REGISTRY_ENV = "CORTEXPILOT_AGENT_REGISTRY"
_SCHEMA_REGISTRY_FILE = "schema_registry.json"
_SUPERPOWERS_GATE_ENV = "CORTEXPILOT_SUPERPOWERS_GATE_ENFORCE"
_SUPERPOWERS_GATE_MARKERS = {
    "superpowers://required",
    "superpowers:required",
    "gate:superpowers",
    "cortexpilot://superpowers-gate",
}
_PLAN_STAGE_MARKERS = {
    "plan",
    "roadmap",
    "milestone",
    "\u6b65\u9aa4",
    "\u65b9\u6848",
    "\u8ba1\u5212",
}
_TRIVIAL_TEST_COMMANDS = {"true", ":"}


def resolve_agent_registry_path(repo_root: Path | None = None) -> Path:
    root = repo_root or _REPO_ROOT
    override = os.getenv(_AGENT_REGISTRY_ENV, "").strip()
    if override:
        path = Path(override).expanduser()
        return (root / path).resolve() if not path.is_absolute() else path
    preferred = root / "policies" / "agent_registry.json"
    return preferred


def _agent_registry_path() -> Path:
    return resolve_agent_registry_path()


def _load_agent_registry() -> dict[str, Any]:
    path = _agent_registry_path()
    if not path.exists():
        raise ValueError(f"agent_registry missing: {path}")
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise ValueError(f"agent_registry invalid: {exc}") from exc
    schema_path = _REPO_ROOT / "schemas" / "agent_registry.v1.json"
    if not schema_path.exists():
        raise ValueError(f"agent_registry schema missing: {schema_path}")
    schema = json.loads(schema_path.read_text(encoding="utf-8"))
    validator = Draft202012Validator(schema)
    try:
        validator.validate(payload)
    except ValidationError as exc:
        detail = f"{exc.message} (path={list(exc.path)})"
        raise ValueError(f"agent_registry schema validation failed: {detail}") from exc
    return payload if isinstance(payload, dict) else {}


def _schema_root(schema_root: Path | None = None) -> Path:
    if schema_root is not None:
        return schema_root
    return _REPO_ROOT / "schemas"


def _schema_registry_path(schema_root: Path | None = None) -> Path:
    return _schema_root(schema_root) / _SCHEMA_REGISTRY_FILE


def _schema_hash(path: Path) -> str:
    payload = path.read_bytes()
    return hashlib.sha256(payload).hexdigest()


_OUTPUT_SCHEMA_BY_ROLE: dict[str, str] = {
    "REVIEWER": "review_report.v1.json",
    "TEST_RUNNER": "test_report.v1.json",
    "TEST": "test_report.v1.json",
}


def _output_schema_name_for_role(role: str | None) -> str:
    role_key = (role or "").strip().upper()
    return _OUTPUT_SCHEMA_BY_ROLE.get(role_key, "agent_task_result.v1.json")


def _output_schema_role_key(role: str | None) -> str:
    role_key = (role or "").strip().lower()
    return role_key or "worker"


def _resolve_output_schema_artifact(artifacts: list[Any], role: str | None) -> dict[str, Any] | None:
    role_key = _output_schema_role_key(role)
    candidates = {f"output_schema.{role_key}", "output_schema"}
    for artifact in artifacts:
        if not isinstance(artifact, dict):
            continue
        name = artifact.get("name")
        if isinstance(name, str) and name.strip().lower() in candidates:
            return artifact
    return None


def _resolve_output_schema_path(
    artifact: dict[str, Any],
    schema_root: Path,
    repo_root: Path,
    expected_name: str,
) -> Path:
    uri = artifact.get("uri")
    if not isinstance(uri, str) or not uri.strip():
        raise ValueError("Contract validation failed: output_schema uri missing")
    raw = Path(uri)
    candidate = raw if raw.is_absolute() else (repo_root / raw)
    candidate = candidate.resolve()
    if not candidate.exists():
        raise ValueError(f"Contract validation failed: output_schema not found: {candidate}")
    try:
        if not candidate.is_relative_to(schema_root.resolve()):
            raise ValueError(
                f"Contract validation failed: output_schema must live under {schema_root}"
            )
    except AttributeError:
        if not str(candidate).startswith(str(schema_root.resolve())):
            raise ValueError(
                f"Contract validation failed: output_schema must live under {schema_root}"
            )
    if candidate.name != expected_name:
        raise ValueError(
            "Contract validation failed: output_schema mismatch for role "
            f"(expected {expected_name}, got {candidate.name})"
        )
    return candidate


def _compute_schema_hashes(schema_root: Path | None = None) -> dict[str, str]:
    root = _schema_root(schema_root)
    hashes: dict[str, str] = {}
    for path in sorted(root.glob("*.json")):
        if path.name == _SCHEMA_REGISTRY_FILE:
            continue
        hashes[path.name] = _schema_hash(path)
    return hashes


def check_schema_registry(schema_root: Path | None = None) -> dict[str, Any]:
    root = _schema_root(schema_root)
    registry_path = _schema_registry_path(root)
    computed = _compute_schema_hashes(root)
    if not registry_path.exists():
        return {
            "status": "missing",
            "registry_path": str(registry_path),
            "computed_count": len(computed),
            "mismatched": [],
            "missing": [],
            "extra": [],
        }
    try:
        registry = json.loads(registry_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        return {
            "status": "invalid",
            "registry_path": str(registry_path),
            "error": str(exc),
            "computed_count": len(computed),
            "mismatched": [],
            "missing": [],
            "extra": [],
        }
    declared = registry.get("schemas") if isinstance(registry, dict) else {}
    declared = declared if isinstance(declared, dict) else {}
    mismatched: list[str] = []
    missing: list[str] = []
    extra: list[str] = []
    for name, sha in computed.items():
        declared_entry = declared.get(name)
        declared_sha = declared_entry.get("sha256") if isinstance(declared_entry, dict) else None
        if declared_entry is None:
            missing.append(name)
            continue
        if declared_sha != sha:
            mismatched.append(name)
    for name in declared.keys():
        if name not in computed:
            extra.append(name)
    status = "ok" if not (mismatched or missing or extra) else "mismatch"
    return {
        "status": status,
        "registry_path": str(registry_path),
        "registry_version": registry.get("version") if isinstance(registry, dict) else None,
        "computed_count": len(computed),
        "mismatched": mismatched,
        "missing": missing,
        "extra": extra,
    }


def _ensure_agent_in_registry(registry: dict[str, Any], agent: object, label: str) -> None:
    if not isinstance(agent, dict):
        raise ValueError(f"agent_registry validation failed: {label} invalid")
    agent_id = agent.get("agent_id")
    role = agent.get("role")
    if not isinstance(agent_id, str) or not agent_id.strip():
        raise ValueError(f"agent_registry validation failed: {label}.agent_id missing")
    if not isinstance(role, str) or not role.strip():
        raise ValueError(f"agent_registry validation failed: {label}.role missing")
    entries = registry.get("agents") if isinstance(registry, dict) else []
    match = False
    if isinstance(entries, list):
        for entry in entries:
            if not isinstance(entry, dict):
                continue
            if entry.get("agent_id") == agent_id and entry.get("role") == role:
                match = True
                break
    if not match:
        raise ValueError(f"agent_registry validation failed: {label} not registered")


def _normalize_allowed_path(path: str) -> str:
    return Path(path).as_posix().lstrip("./")


def find_invalid_allowed_paths(allowed_paths: Iterable[object]) -> list[str]:
    invalid: list[str] = []
    for raw in allowed_paths:
        if not isinstance(raw, str):
            invalid.append(str(raw))
            continue
        candidate = raw.strip()
        if not candidate:
            invalid.append(raw)
            continue
        normalized = _normalize_allowed_path(candidate)
        if not normalized or normalized in _FORBIDDEN_PATH_MARKERS:
            invalid.append(candidate)
            continue
        if normalized.startswith("/") or normalized.startswith("../") or "/../" in normalized:
            invalid.append(candidate)
            continue
        if normalized.startswith(".runtime-cache"):
            invalid.append(candidate)
            continue
        if any(ch in normalized for ch in _GLOB_CHARS):
            invalid.append(candidate)
            continue
    return invalid


def is_wide_path(path: str) -> bool:
    if not isinstance(path, str):
        return False
    candidate = path.strip()
    if not candidate:
        return True
    normalized = _normalize_allowed_path(candidate)
    if not normalized:
        return True
    if normalized in _FORBIDDEN_PATH_MARKERS:
        return True
    if normalized.startswith(".runtime-cache"):
        return True
    if normalized.rstrip("/") in _WIDE_PATH_MARKERS:
        return True
    return False


def find_wide_paths(allowed_paths: Iterable[object]) -> list[str]:
    wide: list[str] = []
    for raw in allowed_paths:
        if not isinstance(raw, str):
            continue
        if is_wide_path(raw):
            wide.append(raw)
    return wide


def _normalize_contract_payload(payload: dict[str, Any]) -> dict[str, Any]:
    normalized = dict(payload)
    inputs = normalized.get("inputs") if isinstance(normalized.get("inputs"), dict) else {}
    if isinstance(inputs, dict):
        inputs_copy = dict(inputs)
        artifacts = inputs_copy.get("artifacts")
        if isinstance(artifacts, dict):
            inputs_copy["artifacts"] = [artifacts]
        normalized["inputs"] = inputs_copy

    mcp_tool_set = normalized.get("mcp_tool_set")
    if not isinstance(mcp_tool_set, list):
        tool_permissions = normalized.get("tool_permissions") if isinstance(normalized.get("tool_permissions"), dict) else {}
        legacy_mcp_tools = tool_permissions.get("mcp_tools") if isinstance(tool_permissions.get("mcp_tools"), list) else []
        if legacy_mcp_tools:
            normalized["mcp_tool_set"] = legacy_mcp_tools
    return normalized


def _is_truthy(raw: str | None) -> bool:
    if raw is None:
        return False
    return raw.strip().lower() in {"1", "true", "yes", "on", "strict", "enforce"}


def _contains_plan_marker(raw: object) -> bool:
    if not isinstance(raw, str):
        return False
    candidate = raw.strip().lower()
    if not candidate:
        return False
    return any(marker in candidate for marker in _PLAN_STAGE_MARKERS)


def _normalize_command(raw: object) -> str:
    if not isinstance(raw, str):
        return ""
    return " ".join(raw.strip().lower().split())


def _is_trivial_acceptance_command(command: str) -> bool:
    if not command:
        return True
    if command in _TRIVIAL_TEST_COMMANDS:
        return True
    if command.startswith("echo ") and "&&" not in command and ";" not in command and "|" not in command:
        return True
    return False


def is_superpowers_gate_required(payload: dict[str, Any]) -> bool:
    if _is_truthy(os.getenv(_SUPERPOWERS_GATE_ENV)):
        return True
    links = payload.get("evidence_links")
    if not isinstance(links, list):
        return False
    for link in links:
        if not isinstance(link, str):
            continue
        normalized = link.strip().lower()
        if normalized in _SUPERPOWERS_GATE_MARKERS:
            return True
    return False


def evaluate_superpowers_gate(payload: dict[str, Any]) -> dict[str, Any]:
    required = is_superpowers_gate_required(payload)
    inputs = payload.get("inputs") if isinstance(payload.get("inputs"), dict) else {}
    spec = inputs.get("spec") if isinstance(inputs.get("spec"), str) else ""
    artifacts = inputs.get("artifacts") if isinstance(inputs.get("artifacts"), list) else []
    required_outputs = (
        payload.get("required_outputs") if isinstance(payload.get("required_outputs"), list) else []
    )
    handoff_chain = payload.get("handoff_chain") if isinstance(payload.get("handoff_chain"), dict) else {}
    acceptance_tests = (
        payload.get("acceptance_tests") if isinstance(payload.get("acceptance_tests"), list) else []
    )

    roles_raw = handoff_chain.get("roles") if isinstance(handoff_chain.get("roles"), list) else []
    handoff_roles = {
        str(role).strip().upper()
        for role in roles_raw
        if isinstance(role, str) and role.strip()
    }

    spec_ok = bool(spec.strip())
    plan_ok = False
    for item in required_outputs:
        if not isinstance(item, dict):
            continue
        if _contains_plan_marker(item.get("name")) or _contains_plan_marker(item.get("acceptance")):
            plan_ok = True
            break
    if not plan_ok:
        for artifact in artifacts:
            if not isinstance(artifact, dict):
                continue
            if _contains_plan_marker(artifact.get("name")):
                plan_ok = True
                break

    subagent_ok = (
        bool(handoff_chain.get("enabled"))
        and "TECH_LEAD" in handoff_roles
        and "WORKER" in handoff_roles
        and int(handoff_chain.get("max_handoffs", 1) or 1) >= 1
    )
    review_ok = "REVIEWER" in handoff_roles

    non_trivial_tests = 0
    for case in acceptance_tests:
        if not isinstance(case, dict):
            continue
        if not case.get("must_pass"):
            continue
        command = _normalize_command(case.get("cmd"))
        if _is_trivial_acceptance_command(command):
            continue
        non_trivial_tests += 1
    test_ok = non_trivial_tests > 0 and ("TEST_RUNNER" in handoff_roles or "TEST" in handoff_roles)

    stages = {
        "spec": {"ok": spec_ok},
        "plan": {"ok": plan_ok},
        "subagent": {"ok": subagent_ok},
        "review": {"ok": review_ok},
        "test": {"ok": test_ok, "non_trivial_acceptance_tests": non_trivial_tests},
    }
    violations: list[dict[str, str]] = []
    if required:
        if not spec_ok:
            violations.append(
                {
                    "stage": "spec",
                    "code": "missing_spec",
                    "message": "inputs.spec must be non-empty",
                }
            )
        if not plan_ok:
            violations.append(
                {
                    "stage": "plan",
                    "code": "missing_plan_evidence",
                    "message": "required_outputs or inputs.artifacts must declare plan evidence",
                }
            )
        if not subagent_ok:
            violations.append(
                {
                    "stage": "subagent",
                    "code": "invalid_handoff_chain",
                    "message": "handoff_chain must enable TECH_LEAD->WORKER collaboration",
                }
            )
        if not review_ok:
            violations.append(
                {
                    "stage": "review",
                    "code": "missing_reviewer_stage",
                    "message": "handoff_chain.roles must include REVIEWER",
                }
            )
        if not test_ok:
            violations.append(
                {
                    "stage": "test",
                    "code": "missing_test_stage",
                    "message": "handoff_chain.roles must include TEST/TEST_RUNNER and acceptance_tests must be non-trivial",
                }
            )
    return {
        "required": required,
        "mode": "enforce" if required else "off",
        "ok": (not required) or (len(violations) == 0),
        "stages": stages,
        "violations": violations,
    }


class ContractValidator:
    def __init__(self, schema_root: Path | None = None) -> None:
        if schema_root is None:
            schema_root = Path(__file__).resolve().parents[5] / "schemas"
        self._schema_root = schema_root

    def _load_schema(self, schema_name: str) -> dict[str, Any]:
        schema_path = self._schema_root / schema_name
        if not schema_path.exists():
            fallback = _REPO_ROOT / "schemas" / schema_name
            if fallback.exists():
                schema_path = fallback
            else:
                raise FileNotFoundError(f"Schema not found: {schema_path}")
        return json.loads(schema_path.read_text(encoding="utf-8"))

    def _validate(self, payload: dict[str, Any], schema_name: str) -> dict[str, Any]:
        schema = self._load_schema(schema_name)
        validator = Draft202012Validator(schema)
        try:
            validator.validate(payload)
        except ValidationError as exc:
            detail = f"{exc.message} (path={list(exc.path)})"
            raise ValueError(f"Schema validation failed: {schema_name}: {detail}") from exc
        return payload

    def _enforce_contract_rules(self, payload: dict[str, Any]) -> None:
        allowed_paths = payload.get("allowed_paths", [])
        if not isinstance(allowed_paths, list) or len(allowed_paths) == 0:
            raise ValueError("Contract validation failed: allowed_paths is empty")
        invalid = find_invalid_allowed_paths(allowed_paths)
        if invalid:
            raise ValueError(
                "Contract validation failed: allowed_paths contains invalid entries"
            )
        rollback = payload.get("rollback", {})
        if isinstance(rollback, dict) and rollback.get("strategy") == "git_revert_commit":
            target_ref = rollback.get("target_ref")
            if target_ref is not None and (not isinstance(target_ref, str) or not target_ref.strip()):
                raise ValueError("Contract validation failed: rollback.target_ref invalid")
        policy_pack = payload.get("policy_pack")
        if policy_pack is not None:
            if not isinstance(policy_pack, str) or policy_pack.strip().lower() not in {"low", "medium", "high"}:
                raise ValueError("Contract validation failed: policy_pack invalid")
        mcp_tool_set = payload.get("mcp_tool_set")
        if not isinstance(mcp_tool_set, list) or not any(
            isinstance(item, str) and item.strip() for item in mcp_tool_set
        ):
            tool_permissions = payload.get("tool_permissions") if isinstance(payload.get("tool_permissions"), dict) else {}
            legacy_mcp_tools = tool_permissions.get("mcp_tools") if isinstance(tool_permissions.get("mcp_tools"), list) else []
            if not any(isinstance(item, str) and item.strip() for item in legacy_mcp_tools):
                raise ValueError("Contract validation failed: mcp_tool_set missing or empty")

        inputs = payload.get("inputs") if isinstance(payload.get("inputs"), dict) else {}
        artifacts = inputs.get("artifacts") if isinstance(inputs.get("artifacts"), list) else []
        assigned = payload.get("assigned_agent") if isinstance(payload.get("assigned_agent"), dict) else {}
        role = assigned.get("role") if isinstance(assigned.get("role"), str) else None
        artifact = _resolve_output_schema_artifact(artifacts, role)
        if artifact:
            expected_name = _output_schema_name_for_role(role)
            schema_path = _resolve_output_schema_path(
                artifact,
                self._schema_root,
                _REPO_ROOT,
                expected_name,
            )
            declared_sha = artifact.get("sha256")
            expected_sha = _schema_hash(schema_path)
            if declared_sha != expected_sha:
                raise ValueError("Contract validation failed: output_schema sha256 mismatch")
        registry = _load_agent_registry()
        _ensure_agent_in_registry(registry, payload.get("owner_agent"), "owner_agent")
        _ensure_agent_in_registry(registry, payload.get("assigned_agent"), "assigned_agent")

        superpowers_gate = evaluate_superpowers_gate(payload)
        if superpowers_gate.get("required") and not superpowers_gate.get("ok"):
            codes = ", ".join(
                str(item.get("code", "unknown"))
                for item in superpowers_gate.get("violations", [])
                if isinstance(item, dict)
            )
            raise ValueError(
                "Contract validation failed: superpowers gate violation"
                + (f" ({codes})" if codes else "")
            )

    def validate_contract(self, payload: dict[str, Any]) -> dict[str, Any]:
        payload = _normalize_contract_payload(payload)
        payload = self._validate(payload, "task_contract.v1.json")
        self._enforce_contract_rules(payload)
        return payload

    def validate_report(self, payload: dict[str, Any], schema_name: str) -> dict[str, Any]:
        return self._validate(payload, schema_name)

    def validate_event(self, payload: dict[str, Any]) -> dict[str, Any]:
        return self._validate(payload, "orchestrator_event.v1.json")

    def validate_contract_file(self, contract_path: Path) -> dict[str, Any]:
        contract = json.loads(contract_path.read_text(encoding="utf-8"))
        return self.validate_contract(contract)

    def validate_report_file(self, report_path: Path, schema_name: str) -> dict[str, Any]:
        report = json.loads(report_path.read_text(encoding="utf-8"))
        return self.validate_report(report, schema_name)


def validate_contract(contract_path: Path) -> dict[str, Any]:
    return ContractValidator().validate_contract_file(contract_path)


def validate_report(report_path: Path, schema_name: str) -> dict[str, Any]:
    return ContractValidator().validate_report_file(report_path, schema_name)


def hash_contract(contract: dict[str, Any]) -> str:
    payload = json.dumps(contract, sort_keys=True, ensure_ascii=False).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()
