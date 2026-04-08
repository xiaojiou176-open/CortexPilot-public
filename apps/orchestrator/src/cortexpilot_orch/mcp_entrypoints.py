from __future__ import annotations

from cortexpilot_orch.mcp_readonly_server import serve_readonly_mcp


def readonly_mcp_main() -> None:
    serve_readonly_mcp()
