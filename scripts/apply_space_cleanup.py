#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "apps" / "orchestrator" / "src"))

from cortexpilot_orch.runtime.space_governance import (
    load_space_governance_policy,
    path_size_bytes,
    revalidate_cleanup_targets,
)


DEFAULT_POLICY = ROOT / "configs" / "space_governance_policy.json"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Apply CortexPilot space cleanup after gate revalidation.")
    parser.add_argument("--policy", default=str(DEFAULT_POLICY))
    parser.add_argument("--gate-json", required=True)
    parser.add_argument("--result-json", required=True)
    parser.add_argument("--repo-root", default=str(ROOT), help=argparse.SUPPRESS)
    return parser.parse_args()


def remove_path(path: Path) -> None:
    if not path.exists() and not path.is_symlink():
        return
    if path.is_symlink() or path.is_file():
        path.unlink(missing_ok=True)
        return
    shutil.rmtree(path)


def main() -> int:
    args = parse_args()
    repo_root = Path(args.repo_root).expanduser().resolve()
    policy = load_space_governance_policy(Path(args.policy).expanduser().resolve())
    gate_path = Path(args.gate_json).expanduser().resolve()
    result_path = Path(args.result_json).expanduser().resolve()
    gate = json.loads(gate_path.read_text(encoding="utf-8"))

    revalidation = revalidate_cleanup_targets(repo_root=repo_root, policy=policy, gate=gate)
    if revalidation["gate_errors"] or revalidation["rejected_targets"]:
        payload = {
            "wave": revalidation["wave"],
            "status": "rejected",
            "gate_errors": revalidation["gate_errors"],
            "validated_targets": revalidation["validated_targets"],
            "rejected_targets": revalidation["rejected_targets"],
            "source_gate": str(gate_path),
        }
        result_path.parent.mkdir(parents=True, exist_ok=True)
        result_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print("❌ [space-cleanup-apply] target revalidation failed")
        for item in revalidation["gate_errors"]:
            print(f"- gate: {item}")
        for item in revalidation["rejected_targets"]:
            print(f"- {item['path']}: {item['revalidation_reason']}")
        return 1

    removed_targets = []
    before_total = 0
    after_total = 0
    for item in revalidation["validated_targets"]:
        path = Path(item["path"])
        canonical_path = Path(item["canonical_path"])
        before = path_size_bytes(path)
        before_total += before
        remove_path(path)
        after = path_size_bytes(canonical_path if canonical_path.exists() else path)
        after_total += after
        removed_targets.append(
            {
                "entry_id": item["entry_id"],
                "path": item["path"],
                "realpath": item["canonical_path"],
                "size_before": before,
                "size_after": after,
                "released_bytes": max(before - after, 0),
                "classification": item["classification"],
                "rebuild_entrypoints": item["rebuild_entrypoints"],
                "deleted": not path.exists() and not path.is_symlink(),
                "skip_reason": "",
            }
        )

    payload = {
        "wave": revalidation["wave"],
        "status": "applied",
        "gate_errors": [],
        "validated_targets": revalidation["validated_targets"],
        "rejected_targets": [],
        "removed_targets": removed_targets,
        "released_total_bytes": max(before_total - after_total, 0),
        "before_total_bytes": before_total,
        "after_total_bytes": after_total,
        "source_gate": str(gate_path),
    }
    result_path.parent.mkdir(parents=True, exist_ok=True)
    result_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(
        f"🧹 [space-cleanup-apply] applied wave={payload['wave']} "
        f"released_bytes={payload['released_total_bytes']} targets={len(removed_targets)}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
