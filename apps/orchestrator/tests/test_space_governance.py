from __future__ import annotations

import importlib.util
import json
import os
import subprocess
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

from cortexpilot_orch.runtime.space_governance import (
    build_space_governance_report,
    evaluate_cleanup_gate,
    load_space_governance_policy,
    policy_hash,
)

SCRIPT_ROOT = Path(__file__).resolve().parents[3]


def _load_gate_script_module():
    spec = importlib.util.spec_from_file_location(
        "cortexpilot_check_space_cleanup_gate",
        SCRIPT_ROOT / "scripts" / "check_space_cleanup_gate.py",
    )
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _load_inventory_script_module():
    spec = importlib.util.spec_from_file_location(
        "cortexpilot_check_space_governance_inventory",
        SCRIPT_ROOT / "scripts" / "check_space_governance_inventory.py",
    )
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _write_file(path: Path, content: str = "x") -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def _age(path: Path, *, hours: int) -> None:
    ts = (datetime.now(timezone.utc) - timedelta(hours=hours)).timestamp()
    os.utime(path, (ts, ts), follow_symlinks=False)


def _base_policy(repo_root: Path, home_root: Path) -> dict:
    return {
        "version": 1,
        "recent_activity_hours": 24,
        "apply_gate_max_age_minutes": 15,
        "shared_realpath_prefixes": [str(home_root / ".cache" / "jarvis")],
        "process_groups": {
            "node": {"patterns": ["\\bnode\\b"]},
            "python": {"patterns": ["\\bpython\\b"]},
        },
        "rebuild_commands": [
            {"id": "bootstrap", "kind": "npm_script", "script": "bootstrap", "description": "bootstrap"},
            {
                "id": "dashboard_deps",
                "kind": "shell_script",
                "path": "scripts/install_dashboard_deps.sh",
                "description": "dashboard deps",
            },
        ],
        "layers": {
            "repo_internal": [
                {
                    "id": "dashboard_node_modules",
                    "path": "apps/dashboard/node_modules",
                    "type": "dependency",
                    "ownership": "repo local",
                    "ownership_confidence": "High",
                    "sharedness": "repo_local",
                    "rebuildability": "rebuildable",
                    "recommendation": "cautious_cleanup",
                    "cleanup_mode": "remove-path",
                    "risk": "medium",
                    "rebuild_command_ids": ["dashboard_deps", "bootstrap"],
                    "evidence": ["scripts/install_dashboard_deps.sh"],
                    "notes": "repo local dependency copy",
                },
                {
                    "id": "runtime_test_output",
                    "path": ".runtime-cache/test_output",
                    "type": "evidence",
                    "ownership": "repo local",
                    "ownership_confidence": "High",
                    "sharedness": "repo_local",
                    "rebuildability": "rebuildable",
                    "recommendation": "needs_verification",
                    "cleanup_mode": "aged-children",
                    "cleanup_scan_depth": 1,
                    "cleanup_min_age_hours": 48,
                    "risk": "medium",
                    "rebuild_command_ids": ["bootstrap"],
                    "evidence": ["scripts/test_quick.sh"],
                    "notes": "stale evidence only",
                },
            ],
            "repo_external_related": [
                {
                    "id": "external_python_toolchain_current",
                    "path": str(home_root / ".cache" / "cortexpilot" / "toolchains" / "python" / "current"),
                    "type": "toolchain symlink",
                    "ownership": "repo related",
                    "ownership_confidence": "Medium",
                    "sharedness": "repo_machine_shared",
                    "rebuildability": "unknown",
                    "recommendation": "needs_verification",
                    "cleanup_mode": "observe-only",
                    "risk": "high",
                    "rebuild_command_ids": ["bootstrap"],
                    "evidence": ["scripts/lib/toolchain_env.sh"],
                    "notes": "must not be single-repo cleanup target if it resolves into jarvis",
                }
            ],
            "shared_observation": [],
        },
        "wave_targets": {
            "wave1": {
                "target_ids": ["runtime_test_output"],
                "process_groups": ["node", "python"],
                "required_rebuild_commands": ["bootstrap"],
            },
            "wave2": {
                "target_ids": ["dashboard_node_modules"],
                "process_groups": ["node"],
                "required_rebuild_commands": ["dashboard_deps", "bootstrap"],
            },
            "wave3": {
                "target_ids": ["external_python_toolchain_current"],
                "process_groups": ["python"],
                "required_rebuild_commands": ["bootstrap"],
            },
        },
    }


def test_space_governance_report_marks_shared_symlink_targets(tmp_path: Path) -> None:
    repo_root = tmp_path / "repo"
    home_root = tmp_path / "home"
    _write_file(repo_root / "package.json", json.dumps({"scripts": {"bootstrap": "echo ok"}}))
    _write_file(repo_root / "scripts" / "install_dashboard_deps.sh", "#!/usr/bin/env bash\n")
    _write_file(repo_root / "apps" / "dashboard" / "node_modules" / "pkg" / "index.js", "console.log('x')")

    jarvis_target = home_root / ".cache" / "jarvis" / "toolchains" / "python" / "current"
    _write_file(jarvis_target / "bin" / "python", "python")
    symlink_path = home_root / ".cache" / "cortexpilot" / "toolchains" / "python" / "current"
    symlink_path.parent.mkdir(parents=True, exist_ok=True)
    symlink_path.symlink_to(jarvis_target, target_is_directory=True)

    policy_path = tmp_path / "space_policy.json"
    policy_path.write_text(json.dumps(_base_policy(repo_root, home_root), ensure_ascii=False, indent=2), encoding="utf-8")

    policy = load_space_governance_policy(policy_path)
    report = build_space_governance_report(repo_root=repo_root, policy=policy, ps_lines=[])

    entry = next(item for item in report["entries"] if item["policy_entry_id"] == "external_python_toolchain_current")
    assert entry["path_is_symlink"] is True
    assert entry["shared_realpath_escape"] is True
    assert any(item["policy_entry_id"] == "external_python_toolchain_current" for item in report["needs_verification"])


def test_cleanup_gate_blocks_active_processes_and_requires_recent_confirmation(tmp_path: Path) -> None:
    repo_root = tmp_path / "repo"
    home_root = tmp_path / "home"
    _write_file(repo_root / "package.json", json.dumps({"scripts": {"bootstrap": "echo ok"}}))
    _write_file(repo_root / "scripts" / "install_dashboard_deps.sh", "#!/usr/bin/env bash\n")
    node_modules_file = repo_root / "apps" / "dashboard" / "node_modules" / "pkg" / "index.js"
    _write_file(node_modules_file, "console.log('x')")

    policy_path = tmp_path / "space_policy.json"
    policy_path.write_text(json.dumps(_base_policy(repo_root, home_root), ensure_ascii=False, indent=2), encoding="utf-8")
    policy = load_space_governance_policy(policy_path)

    report_blocked = build_space_governance_report(
        repo_root=repo_root,
        policy=policy,
        ps_lines=[f"123 node {repo_root}/apps/dashboard/node_modules/.bin/next dev"],
    )
    gate_blocked = evaluate_cleanup_gate(
        repo_root=repo_root,
        policy=policy,
        report=report_blocked,
        wave="wave2",
        ps_lines=[f"123 node {repo_root}/apps/dashboard/node_modules/.bin/next dev"],
    )
    assert gate_blocked["status"] == "blocked"
    assert gate_blocked["blocked_reasons"]

    report_recent = build_space_governance_report(repo_root=repo_root, policy=policy, ps_lines=[])
    gate_recent = evaluate_cleanup_gate(
        repo_root=repo_root,
        policy=policy,
        report=report_recent,
        wave="wave2",
        ps_lines=[],
    )
    assert gate_recent["status"] == "manual_confirmation_required"
    assert any("recent activity" in item for item in gate_recent["manual_reasons"])


def test_cleanup_gate_does_not_hard_block_unrelated_global_processes(tmp_path: Path) -> None:
    repo_root = tmp_path / "repo"
    home_root = tmp_path / "home"
    _write_file(repo_root / "package.json", json.dumps({"scripts": {"bootstrap": "echo ok"}}))
    _write_file(repo_root / "scripts" / "install_dashboard_deps.sh", "#!/usr/bin/env bash\n")
    node_modules_file = repo_root / "apps" / "dashboard" / "node_modules" / "pkg" / "index.js"
    _write_file(node_modules_file, "console.log('x')")
    _age(node_modules_file, hours=96)

    policy_path = tmp_path / "space_policy.json"
    policy_path.write_text(json.dumps(_base_policy(repo_root, home_root), ensure_ascii=False, indent=2), encoding="utf-8")
    policy = load_space_governance_policy(policy_path)

    report = build_space_governance_report(
        repo_root=repo_root,
        policy=policy,
        ps_lines=["123 node /opt/homebrew/bin/RunnerService.js"],
    )
    gate = evaluate_cleanup_gate(
        repo_root=repo_root,
        policy=policy,
        report=report,
        wave="wave2",
        ps_lines=["123 node /opt/homebrew/bin/RunnerService.js"],
    )

    assert gate["status"] == "manual_confirmation_required"
    assert not gate["blocked_reasons"]
    assert gate["manual_confirmation_findings"]
    assert gate["manual_confirmation_findings"][0]["evidence_scope"] == "unknown"


def test_wave3_does_not_promote_unrelated_playwright_or_cargo_processes_to_target_scoped(tmp_path: Path) -> None:
    repo_root = tmp_path / "repo"
    home_root = tmp_path / "home"
    _write_file(repo_root / "package.json", json.dumps({"scripts": {"bootstrap": "echo ok"}}))
    _write_file(repo_root / "scripts" / "install_dashboard_deps.sh", "#!/usr/bin/env bash\n")
    _write_file(home_root / ".cache" / "cortexpilot" / "playwright" / "browsers.json", "{}")
    _age(home_root / ".cache" / "cortexpilot" / "playwright" / "browsers.json", hours=96)

    policy_path = tmp_path / "space_policy.json"
    policy_payload = _base_policy(repo_root, home_root)
    policy_payload["process_groups"]["playwright"] = {"patterns": ["playwright"]}
    policy_payload["process_groups"]["cargo"] = {"patterns": ["\\bcargo\\b"]}
    policy_payload["layers"]["repo_external_related"].append(
        {
            "id": "external_playwright_cache",
            "path": str(home_root / ".cache" / "cortexpilot" / "playwright"),
            "type": "playwright cache",
            "ownership": "repo related",
            "ownership_confidence": "High",
            "sharedness": "repo_machine_shared",
            "rebuildability": "rebuildable",
            "recommendation": "needs_verification",
            "cleanup_mode": "remove-path",
            "risk": "medium",
            "rebuild_command_ids": ["bootstrap"],
            "evidence": ["scripts/bootstrap.sh"],
        }
    )
    policy_payload["wave_targets"]["wave3"] = {
        "target_ids": ["external_playwright_cache"],
        "process_groups": ["playwright", "cargo"],
        "process_path_hints": [str(home_root / ".cache" / "cortexpilot" / "playwright")],
        "process_command_hints": ["playwright", "cargo"],
        "required_rebuild_commands": ["bootstrap"],
    }
    policy_path.write_text(json.dumps(policy_payload, ensure_ascii=False, indent=2), encoding="utf-8")
    policy = load_space_governance_policy(policy_path)

    report = build_space_governance_report(
        repo_root=repo_root,
        policy=policy,
        ps_lines=[
            "111 node /opt/homebrew/bin/pnpm exec playwright test",
            "222 cargo test --workspace",
        ],
    )
    gate = evaluate_cleanup_gate(
        repo_root=repo_root,
        policy=policy,
        report=report,
        wave="wave3",
        ps_lines=[
            "111 node /opt/homebrew/bin/pnpm exec playwright test",
            "222 cargo test --workspace",
        ],
    )

    assert gate["status"] == "manual_confirmation_required"
    assert not gate["blocked_reasons"]
    assert all(
        finding["blocking_reason_kind"] == "unknown"
        for finding in gate["manual_confirmation_findings"]
        if finding.get("process_group") in {"playwright", "cargo"}
    )


def test_wave1_does_not_promote_other_repo_runtime_cache_processes_to_target_scoped(tmp_path: Path) -> None:
    repo_root = tmp_path / "cortexpilot_repo"
    home_root = tmp_path / "home"
    _write_file(repo_root / "package.json", json.dumps({"scripts": {"bootstrap": "echo ok"}}))
    _write_file(repo_root / "scripts" / "install_dashboard_deps.sh", "#!/usr/bin/env bash\n")
    stale_file = repo_root / ".runtime-cache" / "test_output" / "stale.json"
    _write_file(stale_file, "{}")
    _age(stale_file, hours=96)

    policy_path = tmp_path / "space_policy.json"
    policy_payload = _base_policy(repo_root, home_root)
    policy_payload["process_groups"]["docker"] = {"patterns": ["\\bdocker\\b"]}
    policy_payload["wave_targets"]["wave1"]["process_groups"] = ["docker", "node", "python"]
    policy_payload["wave_targets"]["wave1"]["process_path_hints"] = [".runtime-cache"]
    policy_payload["wave_targets"]["wave1"]["process_command_hints"] = ["CortexPilot", ".runtime-cache"]
    policy_path.write_text(json.dumps(policy_payload, ensure_ascii=False, indent=2), encoding="utf-8")
    policy = load_space_governance_policy(policy_path)

    foreign_command = (
        "123 docker compose -f /Users/example/.cache/other-runner/work/other-repo/docker/compose.yml "
        "run --rm -v /Users/example/.cache/other-runner/work/other-repo:/workspace "
        "-e UI_RUNTIME_CACHE_ROOT=/workspace/.runtime-cache ci-gate bash -lc 'echo test'"
    )

    report = build_space_governance_report(repo_root=repo_root, policy=policy, ps_lines=[foreign_command])
    gate = evaluate_cleanup_gate(
        repo_root=repo_root,
        policy=policy,
        report=report,
        wave="wave1",
        ps_lines=[foreign_command],
    )

    assert gate["status"] == "manual_confirmation_required"
    assert not gate["blocked_reasons"]
    assert gate["manual_confirmation_findings"]
    assert gate["manual_confirmation_findings"][0]["evidence_scope"] == "unknown"


def test_space_governance_report_collects_only_stale_cleanup_candidates(tmp_path: Path) -> None:
    repo_root = tmp_path / "repo"
    home_root = tmp_path / "home"
    _write_file(repo_root / "package.json", json.dumps({"scripts": {"bootstrap": "echo ok"}}))
    _write_file(repo_root / "scripts" / "install_dashboard_deps.sh", "#!/usr/bin/env bash\n")
    stale_file = repo_root / ".runtime-cache" / "test_output" / "stale.json"
    fresh_file = repo_root / ".runtime-cache" / "test_output" / "fresh.json"
    _write_file(stale_file, "{}")
    _write_file(fresh_file, "{}")
    _age(stale_file, hours=96)

    policy_path = tmp_path / "space_policy.json"
    policy_path.write_text(json.dumps(_base_policy(repo_root, home_root), ensure_ascii=False, indent=2), encoding="utf-8")
    policy = load_space_governance_policy(policy_path)

    report = build_space_governance_report(repo_root=repo_root, policy=policy, ps_lines=[])
    entry = next(item for item in report["entries"] if item["policy_entry_id"] == "runtime_test_output")
    candidate_paths = {item["path"] for item in entry["cleanup_candidates"]}
    assert str(stale_file) in candidate_paths
    assert str(fresh_file) not in candidate_paths

    gate = evaluate_cleanup_gate(
        repo_root=repo_root,
        policy=policy,
        report=report,
        wave="wave1",
        allow_recent=False,
    )
    eligible_paths = {item["path"] for item in gate["eligible_targets"]}
    assert str(stale_file) in eligible_paths
    assert str(fresh_file) not in eligible_paths


def test_space_governance_report_uses_exclusive_summary_for_external_rollup(tmp_path: Path) -> None:
    repo_root = tmp_path / "repo"
    home_root = tmp_path / "home"
    _write_file(repo_root / "package.json", json.dumps({"scripts": {"bootstrap": "echo ok"}}))
    _write_file(repo_root / "scripts" / "install_dashboard_deps.sh", "#!/usr/bin/env bash\n")
    pnpm_store_file = home_root / ".cache" / "cortexpilot" / "pnpm-store" / "pkg" / "artifact.tgz"
    _write_file(pnpm_store_file, "x" * 1024)

    policy_path = tmp_path / "space_policy.json"
    policy_payload = _base_policy(repo_root, home_root)
    policy_payload["layers"]["repo_external_related"].insert(
        0,
        {
            "id": "external_machine_cache_root",
            "path": str(home_root / ".cache" / "cortexpilot"),
            "type": "machine cache root",
            "ownership": "repo external root",
            "ownership_confidence": "High",
            "sharedness": "repo_machine_shared",
            "summary_role": "rollup_root",
            "rebuildability": "rebuildable",
            "recommendation": "needs_verification",
            "cleanup_mode": "observe-only",
            "risk": "medium",
            "rebuild_command_ids": ["bootstrap"],
            "evidence": ["scripts/lib/toolchain_env.sh"],
        },
    )
    policy_payload["layers"]["repo_external_related"].insert(
        1,
        {
            "id": "external_pnpm_store",
            "path": str(home_root / ".cache" / "cortexpilot" / "pnpm-store"),
            "type": "pnpm store",
            "ownership": "repo external pnpm store",
            "ownership_confidence": "High",
            "sharedness": "repo_machine_shared",
            "summary_role": "breakdown_only",
            "rebuildability": "rebuildable",
            "recommendation": "needs_verification",
            "cleanup_mode": "remove-path",
            "risk": "medium",
            "rebuild_command_ids": ["dashboard_deps"],
            "evidence": ["scripts/install_dashboard_deps.sh"],
        },
    )
    policy_path.write_text(json.dumps(policy_payload, ensure_ascii=False, indent=2), encoding="utf-8")
    policy = load_space_governance_policy(policy_path)

    report = build_space_governance_report(repo_root=repo_root, policy=policy, ps_lines=[])
    root_entry = next(item for item in report["entries"] if item["policy_entry_id"] == "external_machine_cache_root")
    child_entry = next(item for item in report["entries"] if item["policy_entry_id"] == "external_pnpm_store")

    assert report["summary"]["bucket_counting_mode"] == "exclusive"
    assert report["summary"]["repo_external_related_total_bytes"] == root_entry["size_bytes"]
    assert root_entry["counted_in_summary"] is True
    assert child_entry["counted_in_summary"] is False
    assert child_entry["summary_exclusion_reason"] == "breakdown-only"


def test_cleanup_gate_defers_additional_serial_only_targets(tmp_path: Path) -> None:
    repo_root = tmp_path / "repo"
    home_root = tmp_path / "home"
    _write_file(repo_root / "package.json", json.dumps({"scripts": {"bootstrap": "echo ok"}}))
    _write_file(repo_root / "scripts" / "install_dashboard_deps.sh", "#!/usr/bin/env bash\n")
    _write_file(repo_root / "scripts" / "install_desktop_deps.sh", "#!/usr/bin/env bash\n")
    dashboard_file = repo_root / "apps" / "dashboard" / "node_modules" / "pkg" / "index.js"
    desktop_file = repo_root / "apps" / "desktop" / "node_modules" / "pkg" / "index.js"
    _write_file(dashboard_file, "console.log('dashboard')")
    _write_file(desktop_file, "console.log('desktop')")
    _age(dashboard_file, hours=96)
    _age(desktop_file, hours=96)

    policy_payload = _base_policy(repo_root, home_root)
    policy_payload["rebuild_commands"].append(
        {
            "id": "desktop_deps",
            "kind": "shell_script",
            "path": "scripts/install_desktop_deps.sh",
            "description": "desktop deps",
        }
    )
    policy_payload["layers"]["repo_internal"][0]["post_cleanup_command_ids"] = ["dashboard_deps"]
    policy_payload["layers"]["repo_internal"][0]["apply_serial_only"] = True
    policy_payload["layers"]["repo_internal"].append(
        {
            "id": "desktop_node_modules",
            "path": "apps/desktop/node_modules",
            "type": "dependency",
            "ownership": "repo local",
            "ownership_confidence": "High",
            "sharedness": "repo_local",
            "rebuildability": "rebuildable",
            "recommendation": "cautious_cleanup",
            "cleanup_mode": "remove-path",
            "risk": "medium",
            "rebuild_command_ids": ["desktop_deps"],
            "post_cleanup_command_ids": ["desktop_deps"],
            "apply_serial_only": True,
            "evidence": ["scripts/install_desktop_deps.sh"],
        }
    )
    policy_payload["wave_targets"]["wave2"]["target_ids"] = ["dashboard_node_modules", "desktop_node_modules"]
    policy_payload["wave_targets"]["wave2"]["required_rebuild_commands"] = ["dashboard_deps", "desktop_deps", "bootstrap"]
    policy_path = tmp_path / "space_policy.json"
    policy_path.write_text(json.dumps(policy_payload, ensure_ascii=False, indent=2), encoding="utf-8")
    policy = load_space_governance_policy(policy_path)

    report = build_space_governance_report(repo_root=repo_root, policy=policy, ps_lines=[])
    gate = evaluate_cleanup_gate(
        repo_root=repo_root,
        policy=policy,
        report=report,
        wave="wave2",
        allow_recent=True,
        ps_lines=[],
    )

    assert gate["status"] == "pass"
    assert len(gate["eligible_targets"]) == 1
    assert gate["deferred_targets"]
    assert gate["execution_order"][0]["entry_id"] == gate["eligible_targets"][0]["entry_id"]
    assert gate["eligible_targets"][0]["apply_serial_only"] is True
    assert gate["expected_reclaim_bytes"] == gate["eligible_targets"][0]["expected_reclaim_bytes"]


def test_inventory_consistency_script_catches_undeclared_cleanup_target(tmp_path: Path, monkeypatch) -> None:
    runtime_policy = {
        "version": 1,
        "runtime_roots": {"runtime_root": ".runtime-cache/cortexpilot"},
        "namespaces": {},
        "machine_managed_repo_local_roots": ["apps/dashboard/node_modules"],
        "space_governance_gray_zone_roots": [],
        "ephemeral_repo_local_roots": [],
        "workspace_pollution_scan_roots": [],
        "workspace_forbidden_dirnames": [],
        "workspace_forbidden_file_globs": [],
        "machine_cache_roots": ["~/.cache/cortexpilot"],
        "cleanup_policy": {},
        "forbidden_top_level_outputs": ["node_modules", ".pnp.cjs", ".pnp.loader.mjs", "Users"],
        "legacy_runtime_paths": [],
    }
    space_policy = {
        "version": 1,
        "recent_activity_hours": 24,
        "apply_gate_max_age_minutes": 15,
        "shared_realpath_prefixes": [],
        "process_groups": {"node": {"patterns": ["\\bnode\\b"]}},
        "rebuild_commands": [{"id": "dashboard_deps", "kind": "shell_script", "path": "scripts/install_dashboard_deps.sh"}],
        "layers": {
            "repo_internal": [
                {
                    "id": "dashboard_node_modules",
                    "path": "apps/dashboard/node_modules",
                    "type": "dependency",
                    "ownership": "repo local",
                    "ownership_confidence": "High",
                    "sharedness": "repo_local",
                    "rebuildability": "rebuildable",
                    "recommendation": "cautious_cleanup",
                    "cleanup_mode": "remove-path",
                    "risk": "medium",
                    "rebuild_command_ids": ["dashboard_deps"],
                    "post_cleanup_command_ids": ["dashboard_deps"],
                    "evidence": ["scripts/install_dashboard_deps.sh"],
                }
            ],
            "repo_external_related": [],
            "shared_observation": [],
        },
        "wave_targets": {"wave2": {"target_ids": ["dashboard_node_modules"], "process_groups": ["node"], "required_rebuild_commands": ["dashboard_deps"]}},
    }
    cleanup_script = tmp_path / "cleanup_workspace_modules.sh"
    cleanup_script.write_text(
        "\n".join(
            [
                '#!/usr/bin/env bash',
                'cleanup_target "apps/dashboard/node_modules"',
                'cleanup_target "packages/frontend-api-contract/node_modules"',
            ]
        )
        + "\n",
        encoding="utf-8",
    )
    runtime_policy_path = tmp_path / "runtime.json"
    runtime_policy_path.write_text(json.dumps(runtime_policy, ensure_ascii=False, indent=2), encoding="utf-8")
    space_policy_path = tmp_path / "space.json"
    space_policy_path.write_text(json.dumps(space_policy, ensure_ascii=False, indent=2), encoding="utf-8")

    inventory_module = _load_inventory_script_module()
    monkeypatch.setattr(
        sys,
        "argv",
        [
            "check_space_governance_inventory.py",
            "--runtime-policy",
            str(runtime_policy_path),
            "--space-policy",
            str(space_policy_path),
            "--cleanup-script",
            str(cleanup_script),
        ],
    )

    rc = inventory_module.main()
    assert rc == 1


def test_apply_cleanup_rejects_stale_gate_json(tmp_path: Path) -> None:
    repo_root = tmp_path / "repo"
    home_root = tmp_path / "home"
    _write_file(repo_root / "package.json", json.dumps({"scripts": {"bootstrap": "echo ok"}}))
    _write_file(repo_root / "scripts" / "install_dashboard_deps.sh", "#!/usr/bin/env bash\n")
    target_path = repo_root / "apps" / "dashboard" / "node_modules" / "pkg" / "index.js"
    _write_file(target_path, "console.log('x')")
    _age(target_path, hours=96)

    policy_payload = _base_policy(repo_root, home_root)
    policy_path = tmp_path / "space_policy.json"
    policy_path.write_text(json.dumps(policy_payload, ensure_ascii=False, indent=2), encoding="utf-8")
    gate_path = tmp_path / "cleanup_gate.json"
    result_path = tmp_path / "cleanup_result.json"
    gate_path.write_text(
        json.dumps(
            {
                "wave": "wave2",
                "status": "pass",
                "repo_root": str(repo_root),
                "policy_hash": policy_hash(policy_payload),
                "generated_at": (datetime.now(timezone.utc) - timedelta(minutes=120)).isoformat(),
                "gate_max_age_minutes": 15,
                "allow_recent": True,
                "allow_shared": False,
                "eligible_targets": [
                    {
                        "entry_id": "dashboard_node_modules",
                        "path": str(repo_root / "apps" / "dashboard" / "node_modules"),
                        "target_kind": "path",
                        "size_bytes": 0,
                        "classification": "cautious_cleanup",
                        "rebuild_entrypoints": [{"command_id": "dashboard_deps"}],
                    }
                ],
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    proc = subprocess.run(
        [
            sys.executable,
            str(SCRIPT_ROOT / "scripts" / "apply_space_cleanup.py"),
            "--repo-root",
            str(repo_root),
            "--policy",
            str(policy_path),
            "--gate-json",
            str(gate_path),
            "--result-json",
            str(result_path),
        ],
        capture_output=True,
        text=True,
        check=False,
    )

    assert proc.returncode == 1
    payload = json.loads(result_path.read_text(encoding="utf-8"))
    assert payload["status"] == "rejected"
    assert any("stale" in item for item in payload["gate_errors"])


def test_apply_cleanup_rejects_symlink_realpath_escape(tmp_path: Path) -> None:
    repo_root = tmp_path / "repo"
    home_root = tmp_path / "home"
    _write_file(repo_root / "package.json", json.dumps({"scripts": {"bootstrap": "echo ok"}}))
    target_outside_repo = tmp_path / "outside" / "danger.txt"
    _write_file(target_outside_repo, "danger")
    symlink_path = repo_root / "safe-link"
    symlink_path.parent.mkdir(parents=True, exist_ok=True)
    symlink_path.symlink_to(target_outside_repo)

    policy_payload = {
        "version": 1,
        "recent_activity_hours": 24,
        "apply_gate_max_age_minutes": 15,
        "shared_realpath_prefixes": [],
        "process_groups": {"node": {"patterns": ["\\bnode\\b"]}},
        "rebuild_commands": [{"id": "bootstrap", "kind": "npm_script", "script": "bootstrap", "description": "bootstrap"}],
        "layers": {
            "repo_internal": [
                {
                    "id": "repo_symlink_target",
                    "path": "safe-link",
                    "type": "repo-local symlink",
                    "ownership": "repo local",
                    "ownership_confidence": "High",
                    "sharedness": "repo_local",
                    "summary_role": "leaf",
                    "rebuildability": "rebuildable",
                    "recommendation": "cautious_cleanup",
                    "cleanup_mode": "remove-path",
                    "risk": "medium",
                    "rebuild_command_ids": ["bootstrap"],
                    "evidence": ["tests"],
                }
            ],
            "repo_external_related": [],
            "shared_observation": [],
        },
        "wave_targets": {
            "wave2": {
                "target_ids": ["repo_symlink_target"],
                "process_groups": ["node"],
                "required_rebuild_commands": ["bootstrap"],
            }
        },
    }
    policy_path = tmp_path / "space_policy.json"
    policy_path.write_text(json.dumps(policy_payload, ensure_ascii=False, indent=2), encoding="utf-8")
    gate_path = tmp_path / "cleanup_gate.json"
    result_path = tmp_path / "cleanup_result.json"
    gate_path.write_text(
        json.dumps(
            {
                "wave": "wave2",
                "status": "pass",
                "repo_root": str(repo_root),
                "policy_hash": policy_hash(policy_payload),
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "gate_max_age_minutes": 15,
                "allow_recent": True,
                "allow_shared": False,
                "eligible_targets": [
                    {
                        "entry_id": "repo_symlink_target",
                        "path": str(symlink_path),
                        "target_kind": "path",
                        "size_bytes": 0,
                        "classification": "cautious_cleanup",
                        "rebuild_entrypoints": [{"command_id": "bootstrap"}],
                    }
                ],
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    proc = subprocess.run(
        [
            sys.executable,
            str(SCRIPT_ROOT / "scripts" / "apply_space_cleanup.py"),
            "--repo-root",
            str(repo_root),
            "--policy",
            str(policy_path),
            "--gate-json",
            str(gate_path),
            "--result-json",
            str(result_path),
        ],
        capture_output=True,
        text=True,
        check=False,
    )

    assert proc.returncode == 1
    payload = json.loads(result_path.read_text(encoding="utf-8"))
    assert payload["status"] == "rejected"
    assert payload["rejected_targets"]
    assert "escapes repo root" in payload["rejected_targets"][0]["revalidation_reason"]


def test_apply_cleanup_records_post_cleanup_verification_failure(tmp_path: Path) -> None:
    repo_root = tmp_path / "repo"
    repo_root.mkdir(parents=True, exist_ok=True)
    target_path = repo_root / "apps" / "dashboard" / "node_modules"
    _write_file(target_path / "pkg" / "index.js", "console.log('x')")
    failing_script = repo_root / "scripts" / "fail_verify.sh"
    _write_file(
        failing_script,
        "#!/usr/bin/env bash\nexit 7\n",
    )
    failing_script.chmod(0o755)

    policy_payload = {
        "version": 1,
        "recent_activity_hours": 24,
        "apply_gate_max_age_minutes": 15,
        "shared_realpath_prefixes": [],
        "process_groups": {"node": {"patterns": ["\\bnode\\b"]}},
        "rebuild_commands": [
            {"id": "fail_verify", "kind": "shell_script", "path": "scripts/fail_verify.sh", "description": "fail verify"}
        ],
        "layers": {
            "repo_internal": [
                {
                    "id": "dashboard_node_modules",
                    "path": "apps/dashboard/node_modules",
                    "type": "dependency",
                    "ownership": "repo local",
                    "ownership_confidence": "High",
                    "sharedness": "repo_local",
                    "rebuildability": "rebuildable",
                    "recommendation": "cautious_cleanup",
                    "cleanup_mode": "remove-path",
                    "risk": "medium",
                    "rebuild_command_ids": ["fail_verify"],
                    "post_cleanup_command_ids": ["fail_verify"],
                    "evidence": ["scripts/fail_verify.sh"],
                }
            ],
            "repo_external_related": [],
            "shared_observation": [],
        },
        "wave_targets": {"wave2": {"target_ids": ["dashboard_node_modules"], "process_groups": ["node"], "required_rebuild_commands": ["fail_verify"]}},
    }
    policy_path = tmp_path / "space_policy.json"
    policy_path.write_text(json.dumps(policy_payload, ensure_ascii=False, indent=2), encoding="utf-8")
    gate_path = tmp_path / "cleanup_gate.json"
    result_path = tmp_path / "cleanup_result.json"
    gate_path.write_text(
        json.dumps(
            {
                "wave": "wave2",
                "status": "pass",
                "repo_root": str(repo_root),
                "policy_hash": policy_hash(policy_payload),
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "gate_max_age_minutes": 15,
                "allow_recent": True,
                "allow_shared": False,
                "eligible_targets": [
                    {
                        "entry_id": "dashboard_node_modules",
                        "path": str(target_path),
                        "target_kind": "path",
                        "size_bytes": 0,
                        "expected_reclaim_bytes": 0,
                        "classification": "cautious_cleanup",
                        "rebuild_entrypoints": [{"command_id": "fail_verify", "argv": ["bash", str(failing_script)], "available": True}],
                        "post_cleanup_verification_commands": [{"command_id": "fail_verify", "argv": ["bash", str(failing_script)], "available": True}],
                        "apply_serial_only": True,
                    }
                ],
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    proc = subprocess.run(
        [
            sys.executable,
            str(SCRIPT_ROOT / "scripts" / "apply_space_cleanup.py"),
            "--repo-root",
            str(repo_root),
            "--policy",
            str(policy_path),
            "--gate-json",
            str(gate_path),
            "--result-json",
            str(result_path),
        ],
        capture_output=True,
        text=True,
        check=False,
    )

    assert proc.returncode == 1
    payload = json.loads(result_path.read_text(encoding="utf-8"))
    assert payload["status"] == "verification_failed"
    assert payload["verification_failures"]
    assert payload["removed_targets"][0]["verification_failed"] is True


def test_space_cleanup_gate_rebuilds_stale_compatible_report(tmp_path: Path, monkeypatch) -> None:
    repo_root = tmp_path / "repo"
    home_root = tmp_path / "home"
    _write_file(repo_root / "package.json", json.dumps({"scripts": {"bootstrap": "echo ok"}}))
    _write_file(repo_root / "scripts" / "install_dashboard_deps.sh", "#!/usr/bin/env bash\n")
    node_modules_file = repo_root / "apps" / "dashboard" / "node_modules" / "pkg" / "index.js"
    _write_file(node_modules_file, "console.log('x')")
    _age(node_modules_file, hours=96)

    policy_payload = _base_policy(repo_root, home_root)
    policy_path = tmp_path / "space_policy.json"
    policy_path.write_text(json.dumps(policy_payload, ensure_ascii=False, indent=2), encoding="utf-8")
    policy = load_space_governance_policy(policy_path)

    stale_report = build_space_governance_report(repo_root=repo_root, policy=policy, ps_lines=[])
    stale_report["generated_at"] = (datetime.now(timezone.utc) - timedelta(minutes=120)).isoformat()
    report_path = tmp_path / "report.json"
    report_path.write_text(json.dumps(stale_report, ensure_ascii=False, indent=2), encoding="utf-8")
    output_path = tmp_path / "cleanup_gate.json"

    gate_module = _load_gate_script_module()
    monkeypatch.setattr(gate_module, "ROOT", repo_root)

    rebuild_called = {"count": 0}

    def _rebuild(*, repo_root: Path, policy: dict):
        rebuild_called["count"] += 1
        return build_space_governance_report(repo_root=repo_root, policy=policy, ps_lines=[])

    def _evaluate(*, repo_root: Path, policy: dict, report: dict, wave: str, allow_recent: bool = False, allow_shared: bool = False):
        return evaluate_cleanup_gate(
            repo_root=repo_root,
            policy=policy,
            report=report,
            wave=wave,
            allow_recent=allow_recent,
            allow_shared=allow_shared,
            ps_lines=[],
        )

    monkeypatch.setattr(gate_module, "build_space_governance_report", _rebuild)
    monkeypatch.setattr(gate_module, "evaluate_cleanup_gate", _evaluate)
    monkeypatch.setattr(
        sys,
        "argv",
        [
            "check_space_cleanup_gate.py",
            "--policy",
            str(policy_path),
            "--report-json",
            str(report_path),
            "--output-json",
            str(output_path),
            "--wave",
            "wave2",
            "--allow-recent",
        ],
    )

    rc = gate_module.main()

    assert rc == 0
    assert rebuild_called["count"] == 1
    payload = json.loads(output_path.read_text(encoding="utf-8"))
    assert payload["status"] == "pass"
