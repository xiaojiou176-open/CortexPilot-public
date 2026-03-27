import json
from pathlib import Path


def _load_schema(path: Path) -> dict:
    payload = json.loads(path.read_text(encoding="utf-8"))
    payload.pop("$id", None)
    return payload


def test_schema_aliases_match() -> None:
    repo_root = Path(__file__).resolve().parents[3]
    schema_root = repo_root / "schemas"
    pairs = [
        ("task_chain.schema.json", "task_chain.v1.json"),
        ("task_contract.schema.json", "task_contract.v1.json"),
        ("chain_report.schema.json", "chain_report.v1.json"),
        ("task_result.schema.json", "task_result.v1.json"),
        ("review_report.schema.json", "review_report.v1.json"),
        ("test_report.schema.json", "test_report.v1.json"),
        ("reexec_report.schema.json", "reexec_report.v1.json"),
    ]
    for legacy_name, v1_name in pairs:
        legacy = _load_schema(schema_root / legacy_name)
        v1 = _load_schema(schema_root / v1_name)
        assert legacy == v1, f"schema drift: {legacy_name} vs {v1_name}"
