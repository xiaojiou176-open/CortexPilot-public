from __future__ import annotations

from cortexpilot_orch.mcp_queue_pilot_server import CortexPilotQueuePilotMcpServer


def test_mcp_queue_pilot_server_lists_tools_and_requires_confirm_for_apply() -> None:
    captured: dict[str, object] = {}

    def _preview(run_id: str, payload: dict[str, object]) -> dict[str, object]:
        captured["preview"] = {"run_id": run_id, "payload": payload}
        return {
            "run_id": run_id,
            "validation": "fail-closed",
            "can_apply": True,
            "preview_item": {"queue_id": "preview-1", "status": "PENDING"},
        }

    def _apply(run_id: str, payload: dict[str, object]) -> dict[str, object]:
        captured["apply"] = {"run_id": run_id, "payload": payload}
        return {"queue_id": "queue-1", "task_id": "task-1", "status": "PENDING"}

    server = CortexPilotQueuePilotMcpServer(
        preview_enqueue_fn=_preview,
        enqueue_fn=_apply,
    )

    tools_response = server.handle_message({"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}})
    assert tools_response is not None
    tool_names = [item["name"] for item in tools_response["result"]["tools"]]
    assert "preview_enqueue_from_run" in tool_names
    assert "enqueue_from_run" in tool_names

    preview_response = server.handle_message(
        {
            "jsonrpc": "2.0",
            "id": 2,
            "method": "tools/call",
            "params": {
                "name": "preview_enqueue_from_run",
                "arguments": {"run_id": "run-1", "priority": 5},
            },
        }
    )
    assert preview_response is not None
    assert preview_response["result"]["structuredContent"]["preview_item"]["status"] == "PENDING"
    assert captured["preview"] == {"run_id": "run-1", "payload": {"priority": 5}}

    blocked_apply = server.handle_message(
        {
            "jsonrpc": "2.0",
            "id": 3,
            "method": "tools/call",
            "params": {
                "name": "enqueue_from_run",
                "arguments": {"run_id": "run-1", "priority": 5, "confirm": False},
            },
        }
    )
    assert blocked_apply is not None
    assert blocked_apply["result"]["isError"] is True

    apply_response = server.handle_message(
        {
            "jsonrpc": "2.0",
            "id": 4,
            "method": "tools/call",
            "params": {
                "name": "enqueue_from_run",
                "arguments": {"run_id": "run-1", "priority": 5, "confirm": True},
            },
        }
    )
    assert apply_response is not None
    assert apply_response["result"]["structuredContent"]["queue_id"] == "queue-1"
    assert captured["apply"] == {"run_id": "run-1", "payload": {"priority": 5}}
