from __future__ import annotations

from pathlib import Path

from openvibecoding_orch.scheduler.scheduler import Orchestrator


def execute_task_flow(
    orchestrator: Orchestrator,
    contract_path: Path,
    mock_mode: bool = False,
    workflow_binding: dict[str, str] | None = None,
) -> str:
    return orchestrator.execute_task(contract_path, mock_mode=mock_mode, workflow_binding=workflow_binding)


def execute_chain_flow(orchestrator: Orchestrator, chain_path: Path, mock_mode: bool = False) -> dict:
    return orchestrator.execute_chain(chain_path, mock_mode=mock_mode)
