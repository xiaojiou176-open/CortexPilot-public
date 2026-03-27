from __future__ import annotations

import json
import importlib.util
import sys
import types
from pathlib import Path
from urllib.parse import urlparse

import pytest


SCRIPT_PATH = Path(__file__).resolve().parents[3] / "scripts" / "e2e_external_web_probe.py"


def _install_fake_playwright_sync_api(monkeypatch: pytest.MonkeyPatch) -> None:
    playwright_module = types.ModuleType("playwright")
    sync_api_module = types.ModuleType("playwright.sync_api")

    class DummyTimeoutError(Exception):
        pass

    def _unexpected_sync_playwright() -> None:
        raise AssertionError("sync_playwright should not be used in these unit tests")

    setattr(sync_api_module, "TimeoutError", DummyTimeoutError)
    setattr(sync_api_module, "sync_playwright", _unexpected_sync_playwright)
    setattr(playwright_module, "sync_api", sync_api_module)
    monkeypatch.setitem(sys.modules, "playwright", playwright_module)
    monkeypatch.setitem(sys.modules, "playwright.sync_api", sync_api_module)


def _load_probe_module(monkeypatch: pytest.MonkeyPatch):
    _install_fake_playwright_sync_api(monkeypatch)
    spec = importlib.util.spec_from_file_location("e2e_external_web_probe", SCRIPT_PATH)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


@pytest.mark.parametrize(
    ("env_vars", "expected_env_name"),
    [
        ({"ANTHROPIC_API_KEY": "anthropic-only"}, ""),
        (
            {
                "GEMINI_API_KEY": "gemini-key",
                "OPENAI_API_KEY": "openai-key",
                "ANTHROPIC_API_KEY": "anthropic-key",
            },
            "GEMINI_API_KEY",
        ),
        (
            {
                "OPENAI_API_KEY": "openai-key",
                "ANTHROPIC_API_KEY": "anthropic-key",
            },
            "OPENAI_API_KEY",
        ),
    ],
)
def test_resolve_provider_probe_key_uses_supported_providers_only(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
    env_vars: dict[str, str],
    expected_env_name: str,
) -> None:
    module = _load_probe_module(monkeypatch)
    monkeypatch.chdir(tmp_path)
    monkeypatch.setattr(module, "shutil_which", lambda _name: False)
    fake_home = tmp_path / "home"
    fake_home.mkdir(parents=True, exist_ok=True)
    monkeypatch.setattr(module.Path, "home", staticmethod(lambda: fake_home))

    for key_name in ("GEMINI_API_KEY", "OPENAI_API_KEY", "ANTHROPIC_API_KEY"):
        monkeypatch.delenv(key_name, raising=False)
    for key_name, value in env_vars.items():
        monkeypatch.setenv(key_name, value)

    resolved = module._resolve_provider_probe_key()

    assert resolved["env_name"] == expected_env_name
    if expected_env_name:
        assert resolved["value"] == env_vars[expected_env_name]
        assert resolved["source"] == "process_env"
    else:
        assert resolved["value"] == ""
        assert resolved["source"] == "none"


def test_resolve_provider_probe_key_ignores_dotenv_and_shell_fallback_in_mainline_context(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    module = _load_probe_module(monkeypatch)
    monkeypatch.chdir(tmp_path)
    monkeypatch.setenv("CI", "1")
    monkeypatch.setattr(module, "shutil_which", lambda _name: True)
    fake_home = tmp_path / "home"
    fake_home.mkdir(parents=True, exist_ok=True)
    monkeypatch.setattr(module.Path, "home", staticmethod(lambda: fake_home))
    (tmp_path / ".env").write_text("GEMINI_API_KEY=from-dotenv\n", encoding="utf-8")

    resolved = module._resolve_provider_probe_key()

    assert resolved["env_name"] == ""
    assert resolved["value"] == ""
    assert resolved["source"] == "none"


def test_resolve_provider_probe_target_prefers_codex_config_for_custom_openai_compatible_provider(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    module = _load_probe_module(monkeypatch)
    fake_home = tmp_path / "home"
    codex_dir = fake_home / ".codex"
    codex_dir.mkdir(parents=True, exist_ok=True)
    (codex_dir / "config.toml").write_text(
        """
model_provider = "cliproxyapi"

[model_providers.cliproxyapi]
base_url = "http://127.0.0.1:18317/v1"
experimental_bearer_token = "${OPENAI_API_KEY}"
""".strip()
        + "\n",
        encoding="utf-8",
    )
    monkeypatch.setattr(module.Path, "home", staticmethod(lambda: fake_home))
    monkeypatch.delenv("CORTEXPILOT_PROVIDER", raising=False)
    monkeypatch.delenv("CORTEXPILOT_PROVIDER_BASE_URL", raising=False)

    resolved = module._resolve_provider_probe_target()

    assert resolved["provider"] == "cliproxyapi"
    assert resolved["base_url"] == "http://127.0.0.1:18317/v1"
    assert resolved["source"] == "codex_config"


def test_resolve_provider_probe_key_uses_codex_config_env_key_for_custom_provider(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    module = _load_probe_module(monkeypatch)
    fake_home = tmp_path / "home"
    codex_dir = fake_home / ".codex"
    codex_dir.mkdir(parents=True, exist_ok=True)
    (codex_dir / "config.toml").write_text(
        """
model_provider = "cliproxyapi"

[model_providers.cliproxyapi]
base_url = "http://127.0.0.1:18317/v1"
env_key = "CLIPROXYAPI_TOKEN"
""".strip()
        + "\n",
        encoding="utf-8",
    )
    monkeypatch.setattr(module.Path, "home", staticmethod(lambda: fake_home))
    monkeypatch.setattr(module, "shutil_which", lambda _name: False)
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.setenv("CLIPROXYAPI_TOKEN", "proxy-token")

    resolved = module._resolve_provider_probe_key()

    assert resolved["env_name"] == "CLIPROXYAPI_TOKEN"
    assert resolved["value"] == "proxy-token"
    assert resolved["source"] == "codex_config_env_key"


def test_resolve_provider_probe_key_uses_codex_config_bearer_token_for_custom_provider(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    module = _load_probe_module(monkeypatch)
    fake_home = tmp_path / "home"
    codex_dir = fake_home / ".codex"
    codex_dir.mkdir(parents=True, exist_ok=True)
    (codex_dir / "config.toml").write_text(
        """
model_provider = "cliproxyapi"

[model_providers.cliproxyapi]
base_url = "http://127.0.0.1:18317/v1"
experimental_bearer_token = "${LOCAL_PROXY_TOKEN}"
""".strip()
        + "\n",
        encoding="utf-8",
    )
    monkeypatch.setattr(module.Path, "home", staticmethod(lambda: fake_home))
    monkeypatch.setattr(module, "shutil_which", lambda _name: False)
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.setenv("LOCAL_PROXY_TOKEN", "proxy-token")

    resolved = module._resolve_provider_probe_key()

    assert resolved["env_name"] == "LOCAL_PROXY_TOKEN"
    assert resolved["value"] == "proxy-token"
    assert resolved["source"] == "codex_config_env:LOCAL_PROXY_TOKEN"


def test_write_json_redacts_sensitive_values(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    module = _load_probe_module(monkeypatch)
    output = tmp_path / "probe.json"

    module._write_report_json(
        output,
        run_id="probe-1",
        started_at="2026-03-25T00:00:00Z",
        finished_at="2026-03-25T00:00:01Z",
        success=False,
        failure_stage="provider_api_probe",
        failure_category="provider_probe_failure",
        title="Bearer supersecret",
        artifacts={
            "report": "https://user:pass@example.com/v1/models?token=abc",
            "secret_hint": "should-not-leak",
        },
    )

    payload = json.loads(output.read_text(encoding="utf-8"))
    serialized = json.dumps(payload, ensure_ascii=False)
    assert "user:pass" not in serialized
    assert "supersecret" not in serialized
    assert "should-not-leak" not in serialized
