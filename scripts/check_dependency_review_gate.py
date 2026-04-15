#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CONFIG = ROOT / ".github" / "dependency-review-config.yml"
SEVERITY_RANK = {
    "low": 1,
    "moderate": 2,
    "medium": 2,
    "high": 3,
    "critical": 4,
}


def resolve_github_token() -> str | None:
    if os.environ.get("GH_TOKEN"):
        return os.environ["GH_TOKEN"]
    if os.environ.get("GITHUB_TOKEN"):
        return os.environ["GITHUB_TOKEN"]
    if shutil.which("gh") is None:
        return None

    token_proc = subprocess.run(
        ["gh", "auth", "token"],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    token = token_proc.stdout.strip()
    if token_proc.returncode == 0 and token:
        return token
    return None


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Fail closed on pull requests when newly introduced dependency changes "
            "meet or exceed the repo-owned dependency review severity policy."
        )
    )
    parser.add_argument(
        "--config-file",
        default=str(DEFAULT_CONFIG),
        help="Path to the flat dependency-review YAML policy.",
    )
    parser.add_argument(
        "--repo",
        help="owner/repo override; defaults to GITHUB_REPOSITORY or origin remote",
    )
    parser.add_argument(
        "--base-sha",
        help="Base commit SHA; defaults to GITHUB_BASE_SHA or the pull_request base SHA from GITHUB_EVENT_PATH",
    )
    parser.add_argument(
        "--head-sha",
        help="Head commit SHA; defaults to GITHUB_HEAD_SHA or the pull_request head SHA from GITHUB_EVENT_PATH",
    )
    return parser.parse_args()


def run(cmd: list[str]) -> str:
    proc = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, check=False)
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr.strip() or proc.stdout.strip() or f"command failed: {' '.join(cmd)}")
    return proc.stdout


def infer_repo_slug() -> str:
    if os.environ.get("GITHUB_REPOSITORY"):
        return os.environ["GITHUB_REPOSITORY"].strip()

    raw = run(["git", "remote", "get-url", "origin"]).strip()
    if raw.startswith("git@github.com:"):
        slug = raw[len("git@github.com:") :]
        return slug[:-len(".git")] if slug.endswith(".git") else slug
    parsed = urlparse(raw)
    if parsed.netloc == "github.com" and parsed.path:
        slug = parsed.path.lstrip("/")
        return slug[:-len(".git")] if slug.endswith(".git") else slug
    raise RuntimeError(f"unable to infer GitHub repository from origin remote: {raw}")


def _parse_scalar(value: str) -> object:
    lowered = value.strip().lower()
    if lowered == "true":
        return True
    if lowered == "false":
        return False
    return value.strip()


def load_policy(path: Path) -> dict[str, object]:
    policy: dict[str, object] = {}
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        key, _, value = line.partition(":")
        if not _:
            continue
        policy[key.strip()] = _parse_scalar(value)
    return policy


def resolve_review_shas(args: argparse.Namespace) -> tuple[str, str]:
    base_sha = (args.base_sha or os.environ.get("GITHUB_BASE_SHA") or "").strip()
    head_sha = (args.head_sha or os.environ.get("GITHUB_HEAD_SHA") or "").strip()
    if base_sha and head_sha:
        return base_sha, head_sha

    event_path = os.environ.get("GITHUB_EVENT_PATH", "").strip()
    if event_path:
        payload = json.loads(Path(event_path).read_text(encoding="utf-8"))
        pull_request = payload.get("pull_request")
        if isinstance(pull_request, dict):
            base = pull_request.get("base")
            head = pull_request.get("head")
            if isinstance(base, dict) and isinstance(head, dict):
                base_sha = base_sha or str(base.get("sha") or "").strip()
                head_sha = head_sha or str(head.get("sha") or "").strip()
    if base_sha and head_sha:
        return base_sha, head_sha

    raise RuntimeError("missing dependency review base/head SHAs")


def gh_api_json(path: str, *, token: str) -> object:
    request = Request(
        f"https://api.github.com/{path}",
        headers={
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {token}",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "openvibecoding-dependency-review-gate",
        },
    )
    try:
        with urlopen(request, timeout=30) as response:
            payload = response.read().decode("utf-8")
    except HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace").strip()
        detail = body or exc.reason or f"HTTP {exc.code}"
        raise RuntimeError(f"GitHub dependency review API failed for {path}: HTTP {exc.code}: {detail}") from exc
    except URLError as exc:
        raise RuntimeError(f"GitHub dependency review API failed for {path}: {exc.reason}") from exc
    return json.loads(payload)


def extract_changes(payload: object) -> list[dict[str, object]]:
    if isinstance(payload, list):
        return [item for item in payload if isinstance(item, dict)]
    if isinstance(payload, dict):
        diff = payload.get("diff")
        if isinstance(diff, list):
            return [item for item in diff if isinstance(item, dict)]
    raise RuntimeError(f"unexpected dependency review payload type: {type(payload).__name__}")


def _severity_rank(name: object) -> int:
    if not isinstance(name, str):
        return 0
    return SEVERITY_RANK.get(name.strip().lower(), 0)


def _vulnerability_severity(vulnerability: dict[str, object]) -> str:
    severity = vulnerability.get("severity")
    if isinstance(severity, str) and severity.strip():
        return severity.strip().lower()
    advisory = vulnerability.get("advisory")
    if isinstance(advisory, dict):
        advisory_severity = advisory.get("severity")
        if isinstance(advisory_severity, str) and advisory_severity.strip():
            return advisory_severity.strip().lower()
    advisory_severity = vulnerability.get("advisory_severity")
    if isinstance(advisory_severity, str) and advisory_severity.strip():
        return advisory_severity.strip().lower()
    return "unknown"


def _dependency_label(change: dict[str, object]) -> str:
    ecosystem = str(change.get("ecosystem") or "").strip()
    name = str(change.get("name") or "").strip()
    version = str(change.get("version") or "").strip()
    package_url = str(change.get("package_url") or "").strip()
    parts = [item for item in (ecosystem, name, version) if item]
    if parts:
        return "/".join(parts[:2]) + (f"@{version}" if version else "")
    if package_url:
        return package_url
    return "unknown-dependency"


def evaluate_changes(
    changes: list[dict[str, object]],
    *,
    fail_on_severity: str,
) -> list[str]:
    minimum_rank = _severity_rank(fail_on_severity)
    violations: list[str] = []
    for change in changes:
        change_type = str(change.get("change_type") or change.get("changeType") or "").strip().lower()
        if change_type == "removed":
            continue
        vulnerabilities = change.get("vulnerabilities")
        if not isinstance(vulnerabilities, list):
            continue
        for vulnerability in vulnerabilities:
            if not isinstance(vulnerability, dict):
                continue
            severity = _vulnerability_severity(vulnerability)
            if _severity_rank(severity) < minimum_rank:
                continue
            identifier = (
                str(vulnerability.get("vulnerability_id") or "").strip()
                or str(vulnerability.get("ghsa_id") or "").strip()
                or str(vulnerability.get("advisory_ghsa_id") or "").strip()
                or "unknown-advisory"
            )
            violations.append(
                f"{_dependency_label(change)} introduced {severity} vulnerability {identifier}"
            )
    return violations


def main() -> int:
    args = parse_args()
    config_path = Path(args.config_file).expanduser().resolve()
    if not config_path.exists():
        print(f"❌ [dependency-review-gate] missing config file: {config_path}")
        return 1

    policy = load_policy(config_path)
    fail_on_severity = str(policy.get("fail-on-severity") or "high").strip().lower()
    warn_only = bool(policy.get("warn-only") is True)
    repo = args.repo or infer_repo_slug()
    try:
        base_sha, head_sha = resolve_review_shas(args)
    except RuntimeError as exc:
        print(f"❌ [dependency-review-gate] {exc}")
        return 1

    token = resolve_github_token()
    if not token:
        print("❌ [dependency-review-gate] missing GitHub token: set GH_TOKEN/GITHUB_TOKEN or authenticate gh")
        return 1

    try:
        payload = gh_api_json(
            f"repos/{repo}/dependency-graph/compare/{base_sha}...{head_sha}",
            token=token,
        )
        changes = extract_changes(payload)
    except RuntimeError as exc:
        print(f"❌ [dependency-review-gate] {exc}")
        return 1

    violations = evaluate_changes(changes, fail_on_severity=fail_on_severity)
    if violations:
        header = "⚠️" if warn_only else "❌"
        mode = "warn-only" if warn_only else "fail-closed"
        print(
            f"{header} [dependency-review-gate] {mode}: "
            f"{len(violations)} dependency review violation(s) at severity>={fail_on_severity}"
        )
        for item in violations:
            print(f"- {item}")
        return 0 if warn_only else 1

    print(
        "✅ [dependency-review-gate] no dependency review violations "
        f"at severity>={fail_on_severity} for {repo} {base_sha}...{head_sha}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
