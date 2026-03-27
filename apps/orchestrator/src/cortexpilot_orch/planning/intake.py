from __future__ import annotations

import asyncio
import hashlib
import ipaddress
import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from cortexpilot_orch.contract.compiler import compile_plan
from cortexpilot_orch.contract.validator import ContractValidator
from cortexpilot_orch.config import get_runner_config
from cortexpilot_orch.runners.provider_resolution import (
    build_llm_compat_client,
    merge_provider_credentials,
    ProviderResolutionError,
    resolve_preferred_api_key,
    ProviderCredentials,
    resolve_provider_credentials,
    resolve_runtime_provider_from_env,
)
from cortexpilot_orch.store.intake_store import IntakeStore

from . import intake_generation_helpers as _generation_helpers
from . import intake_plan_bundle_helpers as _bundle_helpers
from . import intake_policy_helpers as _policy_helpers
from tooling.page_brief_pipeline import DEFAULT_PAGE_BRIEF_FOCUS, PAGE_BRIEF_BROWSER_SCRIPT


# -------------------------------------------------------------------
# Defaults
# -------------------------------------------------------------------

_DEFAULT_OWNER = _bundle_helpers._DEFAULT_OWNER
_DEFAULT_TL = {"role": "TECH_LEAD", "agent_id": "agent-1"}
_PLAN_TYPES = _bundle_helpers._PLAN_TYPES
_FANIN_ALLOWED_PATHS = ["__fan_in__/"]
_PLAN_BUNDLE_KEYS = {"bundle_id", "created_at", "objective", "owner_agent", "plans"}


# -------------------------------------------------------------------
# Helper aliases
# -------------------------------------------------------------------

_ensure_agent = _policy_helpers._ensure_agent
_normalize_answers = _policy_helpers._normalize_answers
_normalize_constraints = _policy_helpers._normalize_constraints
_normalize_browser_policy = _policy_helpers._normalize_browser_policy
_compact_browser_policy = _policy_helpers._compact_browser_policy
_resolve_intake_browser_policy = _policy_helpers._resolve_intake_browser_policy
_default_questions = _policy_helpers._default_questions

_clone_plan = _bundle_helpers._clone_plan
_paths_overlap = _bundle_helpers._paths_overlap
_normalize_bundle_plan = _bundle_helpers._normalize_bundle_plan
_extract_parallelism = _bundle_helpers._extract_parallelism
_rebalance_bundle_paths = _bundle_helpers._rebalance_bundle_paths
_validate_plan_bundle_paths = _bundle_helpers._validate_plan_bundle_paths
_build_plan_fallback = _bundle_helpers._build_plan_fallback


# -------------------------------------------------------------------
# Fallbacks
# -------------------------------------------------------------------


def _sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def _now_ts() -> str:
    return datetime.now(timezone.utc).isoformat()


_SENSITIVE_ANSWER_RE = re.compile(
    r"(?i)\b(password|token|secret|key|credential|auth|cert|private)\b\s*[:=]\s*([^\s,;]+)"
)
_PROVIDER_API_KEY_ENV_HINTS = {
    "gemini": "GEMINI_API_KEY",
    "google": "GEMINI_API_KEY",
    "google-genai": "GEMINI_API_KEY",
    "google_genai": "GEMINI_API_KEY",
    "openai": "OPENAI_API_KEY",
    "anthropic": "ANTHROPIC_API_KEY",
    "claude": "ANTHROPIC_API_KEY",
    "anthropic-claude": "ANTHROPIC_API_KEY",
    "anthropic_claude": "ANTHROPIC_API_KEY",
    "equilibrium": "CORTEXPILOT_EQUILIBRIUM_API_KEY",
    "codex_equilibrium": "CORTEXPILOT_EQUILIBRIUM_API_KEY",
}
_NEWS_DIGEST_TEMPLATE = "news_digest"
_TOPIC_BRIEF_TEMPLATE = "topic_brief"
_PAGE_BRIEF_TEMPLATE = "page_brief"
_NEWS_DIGEST_TIME_RANGES = {"24h", "7d", "30d"}


def _missing_llm_api_key_message(provider: str) -> str:
    env_key = _PROVIDER_API_KEY_ENV_HINTS.get(provider, "GEMINI_API_KEY")
    return f"missing LLM API key ({env_key})"


def _resolve_preferred_api_key_for_provider(
    credentials: ProviderCredentials,
    provider: str,
    *,
    base_url: str = "",
) -> str:
    provider_name = str(provider or "").strip()
    normalized = provider_name.lower().replace("-", "_")
    if normalized == "google_genai":
        normalized = "gemini"
    if normalized == "codex_equilibrium":
        normalized = "equilibrium"
    provider_attr = {
        "gemini": "gemini_api_key",
        "openai": "openai_api_key",
        "anthropic": "anthropic_api_key",
        "equilibrium": "gemini_api_key",
    }
    attr = provider_attr.get(normalized)
    if attr:
        value = str(getattr(credentials, attr, "") or "").strip()
        if value:
            return value
        if normalized == "equilibrium":
            equilibrium_key = str(getattr(credentials, "equilibrium_api_key", "") or "").strip()
            if equilibrium_key:
                return equilibrium_key
        if normalized == "gemini" and _is_local_base_url(base_url):
            # Local OpenAI-compatible bridges may use equilibrium key as auth token.
            equilibrium_key = str(getattr(credentials, "equilibrium_api_key", "") or "").strip()
            if equilibrium_key:
                return equilibrium_key
        return ""

    try:
        candidate = resolve_preferred_api_key(credentials, provider_name)  # type: ignore[call-arg]
    except ProviderResolutionError:
        candidate = ""
    except (TypeError, AttributeError):
        candidate = resolve_preferred_api_key(credentials)
    except Exception:
        candidate = ""
    resolved = str(candidate or "").strip()
    if resolved:
        return resolved
    for fallback_attr in (
        "openai_api_key",
        "gemini_api_key",
        "anthropic_api_key",
        "equilibrium_api_key",
    ):
        value = str(getattr(credentials, fallback_attr, "") or "").strip()
        if value:
            return value
    return ""


def _redact_answer(value: str) -> str:
    return _SENSITIVE_ANSWER_RE.sub(r"\1=[REDACTED]", value)


def _normalize_news_digest_payload(raw: Any) -> dict[str, Any]:
    if not isinstance(raw, dict):
        raise ValueError("news_digest template_payload must be an object")
    topic = str(raw.get("topic") or "").strip()
    if not topic:
        raise ValueError("news_digest topic is required")
    raw_sources = raw.get("sources")
    if not isinstance(raw_sources, list):
        raise ValueError("news_digest sources must be a non-empty array")
    sources = [str(item).strip() for item in raw_sources if str(item).strip()]
    if not sources:
        raise ValueError("news_digest sources must be a non-empty array")
    time_range = str(raw.get("time_range") or "24h").strip().lower() or "24h"
    if time_range not in _NEWS_DIGEST_TIME_RANGES:
        raise ValueError("news_digest time_range must be one of 24h/7d/30d")
    try:
        max_results = int(raw.get("max_results", 5))
    except (TypeError, ValueError) as exc:
        raise ValueError("news_digest max_results must be an integer") from exc
    max_results = max(1, min(max_results, 10))
    return {
        "topic": topic,
        "sources": sources,
        "time_range": time_range,
        "max_results": max_results,
    }


def _build_news_digest_objective(payload: dict[str, Any]) -> str:
    topic = str(payload.get("topic") or "").strip()
    sources = [str(item).strip() for item in payload.get("sources", []) if str(item).strip()]
    time_range = str(payload.get("time_range") or "24h").strip().lower() or "24h"
    source_text = ", ".join(sources) if sources else "public web sources"
    return (
        f"Build a public-read-only news digest about '{topic}' using {source_text} "
        f"for the last {time_range}. Return a concise summary, source list, and auditable evidence."
    )


def _build_news_digest_queries(payload: dict[str, Any]) -> list[str]:
    topic = str(payload.get("topic") or "").strip()
    sources = [str(item).strip() for item in payload.get("sources", []) if str(item).strip()]
    queries: list[str] = []
    for source in sources:
        if "." in source:
            queries.append(f"{topic} site:{source}")
        else:
            queries.append(f"{topic} {source}")
    return queries or [topic]


def _normalize_topic_brief_payload(raw: Any) -> dict[str, Any]:
    if not isinstance(raw, dict):
        raise ValueError("topic_brief template_payload must be an object")
    topic = str(raw.get("topic") or "").strip()
    if not topic:
        raise ValueError("topic_brief topic is required")
    time_range = str(raw.get("time_range") or "24h").strip().lower() or "24h"
    if time_range not in _NEWS_DIGEST_TIME_RANGES:
        raise ValueError("topic_brief time_range must be one of 24h/7d/30d")
    try:
        max_results = int(raw.get("max_results", 5))
    except (TypeError, ValueError) as exc:
        raise ValueError("topic_brief max_results must be an integer") from exc
    max_results = max(1, min(max_results, 10))
    return {
        "topic": topic,
        "time_range": time_range,
        "max_results": max_results,
    }


def _is_public_http_url(value: str) -> bool:
    try:
        from urllib.parse import urlparse

        parsed = urlparse(value)
    except Exception:  # noqa: BLE001
        return False
    if parsed.scheme not in {"http", "https"}:
        return False
    host = (parsed.hostname or "").strip().lower()
    if not host or host == "localhost":
        return False
    try:
        ip = ipaddress.ip_address(host)
    except ValueError:
        return True
    return not (ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved)


def _normalize_page_brief_payload(raw: Any) -> dict[str, Any]:
    if not isinstance(raw, dict):
        raise ValueError("page_brief template_payload must be an object")
    url = str(raw.get("url") or "").strip()
    if not url:
        raise ValueError("page_brief url is required")
    if not _is_public_http_url(url):
        raise ValueError("page_brief url must be a public http/https webpage")
    focus = str(raw.get("focus") or DEFAULT_PAGE_BRIEF_FOCUS).strip() or DEFAULT_PAGE_BRIEF_FOCUS
    return {
        "url": url,
        "focus": focus,
    }


def _build_page_brief_objective(payload: dict[str, Any]) -> str:
    url = str(payload.get("url") or "").strip()
    focus = str(payload.get("focus") or DEFAULT_PAGE_BRIEF_FOCUS).strip() or DEFAULT_PAGE_BRIEF_FOCUS
    return (
        f"Build a public-read-only page brief for '{url}'. "
        f"Focus: {focus} Return a concise summary, key points, screenshot, and auditable evidence."
    )


def _build_topic_brief_objective(payload: dict[str, Any]) -> str:
    topic = str(payload.get("topic") or "").strip()
    time_range = str(payload.get("time_range") or "24h").strip().lower() or "24h"
    return (
        f"Build a public-read-only topic brief about '{topic}' "
        f"for the last {time_range}. Return a concise summary, source list, and auditable evidence."
    )


def _build_topic_brief_queries(payload: dict[str, Any]) -> list[str]:
    topic = str(payload.get("topic") or "").strip()
    return [topic] if topic else []


def _apply_task_template_defaults(payload: dict[str, Any]) -> dict[str, Any]:
    task_template = str(payload.get("task_template") or "").strip().lower()
    if not task_template:
        return payload
    if task_template not in {_NEWS_DIGEST_TEMPLATE, _TOPIC_BRIEF_TEMPLATE, _PAGE_BRIEF_TEMPLATE}:
        raise ValueError(f"unsupported task_template: {task_template}")
    if task_template == _NEWS_DIGEST_TEMPLATE:
        template_payload = _normalize_news_digest_payload(payload.get("template_payload"))
    elif task_template == _TOPIC_BRIEF_TEMPLATE:
        template_payload = _normalize_topic_brief_payload(payload.get("template_payload"))
    else:
        template_payload = _normalize_page_brief_payload(payload.get("template_payload"))
    payload["task_template"] = task_template
    payload["template_payload"] = template_payload

    objective = str(payload.get("objective") or "").strip()
    if not objective:
        if task_template == _NEWS_DIGEST_TEMPLATE:
            payload["objective"] = _build_news_digest_objective(template_payload)
        elif task_template == _TOPIC_BRIEF_TEMPLATE:
            payload["objective"] = _build_topic_brief_objective(template_payload)
        else:
            payload["objective"] = _build_page_brief_objective(template_payload)

    search_queries = payload.get("search_queries")
    if not isinstance(search_queries, list) or not any(str(item).strip() for item in search_queries):
        if task_template == _PAGE_BRIEF_TEMPLATE:
            payload["search_queries"] = []
        else:
            payload["search_queries"] = (
                _build_news_digest_queries(template_payload)
                if task_template == _NEWS_DIGEST_TEMPLATE
                else _build_topic_brief_queries(template_payload)
            )

    raw_constraints = payload.get("constraints")
    constraints = [str(item).strip() for item in raw_constraints if str(item).strip()] if isinstance(raw_constraints, list) else []
    for entry in (
        f"task_template={task_template}",
        "public-read-only-sources",
        "no-login-required",
        "no-shopping-or-transactions",
    ):
        if entry not in constraints:
            constraints.append(entry)
    payload["constraints"] = constraints
    return payload


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[5]


def _execute_chain(chain_path: Path, mock_mode: bool) -> dict[str, Any]:
    from cortexpilot_orch.scheduler.scheduler import Orchestrator

    orch = Orchestrator(_repo_root())
    return orch.execute_chain(chain_path, mock_mode=mock_mode)


def _build_plan_bundle_fallback(payload: dict[str, Any], answers: list[str]) -> dict[str, Any]:
    return _generation_helpers.build_plan_bundle_fallback(
        payload,
        answers,
        generate_plan=generate_plan,
        clone_plan=_clone_plan,
        plan_types=_PLAN_TYPES,
        ensure_agent=_ensure_agent,
        default_tl=_DEFAULT_TL,
        normalize_bundle_plan=_normalize_bundle_plan,
        extract_parallelism=_extract_parallelism,
        normalize_constraints=_normalize_constraints,
        rebalance_bundle_paths=_rebalance_bundle_paths,
        now_ts=_now_ts,
        validator_factory=ContractValidator,
    )


# -------------------------------------------------------------------
# Agents SDK helpers
# -------------------------------------------------------------------


def _agents_available() -> bool:
    smoke_flags = (
        os.getenv("CORTEXPILOT_ORCHESTRATION_SMOKE_MODE", "").strip().lower(),
        os.getenv("CORTEXPILOT_E2E_ORCHESTRATION_SMOKE_MODE", "").strip().lower(),
    )
    if any(flag in {"1", "true", "yes", "y", "on"} for flag in smoke_flags):
        return False
    try:
        import agents  # noqa: F401
        return True
    except Exception:  # noqa: BLE001
        return False


def _resolve_agents_store() -> bool:
    raw = os.getenv("CORTEXPILOT_AGENTS_STORE", "").strip().lower()
    if raw in {"1", "true", "yes"}:
        return True
    if raw in {"0", "false", "no"}:
        return False
    return False


def _strip_model_input_ids(payload: Any) -> Any:
    try:
        from agents.run import ModelInputData
    except Exception as exc:  # noqa: BLE001
        raise RuntimeError(f"ModelInputData missing: {exc}") from exc

    model_data = getattr(payload, "model_data", None)
    if model_data is None:
        return ModelInputData(input=[], instructions=None)
    sanitized: list[Any] = []
    for item in list(getattr(model_data, "input", []) or []):
        if isinstance(item, dict):
            cleaned = dict(item)
            cleaned.pop("id", None)
            cleaned.pop("response_id", None)
            sanitized.append(cleaned)
        else:
            sanitized.append(item)
    return ModelInputData(input=sanitized, instructions=getattr(model_data, "instructions", None))


def _is_local_base_url(base_url: str) -> bool:
    base = base_url.strip().lower()
    return base.startswith("http://127.0.0.1") or base.startswith("http://localhost") or base.startswith(
        "http://0.0.0.0"
    )


def _run_agent(prompt: str, instructions: str) -> dict[str, Any]:
    from agents import (
        Agent,
        ModelSettings,
        RunConfig,
        Runner,
    )
    runner_cfg = get_runner_config()
    base_url = runner_cfg.agents_base_url
    try:
        provider = resolve_runtime_provider_from_env()
    except ProviderResolutionError as exc:
        raise RuntimeError(str(exc)) from exc
    provider_credentials = merge_provider_credentials(
        ProviderCredentials(
            gemini_api_key=str(getattr(runner_cfg, "gemini_api_key", "") or "").strip(),
            openai_api_key=str(getattr(runner_cfg, "openai_api_key", "") or "").strip(),
            anthropic_api_key=str(getattr(runner_cfg, "anthropic_api_key", "") or "").strip(),
            equilibrium_api_key=str(getattr(runner_cfg, "equilibrium_api_key", "") or "").strip(),
        ),
        resolve_provider_credentials(),
    )
    api_key = _resolve_preferred_api_key_for_provider(provider_credentials, provider, base_url=base_url)
    if not api_key:
        raise RuntimeError(_missing_llm_api_key_message(provider))
    compat_client = build_llm_compat_client(api_key=api_key, base_url=base_url or None)
    try:
        from agents import set_default_openai_api

        set_default_openai_api(str(getattr(runner_cfg, "agents_api", "") or "responses"))
    except Exception:  # noqa: BLE001
        pass
    if compat_client is not None:
        try:
            from agents import set_default_openai_client

            if callable(set_default_openai_client):
                set_default_openai_client(compat_client)
        except Exception:  # noqa: BLE001
            pass
    agent = Agent(name="CortexPilotPlanner", instructions=instructions, mcp_servers=[])

    async def _run() -> Any:
        model_name = get_runner_config().agents_model or "gemini-2.5-flash"
        result = Runner.run_streamed(
            agent,
            prompt,
            run_config=RunConfig(
                model=model_name,
                tracing_disabled=True,
                model_settings=ModelSettings(
                    extra_headers={"x-cortexpilot-intake": "plan_bundle"},
                    store=_resolve_agents_store(),
                ),
                call_model_input_filter=_strip_model_input_ids,
            ),
        )
        if hasattr(result, "stream_events"):
            async for _ in result.stream_events():
                pass
        return result

    result = asyncio.run(_run())
    output = getattr(result, "final_output", None)
    if not isinstance(output, str) or not output.strip():
        raise RuntimeError("planner output missing")
    try:
        payload = json.loads(output)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"planner output not json: {exc}") from exc
    if not isinstance(payload, dict):
        raise RuntimeError("planner output not object")
    return payload


# -------------------------------------------------------------------
# Public API
# -------------------------------------------------------------------


def generate_questions(payload: dict[str, Any]) -> list[str]:
    return _generation_helpers.generate_questions(
        payload,
        normalize_constraints=_normalize_constraints,
        default_questions=_default_questions,
        agents_available=_agents_available,
        run_agent=_run_agent,
    )


def generate_plan(payload: dict[str, Any], answers: list[str]) -> dict[str, Any]:
    return _generation_helpers.generate_plan(
        payload,
        answers,
        ensure_agent=_ensure_agent,
        default_owner=_DEFAULT_OWNER,
        normalize_constraints=_normalize_constraints,
        build_plan_fallback=_build_plan_fallback,
        agents_available=_agents_available,
        run_agent=_run_agent,
        validator_factory=ContractValidator,
    )


def generate_plan_bundle(payload: dict[str, Any], answers: list[str]) -> tuple[dict[str, Any], str]:
    return _generation_helpers.generate_plan_bundle(
        payload,
        answers,
        agents_available=_agents_available,
        run_agent=_run_agent,
        build_plan_bundle_fallback=_build_plan_bundle_fallback,
        normalize_constraints=_normalize_constraints,
        ensure_agent=_ensure_agent,
        default_tl=_DEFAULT_TL,
        plan_bundle_keys=_PLAN_BUNDLE_KEYS,
        now_ts=_now_ts,
        normalize_bundle_plan=_normalize_bundle_plan,
        extract_parallelism=_extract_parallelism,
        validate_plan_bundle_paths=_validate_plan_bundle_paths,
        rebalance_bundle_paths=_rebalance_bundle_paths,
        validator_factory=ContractValidator,
    )


def build_task_chain_from_bundle(plan_bundle: dict[str, Any], owner_agent: dict[str, str]) -> dict[str, Any]:
    return _generation_helpers.build_task_chain_from_bundle(
        plan_bundle,
        owner_agent,
        ensure_agent=_ensure_agent,
        default_tl=_DEFAULT_TL,
        fanin_allowed_paths=_FANIN_ALLOWED_PATHS,
    )


# -------------------------------------------------------------------
# Intake Service
# -------------------------------------------------------------------


class IntakeService:
    def __init__(self) -> None:
        self._store = IntakeStore()
        self._validator = ContractValidator()

    def create(self, payload: dict[str, Any]) -> dict[str, Any]:
        self._validator.validate_report(payload, "pm_intake_request.v1.json")
        normalized_payload = dict(payload)
        _apply_task_template_defaults(normalized_payload)
        preset, effective_policy, policy_notes = _resolve_intake_browser_policy(normalized_payload)
        normalized_payload["browser_policy_preset"] = preset
        normalized_payload["browser_policy"] = effective_policy
        normalized_payload["policy_notes"] = policy_notes
        intake_id = self._store.create(normalized_payload)
        questions = generate_questions(normalized_payload)
        response = {
            "intake_id": intake_id,
            "status": "NEEDS_INPUT",
            "questions": questions,
            "task_template": normalized_payload.get("task_template"),
            "template_payload": normalized_payload.get("template_payload"),
            "browser_policy_preset": preset,
            "effective_browser_policy": effective_policy,
            "policy_notes": policy_notes,
        }
        self._validator.validate_report(response, "pm_intake_response.v1.json")
        self._store.write_response(intake_id, response)
        return response

    def answer(self, intake_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        if not self._store.intake_exists(intake_id):
            return {"intake_id": intake_id, "status": "FAILED", "questions": [], "notes": "intake missing"}
        intake = self._store.read_intake(intake_id)
        if not intake:
            return {"intake_id": intake_id, "status": "FAILED", "questions": [], "notes": "intake missing"}
        answers = _normalize_answers(payload.get("answers") if isinstance(payload, dict) else None)
        redacted_answers = [_redact_answer(item) for item in answers]
        self._store.append_event(
            intake_id,
            {
                "event": "INTAKE_ANSWER",
                "context": {"answers": redacted_answers},
            },
        )
        plan = generate_plan(intake, answers)
        plan_bundle, bundle_note = generate_plan_bundle(intake, answers)
        auto_run_chain = True
        mock_chain = False
        if isinstance(payload, dict):
            if payload.get("auto_run_chain") is False:
                auto_run_chain = False
            mock_chain = bool(payload.get("mock_chain", False))
        try:
            self._validator.validate_report(plan, "plan.schema.json")
            self._validator.validate_report(plan_bundle, "plan_bundle.v1.json")
        except Exception as exc:  # noqa: BLE001
            response = {
                "intake_id": intake_id,
                "status": "FAILED",
                "questions": [],
                "notes": str(exc),
            }
            self._store.write_response(intake_id, response)
            return response
        task_chain: dict[str, Any] | None = None
        try:
            owner_agent = _ensure_agent(
                intake.get("owner_agent") if isinstance(intake, dict) else None,
                _DEFAULT_OWNER,
            )
            chain = build_task_chain_from_bundle(plan_bundle, owner_agent)
            self._validator.validate_report(chain, "task_chain.v1.json")
            task_chain = chain
        except Exception:
            task_chain = None
        response = {
            "intake_id": intake_id,
            "status": "READY",
            "questions": [],
            "plan": plan,
            "plan_bundle": plan_bundle,
            "task_template": intake.get("task_template") if isinstance(intake, dict) else None,
            "template_payload": intake.get("template_payload") if isinstance(intake, dict) else None,
            "browser_policy_preset": intake.get("browser_policy_preset") if isinstance(intake, dict) else "safe",
            "effective_browser_policy": intake.get("browser_policy") if isinstance(intake, dict) else None,
            "policy_notes": intake.get("policy_notes") if isinstance(intake, dict) else "",
        }
        if task_chain:
            response["task_chain"] = task_chain
            chain_path = self._store._intake_dir(intake_id) / "task_chain.json"
            chain_path.write_text(json.dumps(task_chain, ensure_ascii=False, indent=2), encoding="utf-8")
            response["task_chain_path"] = str(chain_path)
            if auto_run_chain:
                snapshot_env = dict(os.environ)
                try:
                    if not os.getenv("CORTEXPILOT_RUNNER"):
                        os.environ["CORTEXPILOT_RUNNER"] = "agents"
                    try:
                        chain_report = _execute_chain(chain_path, mock_chain)
                        response["chain_run_id"] = chain_report.get("run_id", "")
                        self._store.append_event(
                            intake_id,
                            {"event": "INTAKE_CHAIN_RUN", "run_id": response["chain_run_id"]},
                        )
                    except Exception as exc:  # noqa: BLE001
                        response["notes"] = f"{response.get('notes','')}\nchain_run_failed: {exc}".strip()
                finally:
                    os.environ.clear()
                    os.environ.update(snapshot_env)
        if bundle_note:
            existing = response.get("notes", "")
            response["notes"] = f"{existing}\n{bundle_note}".strip() if existing else bundle_note
        self._validator.validate_report(response, "pm_intake_response.v1.json")
        self._store.write_response(intake_id, response)
        return response

    def build_contract(self, intake_id: str) -> dict[str, Any] | None:
        if not self._store.intake_exists(intake_id):
            return None
        response = self._store.read_response(intake_id)
        plan = response.get("plan") if isinstance(response, dict) else None
        if not isinstance(plan, dict):
            return None
        contract = compile_plan(plan)
        intake = self._store.read_intake(intake_id)
        owner_role = (
            str(contract.get("owner_agent", {}).get("role", "")).strip().upper()
            if isinstance(contract.get("owner_agent"), dict)
            else ""
        )
        if owner_role == "PM":
            contract["handoff_chain"] = {"enabled": True, "roles": ["PM", "TECH_LEAD", "WORKER"]}
        task_template = intake.get("task_template") if isinstance(intake, dict) else None
        template_payload = intake.get("template_payload") if isinstance(intake, dict) else None
        if isinstance(task_template, str) and task_template.strip():
            contract["task_template"] = task_template.strip()
        if isinstance(template_payload, dict) and template_payload:
            contract["template_payload"] = template_payload
        browser_policy = intake.get("browser_policy") if isinstance(intake, dict) else None
        if isinstance(browser_policy, dict):
            contract["browser_policy"] = _compact_browser_policy(browser_policy)
        search_queries = intake.get("search_queries") if isinstance(intake, dict) else None
        if isinstance(task_template, str) and task_template.strip().lower() == _PAGE_BRIEF_TEMPLATE:
            intake_dir = self._store._intake_dir(intake_id)
            browser_path = intake_dir / "browser_requests.json"
            browser_payload: dict[str, Any] = {
                "headless": True,
                "task_template": _PAGE_BRIEF_TEMPLATE,
                "template_payload": template_payload if isinstance(template_payload, dict) else {},
                "tasks": [
                    {
                        "url": str((template_payload or {}).get("url") or "").strip(),
                        "script": PAGE_BRIEF_BROWSER_SCRIPT,
                    }
                ],
            }
            browser_text = json.dumps(browser_payload, ensure_ascii=False, indent=2)
            browser_path.write_text(browser_text, encoding="utf-8")
            sha = _sha256_text(browser_text)
            contract.setdefault("inputs", {})
            artifacts = contract["inputs"].get("artifacts") if isinstance(contract["inputs"], dict) else []
            if not isinstance(artifacts, list):
                artifacts = []
            contract["inputs"]["artifacts"] = artifacts
            contract["inputs"]["artifacts"].append(
                {
                    "name": "browser_requests.json",
                    "uri": str(browser_path),
                    "sha256": sha,
                }
            )
            return contract
        if isinstance(search_queries, list) and search_queries:
            intake_dir = self._store._intake_dir(intake_id)
            search_path = intake_dir / "search_requests.json"
            payload: dict[str, Any] = {"queries": search_queries}
            if isinstance(task_template, str) and task_template.strip():
                payload["task_template"] = task_template.strip()
            if isinstance(template_payload, dict) and template_payload:
                payload["template_payload"] = template_payload
            search_text = json.dumps(payload, ensure_ascii=False, indent=2)
            search_path.write_text(search_text, encoding="utf-8")
            sha = _sha256_text(search_text)
            contract.setdefault("inputs", {})
            artifacts = contract["inputs"].get("artifacts") if isinstance(contract["inputs"], dict) else []
            if not isinstance(artifacts, list):
                artifacts = []
            contract["inputs"]["artifacts"] = artifacts
            contract["inputs"]["artifacts"].append(
                {
                    "name": "search_requests.json",
                    "uri": str(search_path),
                    "sha256": sha,
                }
            )
            assigned_agent = (
                contract.get("assigned_agent") if isinstance(contract.get("assigned_agent"), dict) else {}
            )
            search_agent_id = str(assigned_agent.get("agent_id") or "agent-1").strip() or "agent-1"
            owner_agent = contract.get("owner_agent") if isinstance(contract.get("owner_agent"), dict) else {}
            if str(owner_agent.get("role") or "").strip().upper() == "PM":
                contract["owner_agent"] = {
                    **owner_agent,
                    "role": "TECH_LEAD",
                    "agent_id": search_agent_id,
                }
            contract["assigned_agent"] = {
                **assigned_agent,
                "role": "SEARCHER",
                "agent_id": search_agent_id,
            }
            tool_permissions = (
                contract.get("tool_permissions") if isinstance(contract.get("tool_permissions"), dict) else {}
            )
            allowed_mcp_tools = tool_permissions.get("mcp_tools") if isinstance(tool_permissions.get("mcp_tools"), list) else []
            normalized_mcp_tools = [str(item).strip() for item in allowed_mcp_tools if str(item).strip()]
            if "codex" not in normalized_mcp_tools:
                normalized_mcp_tools.append("codex")
            if "search" not in normalized_mcp_tools:
                normalized_mcp_tools.append("search")
            contract["tool_permissions"] = {
                **tool_permissions,
                "network": "allow",
                "mcp_tools": normalized_mcp_tools,
            }
            contract_mcp_tools = contract.get("mcp_tool_set") if isinstance(contract.get("mcp_tool_set"), list) else []
            normalized_contract_mcp_tools = [str(item).strip() for item in contract_mcp_tools if str(item).strip()]
            if "search" not in normalized_contract_mcp_tools:
                normalized_contract_mcp_tools.append("search")
            contract["mcp_tool_set"] = normalized_contract_mcp_tools
        return contract
