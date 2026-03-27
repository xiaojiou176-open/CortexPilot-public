#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_REGISTRY = ROOT / "configs" / "docs_nav_registry.json"
PRIMARY_NAV_DOCS = (
    ROOT / "docs" / "README.md",
    ROOT / "docs" / "runbooks" / "README.md",
    ROOT / "docs" / "governance" / "README.md",
)
PRIMARY_NAV_REFERENCE_EXEMPTIONS = {"docs/README.md"}


def _nav_tokens(path: str) -> set[str]:
    rel = Path(path)
    tokens = {path}
    if rel.name.lower() != "readme.md":
        tokens.add(rel.name)
    if path.startswith("docs/"):
        tokens.add(path.removeprefix("docs/"))
    for prefix in ("docs/runbooks/", "docs/governance/", "docs/ai/", "docs/archive/"):
        if path.startswith(prefix):
            tokens.add(path.removeprefix(prefix))
    return {token for token in tokens if token}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Validate the curated docs navigation registry and active/archive boundaries."
    )
    parser.add_argument("--registry", default=str(DEFAULT_REGISTRY))
    return parser.parse_args()


def _load_registry(path: Path) -> list[dict[str, object]]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    entries = payload.get("entries")
    if not isinstance(entries, list):
        raise SystemExit("❌ [docs-nav] invalid registry: entries(list) required")
    return entries


def main() -> int:
    args = parse_args()
    registry_path = Path(args.registry).expanduser().resolve()
    entries = _load_registry(registry_path)
    errors: list[str] = []

    nav_text = "\n".join(
        path.read_text(encoding="utf-8")
        for path in PRIMARY_NAV_DOCS
        if path.is_file()
    )
    active_primary_targets = {
        str(item.get("path") or "").strip()
        for item in entries
        if item.get("status") == "active" and item.get("listed_in_primary_navigation") is True
    }
    archived_targets = {
        str(item.get("path") or "").strip()
        for item in entries
        if item.get("status") == "archived"
    }

    for item in entries:
        path = str(item.get("path") or "").strip()
        if not path:
            errors.append("registry entry missing path")
            continue
        abs_path = ROOT / path
        if not abs_path.exists():
            errors.append(f"registered path missing on disk: {path}")
        if item.get("listed_in_primary_navigation") is True and (
            item.get("status") != "active"
            or (item.get("canonical") is not True and item.get("generated") is not True)
        ):
            errors.append(f"primary navigation entry must be active canonical or generated: {path}")
        if item.get("status") == "active" and item.get("listed_in_primary_navigation") is True and not any(
            token in nav_text for token in _nav_tokens(path)
        ) and path not in PRIMARY_NAV_REFERENCE_EXEMPTIONS:
            errors.append(f"active primary-nav doc not referenced by navigation: {path}")

    for path in archived_targets:
        if any(token in nav_text for token in _nav_tokens(path)):
            errors.append(f"archived path must not appear in primary navigation: {path}")

    for path in active_primary_targets:
        if path in PRIMARY_NAV_REFERENCE_EXEMPTIONS:
            continue
        if not any(token in nav_text for token in _nav_tokens(path)):
            errors.append(f"missing required primary navigation reference: {path}")

    if errors:
        print("❌ [docs-nav] navigation registry violations:")
        for item in errors:
            print(f"- {item}")
        return 1

    print(
        "✅ [docs-nav] curated navigation registry is consistent "
        f"({len(active_primary_targets)} primary-nav entries, {len(entries)} total registry entries)"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
