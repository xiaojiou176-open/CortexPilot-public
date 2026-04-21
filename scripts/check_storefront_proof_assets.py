#!/usr/bin/env python3
from __future__ import annotations

import argparse
import importlib.util
import json
from pathlib import Path
import re


ROOT = Path(__file__).resolve().parents[1]
REGISTRY_PATH = ROOT / "configs" / "storefront_proof_bundle_registry.json"
RENDER_MANIFEST_PATH = ROOT / "configs" / "docs_render_manifest.json"
PROOF_PACK_INDEX = ROOT / "configs" / "public_proof" / "storefront" / "proof-pack-index.json"
USE_CASES_PATH = ROOT / "docs" / "use-cases" / "index.html"
PUBLIC_PROOF_ROOT = ROOT / "configs" / "public_proof"
FORBIDDEN_DOCS_PROOF_SOURCES = [
    ROOT / "docs" / "assets" / "storefront" / "README.md",
    ROOT / "docs" / "assets" / "storefront" / "demo-status.md",
    ROOT / "docs" / "assets" / "storefront" / "benchmark-methodology.md",
    ROOT / "docs" / "assets" / "storefront" / "live-capture-requirements.json",
    ROOT / "docs" / "releases" / "assets" / "news-digest-proof-pack-2026-03-27.json",
    ROOT / "docs" / "releases" / "assets" / "news-digest-healthy-proof-summary-2026-03-27.json",
    ROOT / "docs" / "releases" / "assets" / "news-digest-benchmark-summary-2026-03-27.json",
    ROOT / "docs" / "releases" / "assets" / "news-digest-healthy-proof-2026-03-27.md",
    ROOT / "docs" / "releases" / "assets" / "news-digest-benchmark-summary-2026-03-27.md",
    ROOT / "docs" / "releases" / "assets" / "news-digest-workflow-case-recap-2026-03-27.md",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Validate the public storefront proof asset contract."
    )
    return parser.parse_args()


def _load_json(path: Path) -> dict:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError(f"{path} must contain a JSON object")
    return payload


def _find_render_entry(payload: dict, *, output_path: str) -> dict | None:
    entries = payload.get("entries")
    if not isinstance(entries, list):
        return None
    for item in entries:
        if isinstance(item, dict) and item.get("output_path") == output_path:
            return item
    return None


def _require(condition: bool, message: str, errors: list[str]) -> None:
    if not condition:
        errors.append(message)


def _asset_exists(path_text: str, errors: list[str], *, reason: str) -> None:
    path = ROOT / path_text
    if not path.exists():
        errors.append(f"{reason}: missing asset {path_text}")


def _require_text(path: Path, snippets: list[str], errors: list[str]) -> None:
    text = _normalize_text(path.read_text(encoding="utf-8"))
    for snippet in snippets:
        if _normalize_text(snippet) not in text:
            errors.append(f"{path.relative_to(ROOT)} missing required text: {snippet}")


def _normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", value)).strip()


def _require_any_text(path: Path, alternatives: list[str], errors: list[str], *, label: str) -> None:
    text = _normalize_text(path.read_text(encoding="utf-8"))
    if any(_normalize_text(snippet) in text for snippet in alternatives):
        return
    joined = " | ".join(alternatives)
    errors.append(f"{path.relative_to(ROOT)} missing required text for {label}: {joined}")


def _require_claim_lists(
    bundle: dict,
    bundle_id: str,
    errors: list[str],
    *,
    require_secondary_wording: bool,
) -> None:
    safe_claims = bundle.get("safe_public_claims")
    _require(
        isinstance(safe_claims, list) and len(safe_claims) > 0,
        f"{bundle_id} must keep explicit safe_public_claims",
        errors,
    )
    forbidden_claims = bundle.get("forbidden_claims")
    _require(
        isinstance(forbidden_claims, list) and len(forbidden_claims) > 0,
        f"{bundle_id} must keep explicit forbidden_claims",
        errors,
    )
    if isinstance(forbidden_claims, list):
        forbidden_text = " ".join(_normalize_text(str(item)).lower() for item in forbidden_claims)
        if "official first public baseline" not in forbidden_text:
            errors.append(f"{bundle_id} forbidden_claims must keep the official-first boundary explicit")
    if require_secondary_wording and isinstance(safe_claims, list):
        safe_text = " ".join(_normalize_text(str(item)).lower() for item in safe_claims)
        if "secondary" not in safe_text:
            errors.append(f"{bundle_id} safe_public_claims must describe the secondary public path")


def _require_bundle_assets(
    bundle: dict,
    bundle_id: str,
    errors: list[str],
    *,
    pack_manifest_error: str,
    missing_list_error: str,
    missing_nonempty_error: str,
    assets_missing_error: str,
    roles_missing_error: str,
) -> None:
    pack_manifest = str(bundle.get("pack_manifest") or "").strip()
    _require(bool(pack_manifest), pack_manifest_error, errors)
    if pack_manifest:
        _asset_exists(pack_manifest, errors, reason=f"{bundle_id} pack manifest")
        _require_path_prefix(
            pack_manifest,
            "configs/public_proof/releases_assets/",
            errors,
            reason=f"{bundle_id} pack manifest",
        )

    missing = bundle.get("missing_expected_artifacts")
    _require(isinstance(missing, list), missing_list_error, errors)
    if isinstance(missing, list) and missing:
        errors.append(missing_nonempty_error)

    assets = bundle.get("assets")
    _require(isinstance(assets, list), assets_missing_error, errors)
    if not isinstance(assets, list):
        return

    roles = {str(item.get("role")) for item in assets if isinstance(item, dict)}
    required_roles = {
        "healthy_proof_summary",
        "healthy_proof_summary_machine",
        "benchmark_summary",
        "benchmark_summary_machine",
        "workflow_case_recap",
        "demo_status_ledger",
    }
    if not required_roles.issubset(roles):
        errors.append(roles_missing_error)

    for item in assets:
        if not isinstance(item, dict):
            errors.append(f"{bundle_id} assets[] must contain objects")
            continue
        path_text = str(item.get("path") or "").strip()
        if not path_text:
            errors.append(f"{bundle_id} assets[] contains an entry without path")
            continue
        _asset_exists(path_text, errors, reason=f"{bundle_id} asset")
        if item.get("required_for_claim") is True:
            _require_claim_asset_path(path_text, str(item.get("role") or ""), errors)
        if item.get("required_for_claim") is False:
            _require(
                path_text.endswith((".png", ".gif", ".svg")),
                f"supporting public capture should stay media-only: {path_text}",
                errors,
            )


def _require_path_prefix(path_text: str, prefix: str, errors: list[str], *, reason: str) -> None:
    if not path_text.startswith(prefix):
        errors.append(f"{reason}: expected `{path_text}` to stay under `{prefix}`")


def _require_claim_asset_path(path_text: str, role: str, errors: list[str]) -> None:
    if role == "demo_status_ledger":
        expected_prefix = "configs/public_proof/storefront/"
    else:
        expected_prefix = "configs/public_proof/releases_assets/"
    _require_path_prefix(
        path_text,
        expected_prefix,
        errors,
        reason=f"claim-bearing proof asset `{role}`",
    )


def _load_generator_module() -> object:
    script_path = Path(__file__).resolve().with_name("generate_storefront_proof_pack_index.py")
    spec = importlib.util.spec_from_file_location("openvibecoding_generate_storefront_proof_pack_index", script_path)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)
    return module


def main() -> int:
    _ = parse_args()
    errors: list[str] = []

    if not PROOF_PACK_INDEX.exists():
        print("❌ [storefront-proof-assets] proof-pack index missing")
        return 1
    if not REGISTRY_PATH.exists():
        print("❌ [storefront-proof-assets] storefront proof bundle registry missing")
        return 1
    if not RENDER_MANIFEST_PATH.exists():
        print("❌ [storefront-proof-assets] docs render manifest missing")
        return 1
    if not PUBLIC_PROOF_ROOT.exists():
        print("❌ [storefront-proof-assets] public proof source root missing")
        return 1

    generator = _load_generator_module()
    generator.ROOT = ROOT
    generator.REGISTRY_PATH = REGISTRY_PATH
    generator.OUTPUT_PATH = PROOF_PACK_INDEX
    registry_payload = generator._load_json(generator.REGISTRY_PATH)
    registry_payload["source_registry"] = generator.REGISTRY_PATH.relative_to(ROOT).as_posix()
    expected_payload = generator.build_index(registry_payload)
    current_payload = _load_json(PROOF_PACK_INDEX)
    render_manifest_payload = _load_json(RENDER_MANIFEST_PATH)
    if current_payload != expected_payload:
        errors.append("proof-pack index drifted from generator output")

    for path in FORBIDDEN_DOCS_PROOF_SOURCES:
        if path.exists():
            errors.append(
                f"docs-side proof source must move under configs/public_proof: {path.relative_to(ROOT)}"
            )

    payload = current_payload
    public_contract = registry_payload.get("public_proof_contract")
    _require(isinstance(public_contract, dict), "registry missing public_proof_contract", errors)
    if isinstance(public_contract, dict):
        _require(
            public_contract.get("authoritative_registry_path") == "configs/storefront_proof_bundle_registry.json",
            "public_proof_contract must point at the tracked proof bundle registry",
            errors,
        )
        _require(
            public_contract.get("render_manifest_path") == "configs/docs_render_manifest.json",
            "public_proof_contract must point at the docs render manifest",
            errors,
        )
        required_outputs = public_contract.get("required_rendered_outputs")
        _require(
            isinstance(required_outputs, list) and "configs/public_proof/storefront/proof-pack-index.json" in required_outputs,
            "public_proof_contract must require the proof-pack index output",
            errors,
        )
        contract_inputs = public_contract.get("tracked_contract_inputs")
        _require(
            isinstance(contract_inputs, list) and "configs/storefront_proof_bundle_registry.json" in contract_inputs,
            "public_proof_contract must keep configs-side tracked contract inputs",
            errors,
        )
        _require(
            isinstance(contract_inputs, list)
            and "configs/public_proof/releases_assets/news-digest-proof-pack-2026-03-27.json" in contract_inputs
            and "configs/public_proof/releases_assets/page-brief-proof-pack-2026-04-15.json" in contract_inputs
            and "configs/public_proof/storefront/demo-status.md" in contract_inputs
            and "configs/public_proof/storefront/live-capture-requirements.json" in contract_inputs,
            "public_proof_contract must keep configs/public_proof source ledgers as tracked contract inputs",
            errors,
        )
        _require(
            isinstance(contract_inputs, list)
            and "docs/assets/storefront/demo-status.md" not in contract_inputs
            and "docs/assets/storefront/live-capture-requirements.json" not in contract_inputs,
            "public_proof_contract must not treat docs-side ledgers as tracked contract inputs",
            errors,
        )

    proof_pack_entry = _find_render_entry(render_manifest_payload, output_path="configs/public_proof/storefront/proof-pack-index.json")
    _require(proof_pack_entry is not None, "docs render manifest missing proof-pack index entry", errors)
    if isinstance(proof_pack_entry, dict):
        source_inputs = proof_pack_entry.get("source_inputs")
        _require(
            isinstance(source_inputs, list)
            and "configs/public_proof/releases_assets/news-digest-proof-pack-2026-03-27.json" in source_inputs
            and "configs/public_proof/releases_assets/page-brief-proof-pack-2026-04-15.json" in source_inputs
            and "docs/releases/assets/news-digest-proof-pack-2026-03-27.json" not in source_inputs,
            "proof-pack render entry must read the moved pack manifest from configs/public_proof",
            errors,
        )
        contract_inputs = proof_pack_entry.get("contract_inputs")
        _require(
            isinstance(contract_inputs, list) and "configs/storefront_proof_bundle_registry.json" in contract_inputs,
            "proof-pack render entry must declare configs-side contract inputs",
            errors,
        )
        _require(
            isinstance(contract_inputs, list)
            and "configs/public_proof/releases_assets/news-digest-proof-pack-2026-03-27.json" in contract_inputs
            and "configs/public_proof/releases_assets/page-brief-proof-pack-2026-04-15.json" in contract_inputs
            and "configs/public_proof/storefront/demo-status.md" in contract_inputs
            and "configs/public_proof/storefront/live-capture-requirements.json" in contract_inputs,
            "proof-pack render entry must bind the moved configs/public_proof sources",
            errors,
        )
        _require(
            isinstance(contract_inputs, list)
            and "docs/assets/storefront/demo-status.md" not in contract_inputs
            and "docs/assets/storefront/live-capture-requirements.json" not in contract_inputs,
            "proof-pack render entry must not bind tracked contract inputs to docs-side ledgers",
            errors,
        )
    _require(
        payload.get("artifact_type") == "openvibecoding_public_proof_pack_index",
        "proof-pack index has unexpected artifact_type",
        errors,
    )

    vocabulary = payload.get("vocabulary_contract")
    _require(isinstance(vocabulary, dict), "proof-pack index missing vocabulary_contract", errors)
    if isinstance(vocabulary, dict):
        _require(
            vocabulary.get("proven_workflow_label") == "first proven workflow",
            "proof-pack index must pin the proven workflow label",
            errors,
        )
        _require(
            vocabulary.get("proof_pack_label") == "public proof pack",
            "proof-pack index must pin the proof pack label",
            errors,
        )

    bundles = payload.get("bundles")
    _require(isinstance(bundles, list), "proof-pack index missing bundles[]", errors)
    bundle_map = {}
    if isinstance(bundles, list):
        for item in bundles:
            if isinstance(item, dict) and isinstance(item.get("bundle_id"), str):
                bundle_map[item["bundle_id"]] = item

    for bundle_id in ("news_digest", "topic_brief", "page_brief"):
        _require(bundle_id in bundle_map, f"missing proof bundle `{bundle_id}`", errors)

    news = bundle_map.get("news_digest", {})
    if isinstance(news, dict):
        _require(news.get("proof_state") == "release_proven", "news_digest must stay release_proven", errors)
        _require(
            news.get("claim_scope") == "official_first_public_baseline",
            "news_digest must stay the official first public baseline",
            errors,
        )
        pack_manifest = str(news.get("pack_manifest") or "").strip()
        _require(bool(pack_manifest), "news_digest must reference a pack_manifest", errors)
        if pack_manifest:
            _asset_exists(pack_manifest, errors, reason="news_digest pack manifest")
            _require_path_prefix(
                pack_manifest,
                "configs/public_proof/releases_assets/",
                errors,
                reason="news_digest pack manifest",
            )

        capture_contract = news.get("capture_contract")
        _require(isinstance(capture_contract, dict), "news_digest missing capture_contract", errors)
        if isinstance(capture_contract, dict):
            _require(
                capture_contract.get("healthy_live_capture_gif_present") is True,
                "news_digest capture contract must acknowledge the landed healthy live-capture GIF",
                errors,
            )
            _require(
                capture_contract.get("healthy_english_first_public_capture_set_present") is True,
                "news_digest capture contract must acknowledge the landed healthy English-first public capture set",
                errors,
            )

        missing = news.get("missing_expected_artifacts")
        _require(isinstance(missing, list), "news_digest missing expected_artifacts list", errors)
        if isinstance(missing, list):
            required_missing = {"broader_multi_round_benchmark"}
            missing_set = {str(item) for item in missing}
            if not required_missing.issubset(missing_set):
                errors.append("news_digest missing_expected_artifacts must retain the broader benchmark gap")
            forbidden_missing = {
                "healthy_live_capture_gif",
                "healthy_english_first_public_capture_set",
            }
            if forbidden_missing & missing_set:
                errors.append("news_digest missing_expected_artifacts still lists landed healthy capture assets")

        assets = news.get("assets")
        _require(isinstance(assets, list), "news_digest missing assets[]", errors)
        if isinstance(assets, list):
            roles = {str(item.get("role")) for item in assets if isinstance(item, dict)}
            required_roles = {
                "healthy_proof_summary",
                "healthy_proof_summary_machine",
                "benchmark_summary",
                "benchmark_summary_machine",
                "workflow_case_recap",
                "demo_status_ledger",
                "dashboard_home_capture",
                "dashboard_command_tower_capture",
                "dashboard_runs_capture",
                "healthy_live_capture_gif",
            }
            if not required_roles.issubset(roles):
                errors.append("news_digest bundle lost one or more required proof asset roles")
            for item in assets:
                if not isinstance(item, dict):
                    errors.append("news_digest assets[] must contain objects")
                    continue
                path_text = str(item.get("path") or "").strip()
                if not path_text:
                    errors.append("news_digest assets[] contains an entry without path")
                    continue
                _asset_exists(path_text, errors, reason="news_digest asset")
                if item.get("required_for_claim") is True:
                    _require_claim_asset_path(path_text, str(item.get("role") or ""), errors)
                if item.get("required_for_claim") is False:
                    _require(
                        path_text.endswith((".png", ".gif", ".svg")),
                        f"supporting public capture should stay media-only: {path_text}",
                        errors,
                    )

    topic = bundle_map.get("topic_brief", {})
    if isinstance(topic, dict):
        proof_state = str(topic.get("proof_state") or "").strip()
        _require(
            proof_state in {"showcase_only", "proof_bundle_tracked", "release_proven_secondary"},
            "topic_brief proof_state must stay on the showcase_only -> proof_bundle_tracked -> release_proven_secondary ladder",
            errors,
        )
        missing = topic.get("missing_expected_artifacts")
        _require_claim_lists(
            topic,
            "topic_brief",
            errors,
            require_secondary_wording=proof_state == "release_proven_secondary",
        )
        if isinstance(missing, list):
            expected_missing = {
                "dedicated_healthy_proof_summary",
                "dedicated_benchmark_summary",
                "share_ready_recap",
            }
            if proof_state == "showcase_only" and set(str(item).strip() for item in missing if str(item).strip()) != expected_missing:
                errors.append(
                    "topic_brief missing_expected_artifacts must stay aligned with the dedicated healthy proof summary, dedicated benchmark summary, and share-ready recap gap"
                )
        assets = topic.get("assets")
        if proof_state == "showcase_only":
            _require(
                not str(topic.get("pack_manifest") or "").strip(),
                "topic_brief must not advertise a pack_manifest before its dedicated proof bundle exists",
                errors,
            )
            _require(
                assets in (None, []),
                "topic_brief must not advertise claim-bearing assets before its dedicated proof bundle exists",
                errors,
            )
            _require(
                topic.get("claim_scope") == "public_showcase_path",
                "topic_brief must keep the public_showcase_path claim scope",
                errors,
            )
            _require(
                topic.get("authority_level") == "repo_side_story_surface",
                "topic_brief must keep repo_side_story_surface authority",
                errors,
            )
        elif proof_state == "proof_bundle_tracked":
            _require(
                topic.get("claim_scope") == "search_backed_public_proof_bundle",
                "topic_brief must use search_backed_public_proof_bundle when its dedicated bundle lands",
                errors,
            )
            _require(
                topic.get("authority_level") == "repo_side_public_proof",
                "topic_brief must promote to repo_side_public_proof once its dedicated bundle lands",
                errors,
            )
            _require_bundle_assets(
                topic,
                "topic_brief",
                errors,
                pack_manifest_error="topic_brief tracked bundle must reference a pack_manifest",
                missing_list_error="topic_brief must keep explicit missing_expected_artifacts",
                missing_nonempty_error="topic_brief missing_expected_artifacts must be empty once the tracked bundle lands",
                assets_missing_error="topic_brief tracked bundle missing assets[]",
                roles_missing_error="topic_brief tracked bundle lost one or more required proof asset roles",
            )
        elif proof_state == "release_proven_secondary":
            _require(
                topic.get("claim_scope") == "search_backed_release_proven_secondary_path",
                "topic_brief must keep the search_backed_release_proven_secondary_path claim scope",
                errors,
            )
            _require(
                topic.get("authority_level") == "repo_side_public_proof",
                "topic_brief must keep repo_side_public_proof authority once it becomes release-proven secondary",
                errors,
            )
            _require_bundle_assets(
                topic,
                "topic_brief",
                errors,
                pack_manifest_error="topic_brief must reference a pack_manifest",
                missing_list_error="topic_brief must keep explicit missing_expected_artifacts",
                missing_nonempty_error="topic_brief missing_expected_artifacts must be empty once the release-proven secondary bundle lands",
                assets_missing_error="topic_brief missing assets[]",
                roles_missing_error="topic_brief bundle lost one or more required proof asset roles",
            )

    page = bundle_map.get("page_brief", {})
    page_proof_state = str(page.get("proof_state") or "").strip() if isinstance(page, dict) else ""
    if isinstance(page, dict):
        _require(
            page_proof_state in {"proof_bundle_tracked", "release_proven_secondary"},
            "page_brief must stay proof_bundle_tracked or release_proven_secondary once its browser-backed public proof bundle lands",
            errors,
        )
        _require_claim_lists(
            page,
            "page_brief",
            errors,
            require_secondary_wording=page_proof_state == "release_proven_secondary",
        )
        if page_proof_state == "proof_bundle_tracked":
            _require(
                page.get("claim_scope") == "browser_backed_public_proof_bundle",
                "page_brief must keep the browser_backed_public_proof_bundle claim scope",
                errors,
            )
            _require(
                page.get("authority_level") == "repo_side_public_proof",
                "page_brief must keep repo_side_public_proof authority",
                errors,
            )
            _require_bundle_assets(
                page,
                "page_brief",
                errors,
                pack_manifest_error="page_brief must reference a pack_manifest",
                missing_list_error="page_brief must keep an explicit missing_expected_artifacts list",
                missing_nonempty_error="page_brief missing_expected_artifacts must be empty once the tracked bundle lands",
                assets_missing_error="page_brief missing assets[]",
                roles_missing_error="page_brief bundle lost one or more required proof asset roles",
            )
        elif page_proof_state == "release_proven_secondary":
            _require(
                page.get("claim_scope") == "browser_backed_release_proven_secondary_path",
                "page_brief must keep the browser_backed_release_proven_secondary_path claim scope",
                errors,
            )
            _require(
                page.get("authority_level") == "repo_side_public_proof",
                "page_brief must keep repo_side_public_proof authority once it becomes release-proven secondary",
                errors,
            )
            _require_bundle_assets(
                page,
                "page_brief",
                errors,
                pack_manifest_error="page_brief must reference a pack_manifest",
                missing_list_error="page_brief must keep an explicit missing_expected_artifacts list",
                missing_nonempty_error="page_brief missing_expected_artifacts must be empty once the release-proven secondary bundle lands",
                assets_missing_error="page_brief missing assets[]",
                roles_missing_error="page_brief bundle lost one or more required proof asset roles",
            )

    required_use_case_text = [
        "The current benchmark story is a tracked single-run baseline, not a broad release average.",
    ]
    _require_text(USE_CASES_PATH, required_use_case_text, errors)
    _require_any_text(
        USE_CASES_PATH,
        [
            "Global proof-pack index across the official baseline, tracked bundle, and showcase bundles",
            "Global proof-pack index across the official baseline and the release-proven secondary paths.",
        ],
        errors,
        label="proof-pack index public wording",
    )

    topic_state = str(topic.get("proof_state") or "").strip()
    if topic_state == "showcase_only":
        _require_text(
            USE_CASES_PATH,
            [
                "dedicated healthy proof summary, dedicated benchmark summary, and share-ready recap before it can leave showcase status.",
                "repo-tracked proof pack or another share-ready proof asset on the public surface.",
            ],
            errors,
        )
    elif topic_state == "proof_bundle_tracked":
        _require_any_text(
            USE_CASES_PATH,
            [
                "tracked search-backed public proof bundle",
                "release-proven secondary search-backed public path",
            ],
            errors,
            label="topic_brief tracked/search-backed public wording",
        )
    elif topic_state == "release_proven_secondary":
        _require_any_text(
            USE_CASES_PATH,
            [
                "release-proven secondary public path",
                "release-proven secondary search-backed public path",
            ],
            errors,
            label="topic_brief release-proven secondary wording",
        )

    if page_proof_state == "proof_bundle_tracked":
        _require_any_text(
            USE_CASES_PATH,
            [
                "tracked browser-backed public proof bundle",
                "release-proven secondary browser-backed public path",
            ],
            errors,
            label="page_brief browser-backed public wording",
        )
    elif page_proof_state == "release_proven_secondary":
        _require_any_text(
            USE_CASES_PATH,
            [
                "release-proven secondary public path",
                "release-proven secondary browser-backed public path",
            ],
            errors,
            label="page_brief release-proven secondary wording",
        )

    if errors:
        print("❌ [storefront-proof-assets] public proof asset contract violations:")
        for item in errors:
            print(f"- {item}")
        return 1

    print("✅ [storefront-proof-assets] public proof asset contract satisfied")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
