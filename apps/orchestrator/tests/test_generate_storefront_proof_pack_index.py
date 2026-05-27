from __future__ import annotations

import importlib.util
import json
from pathlib import Path


def _load_generator_module() -> object:
    script_path = Path(__file__).resolve().parents[3] / "scripts" / "generate_storefront_proof_pack_index.py"
    spec = importlib.util.spec_from_file_location("openvibecoding_generate_storefront_proof_pack_index", script_path)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)
    return module


def test_generate_storefront_proof_pack_index_builds_assets_from_pack_manifest(tmp_path: Path) -> None:
    module = _load_generator_module()
    root = tmp_path
    (root / "configs" / "public_proof" / "releases_assets").mkdir(parents=True, exist_ok=True)
    (root / "configs" / "public_proof" / "storefront").mkdir(parents=True, exist_ok=True)

    registry = {
        "schema_version": 1,
        "artifact_type": "openvibecoding_storefront_proof_bundle_registry",
        "vocabulary_contract": {
            "proven_workflow_label": "first proven workflow",
            "proof_pack_label": "public proof pack",
            "showcase_label": "showcase expansion",
        },
        "bundles": [
            {
                "bundle_id": "news_digest",
                "task_template": "news_digest",
                "proof_state": "release_proven",
                "claim_scope": "official_first_public_baseline",
                "authority_level": "repo_side_public_proof",
                "public_entrypoint": "docs/use-cases/index.html",
                "pack_manifest": "configs/public_proof/releases_assets/news-digest-proof-pack-2026-03-27.json",
                "safe_public_claims": ["claim"],
                "forbidden_claims": ["forbidden"],
                "capture_contract": {
                    "healthy_live_capture_gif_present": False,
                    "healthy_english_first_public_capture_set_present": False,
                    "current_tracked_dashboard_captures": "local_degraded_non_english_mixed",
                },
                "missing_expected_artifacts": ["healthy_live_capture_gif"],
            },
            {
                "bundle_id": "page_brief",
                "task_template": "page_brief",
                "proof_state": "release_proven_secondary",
                "claim_scope": "browser_backed_release_proven_secondary_path",
                "authority_level": "repo_side_public_proof",
                "public_entrypoint": "docs/use-cases/index.html",
                "pack_manifest": "configs/public_proof/releases_assets/page-brief-proof-pack-2026-04-15.json",
                "safe_public_claims": ["claim"],
                "forbidden_claims": ["forbidden"],
                "missing_expected_artifacts": [],
            }
        ],
    }
    pack_manifest = {
        "artifact_type": "news_digest_public_proof_pack",
        "primary_assets": {
            "proof_summary_markdown": "configs/public_proof/releases_assets/news-digest-healthy-proof-2026-03-27.md",
            "proof_summary_json": "configs/public_proof/releases_assets/news-digest-healthy-proof-summary-2026-03-27.json",
            "benchmark_summary_markdown": "configs/public_proof/releases_assets/news-digest-benchmark-summary-2026-03-27.md",
            "benchmark_summary_json": "configs/public_proof/releases_assets/news-digest-benchmark-summary-2026-03-27.json",
            "workflow_case_recap_markdown": "configs/public_proof/releases_assets/news-digest-workflow-case-recap-2026-03-27.md",
            "demo_status_markdown": "configs/public_proof/storefront/demo-status.md",
        },
        "supporting_assets": {
            "gemini_proof_screenshot": "docs/releases/assets/news-digest-healthy-proof-gemini-2026-03-27.png",
        },
    }
    page_pack_manifest = {
        "artifact_type": "page_brief_public_proof_pack",
        "primary_assets": {
            "proof_summary_markdown": "configs/public_proof/releases_assets/page-brief-healthy-proof-2026-04-15.md",
            "proof_summary_json": "configs/public_proof/releases_assets/page-brief-healthy-proof-summary-2026-04-15.json",
            "benchmark_summary_markdown": "configs/public_proof/releases_assets/page-brief-benchmark-summary-2026-04-15.md",
            "benchmark_summary_json": "configs/public_proof/releases_assets/page-brief-benchmark-summary-2026-04-15.json",
            "workflow_case_recap_markdown": "configs/public_proof/releases_assets/page-brief-workflow-case-recap-2026-04-15.md",
            "demo_status_markdown": "configs/public_proof/storefront/demo-status.md",
        },
        "supporting_assets": {},
    }
    registry_path = root / "configs" / "storefront_proof_bundle_registry.json"
    registry_path.write_text(json.dumps(registry, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    manifest_path = root / "configs" / "public_proof" / "releases_assets" / "news-digest-proof-pack-2026-03-27.json"
    manifest_path.write_text(json.dumps(pack_manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    page_manifest_path = root / "configs" / "public_proof" / "releases_assets" / "page-brief-proof-pack-2026-04-15.json"
    page_manifest_path.write_text(json.dumps(page_pack_manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    module.ROOT = root
    module.REGISTRY_PATH = registry_path
    module.OUTPUT_PATH = root / "configs" / "public_proof" / "storefront" / "proof-pack-index.json"

    registry_payload = module._load_json(registry_path)
    registry_payload["source_registry"] = "configs/storefront_proof_bundle_registry.json"
    rendered = module.build_index(registry_payload)

    assert rendered["artifact_type"] == "openvibecoding_public_proof_pack_index"
    assert rendered["source_registry"] == "configs/storefront_proof_bundle_registry.json"
    news = rendered["bundles"][0]
    roles = {item["role"] for item in news["assets"]}
    assert "healthy_proof_summary" in roles
    assert "benchmark_summary_machine" in roles
    assert "gemini_proof_screenshot" in roles
    page = rendered["bundles"][1]
    page_roles = {item["role"] for item in page["assets"]}
    assert page["proof_state"] == "release_proven_secondary"
    assert page["claim_scope"] == "browser_backed_release_proven_secondary_path"
    assert page["pack_manifest"] == "configs/public_proof/releases_assets/page-brief-proof-pack-2026-04-15.json"
    assert page_roles == {
        "healthy_proof_summary",
        "healthy_proof_summary_machine",
        "benchmark_summary",
        "benchmark_summary_machine",
        "workflow_case_recap",
        "demo_status_ledger",
    }


def test_generate_storefront_proof_pack_index_supports_topic_brief_release_proven_secondary_bundle(tmp_path: Path) -> None:
    module = _load_generator_module()
    root = tmp_path
    (root / "configs" / "public_proof" / "releases_assets").mkdir(parents=True, exist_ok=True)
    (root / "configs" / "public_proof" / "storefront").mkdir(parents=True, exist_ok=True)

    registry = {
        "schema_version": 1,
        "artifact_type": "openvibecoding_storefront_proof_bundle_registry",
        "bundles": [
            {
                "bundle_id": "topic_brief",
                "task_template": "topic_brief",
                "proof_state": "release_proven_secondary",
                "claim_scope": "search_backed_release_proven_secondary_path",
                "authority_level": "repo_side_public_proof",
                "public_entrypoint": "docs/use-cases/index.html",
                "pack_manifest": "configs/public_proof/releases_assets/topic-brief-proof-pack-2026-04-15.json",
                "safe_public_claims": ["topic_brief is now a release-proven secondary search-backed path"],
                "forbidden_claims": ["topic_brief is the official first public baseline today"],
                "missing_expected_artifacts": [],
            }
        ],
    }
    topic_pack_manifest = {
        "artifact_type": "topic_brief_public_proof_pack",
        "primary_assets": {
            "proof_summary_markdown": "configs/public_proof/releases_assets/topic-brief-healthy-proof-2026-04-15.md",
            "proof_summary_json": "configs/public_proof/releases_assets/topic-brief-healthy-proof-summary-2026-04-15.json",
            "benchmark_summary_markdown": "configs/public_proof/releases_assets/topic-brief-benchmark-summary-2026-04-15.md",
            "benchmark_summary_json": "configs/public_proof/releases_assets/topic-brief-benchmark-summary-2026-04-15.json",
            "workflow_case_recap_markdown": "configs/public_proof/releases_assets/topic-brief-workflow-case-recap-2026-04-15.md",
            "demo_status_markdown": "configs/public_proof/storefront/demo-status.md",
        },
        "supporting_assets": {},
    }
    registry_path = root / "configs" / "storefront_proof_bundle_registry.json"
    registry_path.write_text(json.dumps(registry, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    manifest_path = root / "configs" / "public_proof" / "releases_assets" / "topic-brief-proof-pack-2026-04-15.json"
    manifest_path.write_text(json.dumps(topic_pack_manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    module.ROOT = root
    module.REGISTRY_PATH = registry_path
    module.OUTPUT_PATH = root / "configs" / "public_proof" / "storefront" / "proof-pack-index.json"

    rendered = module.build_index(module._load_json(registry_path))
    topic = rendered["bundles"][0]
    topic_roles = {item["role"] for item in topic["assets"]}
    assert topic["proof_state"] == "release_proven_secondary"
    assert topic["claim_scope"] == "search_backed_release_proven_secondary_path"
    assert topic_roles == {
        "healthy_proof_summary",
        "healthy_proof_summary_machine",
        "benchmark_summary",
        "benchmark_summary_machine",
        "workflow_case_recap",
        "demo_status_ledger",
    }
