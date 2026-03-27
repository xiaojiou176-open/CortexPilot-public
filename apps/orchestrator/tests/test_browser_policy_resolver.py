from __future__ import annotations

from pathlib import Path

from cortexpilot_orch.policy import browser_policy_resolver
from cortexpilot_orch.policy.browser_policy_resolver import resolve_browser_policy


def test_resolver_priority_and_task_override(monkeypatch, tmp_path: Path) -> None:
    allow_root = tmp_path / "profiles"
    allow_root.mkdir(parents=True, exist_ok=True)
    monkeypatch.setenv("CORTEXPILOT_BROWSER_PROFILE_ALLOWLIST", str(allow_root))
    monkeypatch.setenv("CORTEXPILOT_BROWSER_STEALTH_MODE", "none")
    monkeypatch.setenv("CORTEXPILOT_BROWSER_HUMAN_BEHAVIOR", "0")

    contract_policy = {
        "profile_mode": "ephemeral",
        "stealth_mode": "lite",
        "human_behavior": {"enabled": False, "level": "low"},
    }
    task_policy = {
        "stealth_mode": "plugin",
        "human_behavior": {"enabled": True, "level": "high"},
    }

    audit = resolve_browser_policy(
        contract_policy=contract_policy,
        task_policy=task_policy,
        requested_by={"role": "SEARCHER"},
        source="search",
        task_id="search_1",
    )

    effective = audit["effective_policy"]
    assert effective["stealth_mode"] == "plugin"
    assert effective["human_behavior"]["enabled"] is True
    assert effective["human_behavior"]["level"] == "high"
    assert audit["policy_source"]["stealth_mode"] == "task"


def test_resolver_rejects_task_profile_override(monkeypatch) -> None:
    monkeypatch.delenv("CORTEXPILOT_BROWSER_BREAK_GLASS", raising=False)
    audit = resolve_browser_policy(
        contract_policy={"profile_mode": "ephemeral", "stealth_mode": "none", "human_behavior": {"enabled": False, "level": "low"}},
        task_policy={"profile_mode": "allow_profile", "stealth_mode": "lite"},
        requested_by={"role": "PM"},
        source="browser",
        task_id="browser_0",
    )

    events = audit["events"]
    assert any(item.get("event") == "BROWSER_POLICY_FIELD_REJECTED" for item in events)
    assert audit["effective_policy"]["profile_mode"] == "ephemeral"


def test_resolver_guard_blocks_non_allowlisted_profile(monkeypatch, tmp_path: Path) -> None:
    allow_root = tmp_path / "automation-profiles"
    allow_root.mkdir(parents=True, exist_ok=True)
    monkeypatch.setenv("CORTEXPILOT_BROWSER_PROFILE_ALLOWLIST", str(allow_root))
    monkeypatch.delenv("CORTEXPILOT_BROWSER_BREAK_GLASS", raising=False)

    contract_policy = {
        "profile_mode": "allow_profile",
        "profile_ref": {"profile_dir": str(tmp_path / "daily-profile"), "profile_name": "Default"},
        "stealth_mode": "plugin",
        "human_behavior": {"enabled": True, "level": "high"},
    }

    audit = resolve_browser_policy(
        contract_policy=contract_policy,
        task_policy=None,
        requested_by={"role": "PM"},
        source="browser",
        task_id="browser_1",
    )

    assert audit["effective_policy"]["profile_mode"] == "ephemeral"
    assert "allow_profile->ephemeral" in audit["fallback_chain"]
    assert any(item.get("event") == "BROWSER_POLICY_GUARD_BLOCK" for item in audit["events"])


def test_resolver_break_glass_allows_privileged_override(monkeypatch, tmp_path: Path) -> None:
    allow_root = tmp_path / "automation-profiles"
    allow_root.mkdir(parents=True, exist_ok=True)
    monkeypatch.setenv("CORTEXPILOT_BROWSER_PROFILE_ALLOWLIST", str(allow_root))
    monkeypatch.setenv("CORTEXPILOT_BROWSER_BREAK_GLASS", "1")

    contract_policy = {
        "profile_mode": "allow_profile",
        "profile_ref": {"profile_dir": str(tmp_path / "daily-profile"), "profile_name": "Default"},
        "stealth_mode": "plugin",
        "human_behavior": {"enabled": True, "level": "high"},
    }

    audit = resolve_browser_policy(
        contract_policy=contract_policy,
        task_policy=None,
        requested_by={"role": "OPS"},
        source="browser",
        task_id="browser_2",
    )

    assert audit["effective_policy"]["profile_mode"] == "allow_profile"
    events = [item.get("event") for item in audit["events"]]
    assert "BROWSER_BREAK_GLASS_ENABLED" in events
    assert "BROWSER_POLICY_OVERRIDE_APPROVED" in events


def test_resolver_explicit_env_profile_override_beats_contract(monkeypatch, tmp_path: Path) -> None:
    allow_root = tmp_path / "profiles"
    allow_root.mkdir(parents=True, exist_ok=True)
    monkeypatch.setenv("CORTEXPILOT_BROWSER_PROFILE_ALLOWLIST", str(allow_root))
    monkeypatch.setenv("CORTEXPILOT_BROWSER_PROFILE_MODE", "allow_profile")
    monkeypatch.setenv("CORTEXPILOT_BROWSER_PROFILE_DIR", str(allow_root))
    monkeypatch.setenv("CORTEXPILOT_BROWSER_PROFILE_NAME", "Default")

    audit = resolve_browser_policy(
        contract_policy={
            "profile_mode": "ephemeral",
            "stealth_mode": "none",
            "human_behavior": {"enabled": False, "level": "low"},
        },
        task_policy=None,
        requested_by={"role": "PM"},
        source="search",
        task_id="search_env_override",
    )

    assert audit["effective_policy"]["profile_mode"] == "allow_profile"
    assert audit["effective_policy"]["profile_ref"]["profile_dir"] == str(allow_root)
    assert audit["effective_policy"]["profile_ref"]["profile_name"] == "Default"
    assert audit["policy_source"]["profile_mode"] == "env"
    assert audit["policy_source"]["profile_ref.profile_name"] == "env"


def test_resolver_env_profile_survives_missing_contract(monkeypatch, tmp_path: Path) -> None:
    allow_root = tmp_path / "profiles"
    allow_root.mkdir(parents=True, exist_ok=True)
    monkeypatch.setenv("CORTEXPILOT_BROWSER_PROFILE_ALLOWLIST", str(allow_root))
    monkeypatch.setenv("CORTEXPILOT_BROWSER_PROFILE_MODE", "allow_profile")
    monkeypatch.setenv("CORTEXPILOT_BROWSER_PROFILE_DIR", str(allow_root))
    monkeypatch.setenv("CORTEXPILOT_BROWSER_PROFILE_NAME", "Default")

    audit = resolve_browser_policy(
        contract_policy=None,
        task_policy=None,
        requested_by={"role": "PM"},
        source="search",
        task_id="search_env_only",
    )

    assert audit["requested_policy"]["profile_mode"] == "allow_profile"
    assert audit["effective_policy"]["profile_mode"] == "allow_profile"
    assert audit["policy_source"]["profile_mode"] == "env"


def test_resolver_defaults_profile_dir_before_allowlist_guard(monkeypatch, tmp_path: Path) -> None:
    allow_root = tmp_path / "profiles"
    allow_root.mkdir(parents=True, exist_ok=True)
    monkeypatch.setenv("CORTEXPILOT_BROWSER_PROFILE_ALLOWLIST", str(allow_root))
    monkeypatch.setattr(browser_policy_resolver, "_default_chrome_profile_dir", lambda: allow_root)

    audit = resolve_browser_policy(
        contract_policy={
            "profile_mode": "allow_profile",
            "profile_ref": {"profile_dir": "", "profile_name": "Default"},
            "stealth_mode": "none",
            "human_behavior": {"enabled": False, "level": "low"},
        },
        task_policy=None,
        requested_by={"role": "PM"},
        source="search",
        task_id="search_default_dir",
    )

    assert audit["effective_policy"]["profile_mode"] == "allow_profile"
    assert audit["effective_policy"]["profile_ref"]["profile_dir"] == str(allow_root)
    assert audit["policy_source"]["profile_ref.profile_dir"] == "default"
