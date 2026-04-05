from __future__ import annotations

import json
from pathlib import Path

import pytest

from tooling.browser import session_manager as session_manager_module
from tooling.browser.session_manager import BrowserSessionManager


def test_session_manager_from_env_defaults_to_local_profile(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    chrome_root = tmp_path / "chrome-root"
    chrome_root.mkdir(parents=True, exist_ok=True)
    monkeypatch.delenv("CI", raising=False)
    monkeypatch.delenv("GITHUB_ACTIONS", raising=False)
    monkeypatch.delenv("CORTEXPILOT_CI_CONTAINER", raising=False)
    monkeypatch.delenv("CORTEXPILOT_CLEAN_ROOM_MACHINE_TMP_ROOT", raising=False)
    monkeypatch.delenv("CORTEXPILOT_CLEAN_ROOM_PRESERVE_ROOT", raising=False)
    monkeypatch.delenv("CORTEXPILOT_BROWSER_PROFILE_MODE", raising=False)
    monkeypatch.delenv("CORTEXPILOT_BROWSER_PROFILE_DIR", raising=False)
    monkeypatch.delenv("CORTEXPILOT_BROWSER_PROFILE_NAME", raising=False)
    monkeypatch.setattr(session_manager_module, "_default_chrome_profile_dir", lambda: chrome_root)

    manager = BrowserSessionManager.from_env(headless=True)

    assert manager.profile_mode == "allow_profile"
    assert manager.profile_dir == chrome_root
    assert manager.profile_name == "cortexpilot"


def test_session_manager_from_env_defaults_to_ephemeral_in_ci(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    chrome_root = tmp_path / "chrome-root"
    chrome_root.mkdir(parents=True, exist_ok=True)
    monkeypatch.setenv("GITHUB_ACTIONS", "true")
    monkeypatch.delenv("CORTEXPILOT_BROWSER_PROFILE_MODE", raising=False)
    monkeypatch.delenv("CORTEXPILOT_BROWSER_PROFILE_DIR", raising=False)
    monkeypatch.delenv("CORTEXPILOT_BROWSER_PROFILE_NAME", raising=False)
    monkeypatch.setattr(session_manager_module, "_default_chrome_profile_dir", lambda: chrome_root)

    manager = BrowserSessionManager.from_env(headless=True)

    assert manager.profile_mode == "ephemeral"
    assert manager.profile_dir is None
    assert manager.profile_name == "Default"


def test_session_manager_from_env_forces_ephemeral_even_when_allow_profile_is_requested(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    chrome_root = tmp_path / "chrome-root"
    chrome_root.mkdir(parents=True, exist_ok=True)
    monkeypatch.setenv("CORTEXPILOT_CI_CONTAINER", "1")
    monkeypatch.setenv("CORTEXPILOT_BROWSER_PROFILE_MODE", "allow_profile")
    monkeypatch.setenv("CORTEXPILOT_BROWSER_PROFILE_DIR", str(chrome_root))
    monkeypatch.setenv("CORTEXPILOT_BROWSER_PROFILE_NAME", "cortexpilot")
    monkeypatch.setattr(session_manager_module, "_default_chrome_profile_dir", lambda: chrome_root)

    manager = BrowserSessionManager.from_env(headless=True)

    assert manager.profile_mode == "ephemeral"
    assert manager.profile_dir is None
    assert manager.profile_name == "Default"


def test_open_page_allow_profile_prefers_real_chrome_and_resolves_display_name(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    chrome_root = tmp_path / "chrome-root"
    chrome_root.mkdir(parents=True, exist_ok=True)
    (chrome_root / "Profile 7").mkdir()
    local_state = {
        "profile": {
            "info_cache": {
                "Profile 7": {
                    "name": "cortexpilot",
                }
            }
        }
    }
    (chrome_root / "Local State").write_text(json.dumps(local_state), encoding="utf-8")
    monkeypatch.setenv("CHROME_PATH", "/preferred/chrome")
    monkeypatch.setattr(session_manager_module, "_is_executable_file", lambda path: str(path) == "/preferred/chrome")

    launch_calls: list[dict[str, object]] = []

    class _Page:
        pass

    class _Context:
        def new_page(self) -> _Page:
            return _Page()

        def close(self) -> None:
            return None

    class _Chromium:
        executable_path = "/runtime/chromium"

        def launch_persistent_context(self, **kwargs: object) -> _Context:
            launch_calls.append(kwargs)
            return _Context()

    class _Playwright:
        chromium = _Chromium()

    manager = BrowserSessionManager(
        headless=True,
        profile_mode="allow_profile",
        profile_dir=chrome_root,
        profile_name="cortexpilot",
        cookie_file=None,
        runtime_root=tmp_path / "runtime",
    )

    session = manager.open_page(_Playwright())

    assert session.metadata["profile_name"] == "cortexpilot"
    assert session.metadata["profile_directory"] == "Profile 7"
    assert session.metadata["chrome_executable_path"] == "/preferred/chrome"
    assert launch_calls == [
        {
            "user_data_dir": str(chrome_root),
            "headless": True,
            "args": ["--profile-directory=Profile 7"],
            "executable_path": "/preferred/chrome",
        }
    ]


def test_open_page_allow_profile_fails_closed_without_real_chrome(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    chrome_root = tmp_path / "chrome-root"
    chrome_root.mkdir(parents=True, exist_ok=True)
    (chrome_root / "Default").mkdir()

    class _Playwright:
        chromium = object()

    monkeypatch.setattr(session_manager_module, "_resolve_real_chrome_executable_path", lambda: "")

    manager = BrowserSessionManager(
        headless=False,
        profile_mode="allow_profile",
        profile_dir=chrome_root,
        profile_name="Default",
        cookie_file=None,
        runtime_root=tmp_path / "runtime",
    )

    with pytest.raises(RuntimeError, match="real Chrome executable not found"):
        manager.open_page(_Playwright())


def test_open_page_allow_profile_fails_closed_when_profile_name_cannot_be_resolved(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    chrome_root = tmp_path / "chrome-root"
    chrome_root.mkdir(parents=True, exist_ok=True)
    (chrome_root / "Local State").write_text(json.dumps({"profile": {"info_cache": {}}}), encoding="utf-8")
    monkeypatch.setattr(session_manager_module, "_resolve_real_chrome_executable_path", lambda: "/preferred/chrome")

    class _Playwright:
        chromium = object()

    manager = BrowserSessionManager(
        headless=True,
        profile_mode="allow_profile",
        profile_dir=chrome_root,
        profile_name="cortexpilot",
        cookie_file=None,
        runtime_root=tmp_path / "runtime",
    )

    with pytest.raises(RuntimeError, match="chrome profile directory not found"):
        manager.open_page(_Playwright())
