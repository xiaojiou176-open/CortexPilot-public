from __future__ import annotations

import importlib
import json
import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any, Mapping


PROVIDER_UNSUPPORTED_ERROR = "PROVIDER_UNSUPPORTED"
_PROVIDER_ALIASES = {
    "gemini": "gemini",
    "google": "gemini",
    "google-genai": "gemini",
    "google_genai": "gemini",
    "openai": "openai",
    "openai-compatible": "openai",
    "openai_compatible": "openai",
    "oai": "openai",
    "anthropic": "anthropic",
    "claude": "anthropic",
    "anthropic-claude": "anthropic",
    "anthropic_claude": "anthropic",
}
_PROVIDER_ENV_KEYS = (
    "CORTEXPILOT_PROVIDER",
)
_PROVIDER_BASE_URL_ENV_KEYS = (
    "CORTEXPILOT_PROVIDER_BASE_URL",
)
_PROVIDER_MODEL_ENV_KEYS = (
    "CORTEXPILOT_PROVIDER_MODEL",
)
_PROVIDER_DEFAULT_MODELS = {
    "gemini": "gemini-2.5-flash",
    "openai": "gpt-4o-mini",
    "anthropic": "claude-3-5-sonnet-latest",
}
_LITELLM_ENABLE_ENV_KEYS = ("CORTEXPILOT_PROVIDER_USE_LITELLM",)
_REPO_ROOT = Path(__file__).resolve().parents[5]


class ProviderResolutionError(RuntimeError):
    def __init__(self, code: str, message: str) -> None:
        self.code = code
        super().__init__(f"[{code}] {message}")


@dataclass(frozen=True)
class ProviderCredentials:
    # Runtime credential source supports Gemini/OpenAI/Anthropic providers.
    gemini_api_key: str
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    equilibrium_api_key: str = ""


@dataclass(frozen=True)
class LiteLLMCompatClient:
    # Minimal compatibility wrapper to indicate LiteLLM route is active.
    api_key: str
    base_url: str | None = None
    timeout: float | None = None
    max_retries: int | None = None


@lru_cache(maxsize=1)
def _provider_gateway_ids() -> set[str]:
    inventory_path = _REPO_ROOT / "configs" / "upstream_inventory.json"
    if not inventory_path.exists():
        return set()
    try:
        payload = json.loads(inventory_path.read_text(encoding="utf-8"))
    except Exception:
        return set()
    upstreams = payload.get("upstreams")
    if not isinstance(upstreams, list):
        return set()
    gateways: set[str] = set()
    for entry in upstreams:
        if not isinstance(entry, dict):
            continue
        upstream_id = str(entry.get("id") or "").strip().lower()
        if upstream_id.startswith("provider-gateway:"):
            gateways.add(upstream_id.split(":", 1)[1].strip())
    return gateways


def resolve_provider_credentials(env: Mapping[str, str] | None = None) -> ProviderCredentials:
    source = os.environ if env is None else env
    gemini_api_key = str(source.get("GEMINI_API_KEY", "")).strip()
    openai_api_key = str(source.get("OPENAI_API_KEY", "")).strip()
    anthropic_api_key = str(source.get("ANTHROPIC_API_KEY", "")).strip()
    equilibrium_api_key = str(source.get("CORTEXPILOT_EQUILIBRIUM_API_KEY", "")).strip()
    return ProviderCredentials(
        gemini_api_key=gemini_api_key,
        openai_api_key=openai_api_key,
        anthropic_api_key=anthropic_api_key,
        equilibrium_api_key=equilibrium_api_key,
    )


def resolve_preferred_api_key(credentials: ProviderCredentials, provider: str | None = None) -> str:
    requested_provider = resolve_runtime_provider(provider or resolve_runtime_provider_from_env())
    ordered_keys: tuple[str, ...]
    if requested_provider == "openai":
        ordered_keys = (
            credentials.openai_api_key,
            credentials.gemini_api_key,
            credentials.anthropic_api_key,
        )
    elif requested_provider == "anthropic":
        ordered_keys = (
            credentials.anthropic_api_key,
            credentials.gemini_api_key,
            credentials.openai_api_key,
        )
    elif requested_provider not in {"gemini", "openai", "anthropic"}:
        # Custom providers are OpenAI-compatible by contract; prefer gateway/openai-style key first.
        ordered_keys = (
            credentials.equilibrium_api_key,
            credentials.openai_api_key,
            credentials.gemini_api_key,
            credentials.anthropic_api_key,
        )
    else:
        ordered_keys = (
            credentials.gemini_api_key,
            credentials.openai_api_key,
            credentials.anthropic_api_key,
        )
    for key in ordered_keys:
        if str(key).strip():
            return str(key).strip()
    return ""


def merge_provider_credentials(primary: ProviderCredentials, fallback: ProviderCredentials) -> ProviderCredentials:
    return ProviderCredentials(
        gemini_api_key=primary.gemini_api_key or fallback.gemini_api_key,
        openai_api_key=primary.openai_api_key or fallback.openai_api_key,
        anthropic_api_key=primary.anthropic_api_key or fallback.anthropic_api_key,
        equilibrium_api_key=primary.equilibrium_api_key or fallback.equilibrium_api_key,
    )


def resolve_runtime_provider(raw_provider: str | None) -> str:
    candidate = str(raw_provider or "").strip().lower()
    if not candidate:
        return "gemini"
    normalized = _PROVIDER_ALIASES.get(candidate)
    if normalized:
        return normalized
    if candidate in _provider_gateway_ids():
        return candidate
    raise ProviderResolutionError(
        PROVIDER_UNSUPPORTED_ERROR,
        f"provider `{candidate}` is not allowlisted; register provider-gateway:{candidate} first",
    )


def resolve_provider_inventory_id(provider: str | None) -> str:
    normalized = resolve_runtime_provider(provider)
    if normalized in {"gemini", "openai", "anthropic"}:
        return f"provider:{normalized}"
    if normalized in _provider_gateway_ids():
        return f"provider-gateway:{normalized}"
    raise ProviderResolutionError(
        PROVIDER_UNSUPPORTED_ERROR,
        f"provider `{normalized}` is not registered in configs/upstream_inventory.json",
    )


def resolve_runtime_provider_from_env(env: Mapping[str, str] | None = None) -> str:
    source = os.environ if env is None else env
    for key in _PROVIDER_ENV_KEYS:
        candidate = str(source.get(key, "")).strip()
        if candidate:
            return resolve_runtime_provider(candidate)
    return "gemini"


def resolve_runtime_provider_from_contract(
    contract: Mapping[str, Any] | None,
    env: Mapping[str, str] | None = None,
) -> str:
    runtime_options = contract.get("runtime_options") if isinstance(contract, Mapping) else None
    if isinstance(runtime_options, Mapping):
        candidate = str(runtime_options.get("provider", "")).strip()
        if candidate:
            return resolve_runtime_provider(candidate)
    return resolve_runtime_provider_from_env(env)


def resolve_runtime_base_url_from_env(env: Mapping[str, str] | None = None) -> str:
    source = os.environ if env is None else env
    for key in _PROVIDER_BASE_URL_ENV_KEYS:
        value = str(source.get(key, "")).strip()
        if value:
            return value
    return ""


def resolve_runtime_model_from_env(provider: str | None = None, env: Mapping[str, str] | None = None) -> str:
    source = os.environ if env is None else env
    for key in _PROVIDER_MODEL_ENV_KEYS:
        value = str(source.get(key, "")).strip()
        if value:
            return value
    return _PROVIDER_DEFAULT_MODELS.get(resolve_runtime_provider(provider), _PROVIDER_DEFAULT_MODELS["gemini"])


def _env_flag(
    name: str,
    *,
    default: bool = False,
    env: Mapping[str, str] | None = None,
) -> bool:
    source = os.environ if env is None else env
    raw = str(source.get(name, "")).strip().lower()
    if not raw:
        return default
    return raw in {"1", "true", "yes", "on"}


def use_litellm_provider_path(env: Mapping[str, str] | None = None) -> bool:
    for key in _LITELLM_ENABLE_ENV_KEYS:
        if _env_flag(key, env=env):
            return True
    return False


def _build_litellm_compat_client(
    *,
    api_key: str,
    base_url: str | None = None,
    timeout: float | None = None,
    max_retries: int | None = None,
) -> LiteLLMCompatClient | None:
    try:
        litellm_module = importlib.import_module("litellm")
    except Exception:
        return None
    # Guard: litellm package import is required before declaring LiteLLM route active.
    if getattr(litellm_module, "acompletion", None) is None and getattr(litellm_module, "completion", None) is None:
        return None
    # Agents SDK requires an AsyncOpenAI-compatible client with `.responses.create(...)`.
    # LiteLLM package import alone does not provide such an object here, so keep fallback path.
    return None


def build_llm_compat_client(
    *,
    api_key: str,
    base_url: str | None = None,
    timeout: float | None = None,
    max_retries: int | None = None,
    env: Mapping[str, str] | None = None,
) -> Any | None:
    if use_litellm_provider_path(env):
        litellm_client = _build_litellm_compat_client(
            api_key=api_key,
            base_url=base_url,
            timeout=timeout,
            max_retries=max_retries,
        )
        if litellm_client is not None:
            return litellm_client
    try:
        openai_module = importlib.import_module("openai")
    except Exception:
        return None
    async_openai = getattr(openai_module, "AsyncOpenAI", None)
    if async_openai is None:
        return None
    kwargs: dict[str, Any] = {"api_key": api_key, "base_url": base_url}
    if timeout is not None:
        kwargs["timeout"] = timeout
    if max_retries is not None:
        kwargs["max_retries"] = max_retries
    return async_openai(**kwargs)


def build_openai_compatible_client(
    *,
    api_key: str,
    base_url: str | None = None,
    timeout: float | None = None,
    max_retries: int | None = None,
) -> Any | None:
    # Backward-compatible alias; keep OpenAI naming scoped to compatibility layer.
    return build_llm_compat_client(
        api_key=api_key,
        base_url=base_url,
        timeout=timeout,
        max_retries=max_retries,
    )
