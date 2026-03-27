#!/usr/bin/env python3
from __future__ import annotations

import os
import signal
import subprocess
import threading
import time
from pathlib import Path
from typing import Any


def _terminate_process_group(proc: subprocess.Popen[str]) -> None:
    if proc.poll() is not None:
        return

    try:
        os.killpg(proc.pid, signal.SIGTERM)
    except ProcessLookupError:
        return
    except Exception:
        proc.terminate()

    time.sleep(0.2)
    if proc.poll() is not None:
        return

    try:
        os.killpg(proc.pid, signal.SIGKILL)
    except ProcessLookupError:
        return
    except Exception:
        proc.kill()


def run_codex_once(
    *,
    prompt: str,
    md_path: Path,
    cwd: Path,
    codex_bin: str,
    model: str,
    profile: str,
    timeout_sec: int,
    dry_run: bool,
    print_lock: threading.Lock,
) -> tuple[bool, str, dict[str, Any]]:
    cmd: list[str] = [
        codex_bin,
        "exec",
        "--skip-git-repo-check",
        "--cd",
        str(cwd),
        "--sandbox",
        "read-only",
        "--output-last-message",
        str(md_path),
    ]
    if model:
        cmd.extend(["--model", model])
    if profile:
        cmd.extend(["--profile", profile])
    cmd.append(prompt)

    if dry_run:
        with print_lock:
            print(f"[DRY-RUN] {' '.join(cmd[:8])} ... <PROMPT>")
        return True, "dry-run", {"provider": "codex", "dry_run": True}

    try:
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            start_new_session=True,
        )
        stdout, stderr = process.communicate(timeout=max(30, timeout_sec))
    except subprocess.TimeoutExpired:
        _terminate_process_group(process)
        return (
            False,
            f"timeout>{timeout_sec}s",
            {"provider": "codex", "error_type": "timeout", "killed_process_group": True},
        )
    except FileNotFoundError:
        return (
            False,
            f"codex binary not found: {codex_bin}",
            {"provider": "codex", "error_type": "binary_not_found"},
        )
    except Exception as exc:  # noqa: BLE001
        return (
            False,
            f"unexpected error: {exc}",
            {"provider": "codex", "error_type": "unexpected", "error": str(exc)},
        )

    meta: dict[str, Any] = {
        "provider": "codex",
        "returncode": process.returncode,
        "stderr_tail": (stderr or "").strip().splitlines()[-1:] if stderr else [],
        "stdout_tail": (stdout or "").strip().splitlines()[-1:] if stdout else [],
    }

    if process.returncode != 0:
        err_lines = (stderr or "").strip().splitlines()
        msg = err_lines[-1] if err_lines else f"returncode={process.returncode}"
        return False, msg, meta

    if not md_path.exists() or not md_path.read_text(encoding="utf-8").strip():
        return False, "codex returned empty markdown", meta

    return True, "ok", meta
