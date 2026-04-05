from __future__ import annotations

import json
from pathlib import Path

import pytest

from tooling.browser import repo_chrome_singleton as singleton_module


def test_build_repo_local_state_rewrites_to_single_profile() -> None:
    source_payload = {
        "profile": {
            "last_used": "Profile 22",
            "last_active_profiles": ["Profile 22", "Profile 3"],
            "profiles_order": ["Profile 22", "Profile 3"],
            "info_cache": {
                "Profile 22": {"name": "cortexpilot", "gaia_name": "Example"},
                "Profile 3": {"name": "other"},
            },
        },
        "browser": {"theme": "keep-me"},
    }

    rewritten = singleton_module.build_repo_local_state(
        source_payload,
        source_profile_directory="Profile 22",
        target_profile_directory="Profile 1",
        display_name="cortexpilot",
    )

    profile_payload = rewritten["profile"]
    assert profile_payload["last_used"] == "Profile 1"
    assert profile_payload["last_active_profiles"] == ["Profile 1"]
    assert profile_payload["profiles_order"] == ["Profile 1"]
    assert profile_payload["info_cache"] == {
        "Profile 1": {"name": "cortexpilot", "gaia_name": "Example"}
    }
    assert rewritten["browser"] == {"theme": "keep-me"}


def test_migrate_default_chrome_profile_copies_only_local_state_and_target_profile(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    source_root = tmp_path / "source-chrome"
    target_root = tmp_path / "repo-browser" / "chrome-user-data"
    source_profile = source_root / "Profile 22"
    source_profile.mkdir(parents=True, exist_ok=True)
    (source_profile / "Preferences").write_text("{}", encoding="utf-8")
    (source_root / "Local State").write_text(
        json.dumps({"profile": {"info_cache": {"Profile 22": {"name": "cortexpilot"}}, "last_used": "Profile 22"}}),
        encoding="utf-8",
    )
    (source_root / "SingletonLock").write_text("lock", encoding="utf-8")
    (source_root / "Other Root File").write_text("do-not-copy", encoding="utf-8")
    monkeypatch.setattr(singleton_module, "chrome_processes_using_default_root", lambda: [])
    monkeypatch.setattr(singleton_module, "find_chrome_process_by_user_data_dir", lambda _path: None)

    result = singleton_module.migrate_default_chrome_profile(
        source_root=source_root,
        source_profile_name="cortexpilot",
        target_root=target_root,
    )

    assert result["status"] == "migrated"
    assert (target_root / "Local State").exists() is True
    assert (target_root / "Profile 1" / "Preferences").exists() is True
    assert (target_root / "Other Root File").exists() is False
    assert (target_root / "SingletonLock").exists() is False
    local_state = json.loads((target_root / "Local State").read_text(encoding="utf-8"))
    assert local_state["profile"]["last_used"] == "Profile 1"
    assert set(local_state["profile"]["info_cache"]) == {"Profile 1"}


def test_migrate_default_chrome_profile_returns_already_bootstrapped(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    source_root = tmp_path / "source-chrome"
    target_root = tmp_path / "repo-browser" / "chrome-user-data"
    source_root.mkdir(parents=True, exist_ok=True)
    target_root.mkdir(parents=True, exist_ok=True)
    (source_root / "Local State").write_text(
        json.dumps({"profile": {"info_cache": {"Profile 22": {"name": "cortexpilot"}}}}),
        encoding="utf-8",
    )
    (target_root / "Local State").write_text(
        json.dumps({"profile": {"info_cache": {"Profile 1": {"name": "cortexpilot"}}, "last_used": "Profile 1"}}),
        encoding="utf-8",
    )
    (target_root / "Profile 1").mkdir()
    monkeypatch.setattr(singleton_module, "chrome_processes_using_default_root", lambda: [])
    monkeypatch.setattr(singleton_module, "find_chrome_process_by_user_data_dir", lambda _path: None)

    result = singleton_module.migrate_default_chrome_profile(
        source_root=source_root,
        source_profile_name="cortexpilot",
        target_root=target_root,
    )

    assert result["status"] == "already_bootstrapped"


def test_migrate_default_chrome_profile_fails_when_default_root_is_active(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    source_root = tmp_path / "source-chrome"
    source_root.mkdir(parents=True, exist_ok=True)
    (source_root / "Local State").write_text(
        json.dumps({"profile": {"info_cache": {"Profile 22": {"name": "cortexpilot"}}}}),
        encoding="utf-8",
    )
    monkeypatch.setattr(
        singleton_module,
        "chrome_processes_using_default_root",
        lambda: [
            singleton_module.ChromeProcessInfo(
                pid=999,
                args="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
                user_data_dir=None,
                remote_debugging_port=None,
                uses_default_root=True,
            )
        ],
    )

    with pytest.raises(RuntimeError, match="default Chrome root is still active"):
        singleton_module.migrate_default_chrome_profile(
            source_root=source_root,
            source_profile_name="cortexpilot",
            target_root=tmp_path / "target",
        )


def test_ensure_repo_chrome_singleton_attaches_existing_matching_port(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    user_data_dir = tmp_path / "browser" / "chrome-user-data"
    (user_data_dir / "Profile 1").mkdir(parents=True, exist_ok=True)
    (user_data_dir / "Local State").write_text(
        json.dumps({"profile": {"info_cache": {"Profile 1": {"name": "cortexpilot"}}, "last_used": "Profile 1"}}),
        encoding="utf-8",
    )
    monkeypatch.setattr(
        singleton_module,
        "read_cdp_version",
        lambda host, port, timeout_sec=0.5: {"Browser": "Chrome", "webSocketDebuggerUrl": "ws://127.0.0.1/devtools/browser/1"},
    )
    monkeypatch.setattr(singleton_module, "_is_executable_file", lambda path: str(path) == "/preferred/chrome")
    monkeypatch.setattr(
        singleton_module,
        "find_chrome_process_by_remote_debugging_port",
        lambda port: singleton_module.ChromeProcessInfo(
            pid=123,
            args="chrome --user-data-dir=/tmp/repo --remote-debugging-port=9341",
            user_data_dir=str(user_data_dir),
            remote_debugging_port=port,
            uses_default_root=False,
        ),
    )

    instance = singleton_module.ensure_repo_chrome_singleton(
        chrome_executable_path="/preferred/chrome",
        user_data_dir=user_data_dir,
        profile_name="cortexpilot",
        cdp_host="127.0.0.1",
        cdp_port=9341,
        requested_headless=True,
    )

    assert instance.connection_mode == "attached"
    assert instance.profile_directory == "Profile 1"
    assert instance.requested_headless is True
    assert instance.actual_headless is False


def test_ensure_repo_chrome_singleton_launches_when_no_instance_exists(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    user_data_dir = tmp_path / "browser" / "chrome-user-data"
    (user_data_dir / "Profile 1").mkdir(parents=True, exist_ok=True)
    (user_data_dir / "Local State").write_text(
        json.dumps({"profile": {"info_cache": {"Profile 1": {"name": "cortexpilot"}}, "last_used": "Profile 1"}}),
        encoding="utf-8",
    )
    launches: list[list[str]] = []

    class _Proc:
        pid = 777

    monkeypatch.setattr(singleton_module, "read_cdp_version", lambda host, port, timeout_sec=0.5: None)
    monkeypatch.setattr(singleton_module, "_is_executable_file", lambda path: str(path) == "/preferred/chrome")
    monkeypatch.setattr(singleton_module, "find_chrome_process_by_remote_debugging_port", lambda port: None)
    monkeypatch.setattr(singleton_module, "find_chrome_process_by_user_data_dir", lambda root: None)
    monkeypatch.setattr(singleton_module, "wait_for_cdp_version", lambda host, port, timeout_sec=15.0, poll_sec=0.25: {"ok": True})
    monkeypatch.setattr(
        singleton_module.subprocess,
        "Popen",
        lambda args, stdout, stderr, start_new_session: launches.append(args) or _Proc(),
    )

    instance = singleton_module.ensure_repo_chrome_singleton(
        chrome_executable_path="/preferred/chrome",
        user_data_dir=user_data_dir,
        profile_name="cortexpilot",
        cdp_host="127.0.0.1",
        cdp_port=9341,
        extra_launch_args=["--disable-blink-features=AutomationControlled"],
    )

    assert instance.connection_mode == "launched"
    assert launches and f"--user-data-dir={user_data_dir.resolve()}" in launches[0]
    assert "--profile-directory=Profile 1" in launches[0]
    assert "--remote-debugging-port=9341" in launches[0]


def test_ensure_repo_chrome_singleton_retries_via_open_on_macos_when_direct_launch_never_binds(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    user_data_dir = tmp_path / "browser" / "chrome-user-data"
    (user_data_dir / "Profile 1").mkdir(parents=True, exist_ok=True)
    (user_data_dir / "Local State").write_text(
        json.dumps({"profile": {"info_cache": {"Profile 1": {"name": "cortexpilot"}}, "last_used": "Profile 1"}}),
        encoding="utf-8",
    )
    launches: list[list[str]] = []
    state = {"phase": "before_retry"}

    class _Proc:
        pid = 888

    def _wait_for_cdp(host: str, port: int, timeout_sec: float = 15.0, poll_sec: float = 0.25) -> dict[str, bool]:
        if state["phase"] == "before_retry":
            state["phase"] = "after_first_fail"
            raise RuntimeError("Chrome CDP endpoint did not become ready")
        state["phase"] = "ready"
        return {"ok": True}

    def _find_by_port(port: int) -> singleton_module.ChromeProcessInfo | None:
        if state["phase"] != "ready":
            return None
        return singleton_module.ChromeProcessInfo(
            pid=999,
            args=f"chrome --user-data-dir={user_data_dir} --remote-debugging-port=9341",
            user_data_dir=str(user_data_dir),
            remote_debugging_port=port,
            uses_default_root=False,
        )

    monkeypatch.setattr(singleton_module.sys, "platform", "darwin")
    monkeypatch.setattr(
        singleton_module,
        "_is_executable_file",
        lambda path: str(path) == "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    )
    monkeypatch.setattr(singleton_module, "read_cdp_version", lambda host, port, timeout_sec=0.5: None)
    monkeypatch.setattr(singleton_module, "find_chrome_process_by_user_data_dir", lambda root: None)
    monkeypatch.setattr(singleton_module, "find_chrome_process_by_remote_debugging_port", _find_by_port)
    monkeypatch.setattr(singleton_module, "wait_for_cdp_version", _wait_for_cdp)
    monkeypatch.setattr(
        singleton_module,
        "_launch_chrome_process",
        lambda args: launches.append(args) or _Proc(),
    )

    instance = singleton_module.ensure_repo_chrome_singleton(
        chrome_executable_path="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        user_data_dir=user_data_dir,
        profile_name="cortexpilot",
        cdp_host="127.0.0.1",
        cdp_port=9341,
    )

    assert instance.connection_mode == "launched"
    assert launches[0][0] == "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    assert launches[1][:4] == ["open", "-na", "/Applications/Google Chrome.app", "--args"]
    assert "--remote-debugging-port=9341" in launches[1]


def test_ensure_repo_chrome_singleton_fails_when_other_root_owns_port(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    user_data_dir = tmp_path / "browser" / "chrome-user-data"
    (user_data_dir / "Profile 1").mkdir(parents=True, exist_ok=True)
    (user_data_dir / "Local State").write_text(
        json.dumps({"profile": {"info_cache": {"Profile 1": {"name": "cortexpilot"}}, "last_used": "Profile 1"}}),
        encoding="utf-8",
    )
    monkeypatch.setattr(
        singleton_module,
        "read_cdp_version",
        lambda host, port, timeout_sec=0.5: {"Browser": "Chrome"},
    )
    monkeypatch.setattr(singleton_module, "_is_executable_file", lambda path: str(path) == "/preferred/chrome")
    monkeypatch.setattr(
        singleton_module,
        "find_chrome_process_by_remote_debugging_port",
        lambda port: singleton_module.ChromeProcessInfo(
            pid=321,
            args="chrome --user-data-dir=/tmp/other --remote-debugging-port=9341",
            user_data_dir="/tmp/other",
            remote_debugging_port=port,
            uses_default_root=False,
        ),
    )

    with pytest.raises(RuntimeError, match="already owns the configured CDP port"):
        singleton_module.ensure_repo_chrome_singleton(
            chrome_executable_path="/preferred/chrome",
            user_data_dir=user_data_dir,
            profile_name="cortexpilot",
            cdp_host="127.0.0.1",
            cdp_port=9341,
        )


def test_ensure_repo_chrome_singleton_relaunches_same_root_from_legacy_port(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    user_data_dir = tmp_path / "browser" / "chrome-user-data"
    (user_data_dir / "Profile 1").mkdir(parents=True, exist_ok=True)
    (user_data_dir / "Local State").write_text(
        json.dumps({"profile": {"info_cache": {"Profile 1": {"name": "cortexpilot"}}, "last_used": "Profile 1"}}),
        encoding="utf-8",
    )
    launches: list[list[str]] = []
    stopped: list[int] = []

    class _Proc:
        pid = 555

    monkeypatch.setattr(singleton_module, "_is_executable_file", lambda path: str(path) == "/preferred/chrome")
    monkeypatch.setattr(singleton_module, "read_cdp_version", lambda host, port, timeout_sec=0.5: None)
    monkeypatch.setattr(singleton_module, "find_chrome_process_by_remote_debugging_port", lambda port: None)
    monkeypatch.setattr(
        singleton_module,
        "find_chrome_process_by_user_data_dir",
        lambda root: singleton_module.ChromeProcessInfo(
            pid=444,
            args=f"chrome --user-data-dir={user_data_dir} --remote-debugging-port=9334",
            user_data_dir=str(user_data_dir),
            remote_debugging_port=9334,
            uses_default_root=False,
        ),
    )
    monkeypatch.setattr(
        singleton_module,
        "_stop_repo_owned_root_process_for_relaunch",
        lambda process, timeout_sec=10.0: stopped.append(process.pid),
    )
    monkeypatch.setattr(singleton_module, "wait_for_cdp_version", lambda host, port, timeout_sec=15.0, poll_sec=0.25: {"ok": True})
    monkeypatch.setattr(
        singleton_module.subprocess,
        "Popen",
        lambda args, stdout, stderr, start_new_session: launches.append(args) or _Proc(),
    )

    instance = singleton_module.ensure_repo_chrome_singleton(
        chrome_executable_path="/preferred/chrome",
        user_data_dir=user_data_dir,
        profile_name="cortexpilot",
        cdp_host="127.0.0.1",
        cdp_port=9341,
    )

    assert stopped == [444]
    assert launches and "--remote-debugging-port=9341" in launches[0]
    assert instance.connection_mode == "launched"
    assert instance.cdp_port == 9341


def test_ensure_repo_chrome_singleton_keeps_legacy_process_when_new_port_is_foreign(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    user_data_dir = tmp_path / "browser" / "chrome-user-data"
    (user_data_dir / "Profile 1").mkdir(parents=True, exist_ok=True)
    (user_data_dir / "Local State").write_text(
        json.dumps({"profile": {"info_cache": {"Profile 1": {"name": "cortexpilot"}}, "last_used": "Profile 1"}}),
        encoding="utf-8",
    )
    stopped: list[int] = []

    monkeypatch.setattr(singleton_module, "_is_executable_file", lambda path: str(path) == "/preferred/chrome")
    monkeypatch.setattr(singleton_module, "read_cdp_version", lambda host, port, timeout_sec=0.5: None)
    monkeypatch.setattr(
        singleton_module,
        "find_chrome_process_by_remote_debugging_port",
        lambda port: singleton_module.ChromeProcessInfo(
            pid=999,
            args="chrome --user-data-dir=/tmp/foreign --remote-debugging-port=9341",
            user_data_dir="/tmp/foreign",
            remote_debugging_port=9341,
            uses_default_root=False,
        ),
    )
    monkeypatch.setattr(
        singleton_module,
        "find_chrome_process_by_user_data_dir",
        lambda root: singleton_module.ChromeProcessInfo(
            pid=444,
            args=f"chrome --user-data-dir={user_data_dir} --remote-debugging-port=9334",
            user_data_dir=str(user_data_dir),
            remote_debugging_port=9334,
            uses_default_root=False,
        ),
    )
    monkeypatch.setattr(
        singleton_module,
        "_stop_repo_owned_root_process_for_relaunch",
        lambda process, timeout_sec=10.0: stopped.append(process.pid),
    )

    with pytest.raises(RuntimeError, match="already owns the configured CDP port"):
        singleton_module.ensure_repo_chrome_singleton(
            chrome_executable_path="/preferred/chrome",
            user_data_dir=user_data_dir,
            profile_name="cortexpilot",
            cdp_host="127.0.0.1",
            cdp_port=9341,
        )

    assert stopped == []


def test_ensure_repo_chrome_singleton_fails_closed_for_same_root_non_legacy_port(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    user_data_dir = tmp_path / "browser" / "chrome-user-data"
    (user_data_dir / "Profile 1").mkdir(parents=True, exist_ok=True)
    (user_data_dir / "Local State").write_text(
        json.dumps({"profile": {"info_cache": {"Profile 1": {"name": "cortexpilot"}}, "last_used": "Profile 1"}}),
        encoding="utf-8",
    )
    monkeypatch.setattr(singleton_module, "_is_executable_file", lambda path: str(path) == "/preferred/chrome")
    monkeypatch.setattr(singleton_module, "read_cdp_version", lambda host, port, timeout_sec=0.5: None)
    monkeypatch.setattr(singleton_module, "find_chrome_process_by_remote_debugging_port", lambda port: None)
    monkeypatch.setattr(
        singleton_module,
        "find_chrome_process_by_user_data_dir",
        lambda root: singleton_module.ChromeProcessInfo(
            pid=777,
            args=f"chrome --user-data-dir={user_data_dir} --remote-debugging-port=9444",
            user_data_dir=str(user_data_dir),
            remote_debugging_port=9444,
            uses_default_root=False,
        ),
    )

    with pytest.raises(RuntimeError, match="non-managed Chrome process"):
        singleton_module.ensure_repo_chrome_singleton(
            chrome_executable_path="/preferred/chrome",
            user_data_dir=user_data_dir,
            profile_name="cortexpilot",
            cdp_host="127.0.0.1",
            cdp_port=9341,
        )


def test_repo_chrome_singleton_cli_status_writes_json(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    user_data_dir = tmp_path / "browser" / "chrome-user-data"
    user_data_dir.mkdir(parents=True, exist_ok=True)
    monkeypatch.setattr(
        singleton_module,
        "read_cdp_version",
        lambda host, port, timeout_sec=0.5: None,
    )
    monkeypatch.setattr(singleton_module, "find_chrome_process_by_remote_debugging_port", lambda port: None)
    monkeypatch.setattr(singleton_module, "find_chrome_process_by_user_data_dir", lambda root: None)

    payload = singleton_module.repo_chrome_status(
        user_data_dir=user_data_dir,
        profile_name="cortexpilot",
        cdp_host="127.0.0.1",
        cdp_port=9341,
    )

    assert payload["user_data_dir"] == str(user_data_dir)
    assert payload["cdp_ready"] is False
