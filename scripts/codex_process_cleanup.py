#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import re
import signal
import subprocess
import time
from dataclasses import dataclass, asdict
from datetime import datetime
from pathlib import Path
from typing import Iterable


@dataclass
class ProcRow:
    pid: int
    ppid: int
    etimes: int
    command: str


def now_ts() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def _parse_etime_to_seconds(etime: str) -> int:
    etime = etime.strip()
    if not etime:
        return 0

    days = 0
    clock = etime
    if "-" in etime:
        day_text, clock = etime.split("-", 1)
        try:
            days = int(day_text)
        except ValueError:
            days = 0

    parts = clock.split(":")
    try:
        if len(parts) == 3:
            hours, minutes, seconds = (int(p) for p in parts)
        elif len(parts) == 2:
            hours = 0
            minutes, seconds = (int(p) for p in parts)
        else:
            hours = 0
            minutes = 0
            seconds = int(parts[0])
    except ValueError:
        return 0

    return days * 86400 + hours * 3600 + minutes * 60 + seconds


def parse_ps_rows() -> list[ProcRow]:
    output = subprocess.check_output(
        ["ps", "-Ao", "pid=,ppid=,etime=,command="],
        text=True,
        stderr=subprocess.DEVNULL,
    )
    rows: list[ProcRow] = []
    for raw in output.splitlines():
        raw = raw.strip()
        if not raw:
            continue
        match = re.match(r"^(\d+)\s+(\d+)\s+([0-9:\-]+)\s+(.*)$", raw)
        if not match:
            continue
        rows.append(
            ProcRow(
                pid=int(match.group(1)),
                ppid=int(match.group(2)),
                etimes=_parse_etime_to_seconds(match.group(3)),
                command=match.group(4),
            )
        )
    return rows


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Clean stale Codex background processes safely.")
    parser.add_argument("--dry-run", action="store_true", help="Only print candidates, do not kill.")
    parser.add_argument(
        "--min-age-sec",
        type=int,
        default=1800,
        help="Only kill processes older than this many seconds (default: 1800).",
    )
    parser.add_argument(
        "--include-cursor",
        action="store_true",
        help="Also clean codex app-server processes launched from Cursor extension.",
    )
    parser.add_argument(
        "--also-clean-mcp",
        action="store_true",
        help="Also clean orphan codex mcp-server processes (ppid=1).",
    )
    parser.add_argument(
        "--log-path",
        default="",
        help="Optional JSONL log path. Default: <repo>/.runtime-cache/logs/runtime/codex_process_cleanup.jsonl",
    )
    return parser


def default_log_path() -> Path:
    repo_root = Path(__file__).resolve().parents[1]
    log_dir = repo_root / ".runtime-cache" / "logs" / "runtime"
    log_dir.mkdir(parents=True, exist_ok=True)
    return log_dir / "codex_process_cleanup.jsonl"


def append_log(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(payload, ensure_ascii=False) + "\n")


def should_target_app_server(row: ProcRow, include_cursor: bool, min_age_sec: int) -> bool:
    cmd_lower = row.command.lower()
    if "codex app-server" not in cmd_lower:
        return False
    if row.ppid != 1:
        return False
    if row.etimes < min_age_sec:
        return False
    if not include_cursor and "cursor" in cmd_lower:
        return False
    return True


def should_target_mcp_server(row: ProcRow, min_age_sec: int) -> bool:
    cmd_lower = row.command.lower()
    if "codex mcp-server" not in cmd_lower:
        return False
    if row.ppid != 1:
        return False
    if row.etimes < min_age_sec:
        return False
    return True


def terminate_pid(pid: int) -> str:
    try:
        os.kill(pid, signal.SIGTERM)
    except ProcessLookupError:
        return "gone"
    except PermissionError:
        return "permission_denied"

    time.sleep(0.5)
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return "terminated"

    try:
        os.kill(pid, signal.SIGKILL)
    except ProcessLookupError:
        return "terminated"
    except PermissionError:
        return "permission_denied"

    time.sleep(0.2)
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return "killed"
    return "still_alive"


def main(argv: Iterable[str] | None = None) -> int:
    args = build_parser().parse_args(list(argv) if argv is not None else None)
    log_path = Path(args.log_path).expanduser().resolve() if args.log_path else default_log_path()

    rows = parse_ps_rows()
    app_targets = [
        row for row in rows if should_target_app_server(row, args.include_cursor, args.min_age_sec)
    ]
    mcp_targets = [row for row in rows if should_target_mcp_server(row, args.min_age_sec)] if args.also_clean_mcp else []
    targets = app_targets + mcp_targets

    print("🧹 Codex stale process cleanup")
    print(f"- dry_run: {args.dry_run}")
    print(f"- min_age_sec: {args.min_age_sec}")
    print(f"- include_cursor: {args.include_cursor}")
    print(f"- also_clean_mcp: {args.also_clean_mcp}")
    print(f"- candidates: {len(targets)}")

    payload = {
        "ts": now_ts(),
        "event": "codex_cleanup_scan",
        "dry_run": args.dry_run,
        "min_age_sec": args.min_age_sec,
        "include_cursor": args.include_cursor,
        "also_clean_mcp": args.also_clean_mcp,
        "candidate_count": len(targets),
        "candidates": [asdict(row) for row in targets],
    }

    killed = 0
    results: list[dict] = []

    if args.dry_run:
        for row in targets:
            print(f"  - pid={row.pid} ppid={row.ppid} age={row.etimes}s :: {row.command[:140]}")
    else:
        for row in targets:
            status = terminate_pid(row.pid)
            if status in {"terminated", "killed", "gone"}:
                killed += 1
            results.append({"pid": row.pid, "status": status, "command": row.command})
            print(f"  - pid={row.pid} => {status}")

    payload["killed_count"] = killed
    payload["results"] = results
    append_log(log_path, payload)

    print(f"- killed: {killed}")
    print(f"- log: {log_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
