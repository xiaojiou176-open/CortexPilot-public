import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("../lib/api", () => ({
  fetchAgents: vi.fn(),
  fetchAgentStatus: vi.fn(),
}));

import AgentsPage from "../app/agents/page";
import { fetchAgents, fetchAgentStatus } from "../lib/api";

describe("agents page presentation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses operations-oriented subtitle instead of developer wording", async () => {
    vi.mocked(fetchAgents).mockResolvedValueOnce({ agents: [], locks: [] } as never);
    vi.mocked(fetchAgentStatus).mockResolvedValueOnce({ agents: [] } as never);

    render(await AgentsPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByText("Triage blocked risk first, confirm available execution seats next, then drill into individual task records.")).toBeInTheDocument();
    expect(screen.getByText("Use role and keyword filters to separate bound agent records from pending scheduling backlog. Without filters, the page shows a full inspection view.")).toBeInTheDocument();
    expect(screen.getByText("Pending tasks stay out of this card to avoid backlog confusion.")).toBeInTheDocument();
  });

  it("shows explicit downgrade warning guidance when data source fails", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(fetchAgents).mockRejectedValueOnce(new Error("agents api unavailable"));
    vi.mocked(fetchAgentStatus).mockResolvedValueOnce({ agents: [] } as never);

    render(await AgentsPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByText("The agent overview is currently in degraded snapshot mode. Re-check run detail before governance actions.")).toBeInTheDocument();
    expect(screen.getByText("Agent registry is temporarily unavailable. Try again later.")).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it("falls back to prefix-only agent labels when ids normalize to empty", async () => {
    vi.mocked(fetchAgents).mockResolvedValueOnce({
      agents: [{ agent_id: "!!!", role: "OPS", lock_count: 0, locked_paths: [] }],
      locks: [],
    } as never);
    vi.mocked(fetchAgentStatus).mockResolvedValueOnce({ agents: [] } as never);

    render(await AgentsPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getAllByText("AGENT").length).toBeGreaterThan(0);
  });

  it("sorts grouped agent rows by normalized agent id", async () => {
    vi.mocked(fetchAgents).mockResolvedValueOnce({
      agents: [
        { agent_id: "agent-000010", role: "OPS", lock_count: 0, locked_paths: [] },
        { agent_id: "agent-000002", role: "OPS", lock_count: 0, locked_paths: [] },
        { agent_id: "agent-000111", role: "OPS", lock_count: 0, locked_paths: [] },
      ],
      locks: [],
    } as never);
    vi.mocked(fetchAgentStatus).mockResolvedValueOnce({ agents: [] } as never);

    render(await AgentsPage({ searchParams: Promise.resolve({}) }));

    const text = document.body.textContent || "";
    expect(text.indexOf("AGENT-000002")).toBeGreaterThan(-1);
    expect(text.indexOf("AGENT-000010")).toBeGreaterThan(-1);
    expect(text.indexOf("AGENT-000111")).toBeGreaterThan(-1);
    expect(text.indexOf("AGENT-000002")).toBeLessThan(text.indexOf("AGENT-000010"));
    expect(text.indexOf("AGENT-000010")).toBeLessThan(text.indexOf("AGENT-000111"));
  });
});
