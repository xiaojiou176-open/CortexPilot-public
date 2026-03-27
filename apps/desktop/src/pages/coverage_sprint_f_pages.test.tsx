import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AgentsPage } from "./AgentsPage";
import { LocksPage } from "./LocksPage";
import { WorkflowsPage } from "./WorkflowsPage";
import { WorktreesPage } from "./WorktreesPage";

vi.mock("../lib/api", () => ({
  fetchAgents: vi.fn(),
  fetchAgentStatus: vi.fn(),
  fetchLocks: vi.fn(),
  fetchWorkflows: vi.fn(),
  fetchWorktrees: vi.fn(),
}));

import {
  fetchAgents,
  fetchAgentStatus,
  fetchLocks,
  fetchWorkflows,
  fetchWorktrees,
} from "../lib/api";

describe("coverage sprint F: low-branch pages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("covers AgentsPage non-empty, refresh to empty, and error branch", async () => {
    type FirstAgentsPayload = Awaited<ReturnType<typeof fetchAgents>>;
    let resolveFirstAgents: (value: FirstAgentsPayload) => void = () => {};
    vi.mocked(fetchAgents)
      .mockImplementationOnce(
        () => new Promise<FirstAgentsPayload>((resolve) => { resolveFirstAgents = resolve; }) as any,
      )
      .mockResolvedValueOnce({ agents: [] } as any)
      .mockRejectedValueOnce(new Error("agents boom"));
    vi.mocked(fetchAgentStatus)
      .mockResolvedValueOnce({ machines: [{ agent_id: "a-1", role: "TL", status: "running", run_id: "run-1234567890abcdef" }] } as any)
      .mockResolvedValueOnce({ machines: [] } as any)
      .mockResolvedValueOnce({ machines: [] } as any);

    render(<AgentsPage />);
    expect(screen.getByRole("button", { name: "刷新中..." })).toBeDisabled();
    resolveFirstAgents({ agents: [{ agent_id: "a-1", role: "TL", type: "worker" }] } as FirstAgentsPayload);
    expect(await screen.findByText("活跃状态机")).toBeInTheDocument();
    expect(screen.getByText("注册代理 (1)")).toBeInTheDocument();
    expect(screen.getByText("run-12345678")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "刷新" }));
    expect(await screen.findByText("暂无注册代理")).toBeInTheDocument();
    expect(screen.queryByText("活跃状态机")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "刷新" }));
    const errorBanner = await screen.findByRole("alert");
    expect(errorBanner).toHaveTextContent("agents boom");
  });

  it("covers LocksPage data fallbacks, empty branch, and non-Error rejection", async () => {
    vi.mocked(fetchLocks)
      .mockResolvedValueOnce([
        { path: "/tmp/1", holder: "pm", type: "file", acquired_at: "2026-02-20T00:00:00Z" },
        { resource: "/tmp/2", agent_id: "agent-2", lock_type: "resource" },
      ] as any)
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce("lock-failed");

    render(<LocksPage />);
    expect(await screen.findByText("/tmp/1")).toBeInTheDocument();
    expect(screen.getByText("/tmp/2")).toBeInTheDocument();
    expect(screen.getByText("agent-2")).toBeInTheDocument();
    expect(screen.getByText("-")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "刷新" }));
    expect(await screen.findByText("暂无锁记录")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "刷新" }));
    expect(await screen.findByText("lock-failed")).toBeInTheDocument();
  });

  it("covers WorktreesPage locked/unlocked branches and empty branch", async () => {
    vi.mocked(fetchWorktrees)
      .mockResolvedValueOnce([
        { path: "/repo/wt-1", branch: "main", head: "abcdef1234567890", locked: true },
        { path: "/repo/wt-2", branch: "feat/a", commit: "1234567890abcdef", locked: false },
      ] as any)
      .mockResolvedValueOnce([]);

    render(<WorktreesPage />);
    expect(await screen.findByText("/repo/wt-1")).toBeInTheDocument();
    expect(screen.getByText("abcdef123456")).toBeInTheDocument();
    expect(screen.getByText("已锁定")).toBeInTheDocument();
    expect(screen.getByText("1234567890ab")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "刷新" }));
    expect(await screen.findByText("暂无工作树")).toBeInTheDocument();
  });

  it("covers WorkflowsPage navigation, namespace/runs fallback, empty and error branches", async () => {
    const onNavigate = vi.fn();
    vi.mocked(fetchWorkflows)
      .mockResolvedValueOnce([{ workflow_id: "wf-1", status: "running", namespace: "", runs: undefined }] as any)
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(new Error("workflows down"));

    render(<WorkflowsPage onNavigateToWorkflow={onNavigate} />);
    const workflowLink = await screen.findByRole("button", { name: "wf-1" });
    fireEvent.click(workflowLink);
    expect(onNavigate).toHaveBeenCalledWith("wf-1");
    expect(screen.getByText("0")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "刷新" }));
    expect(await screen.findByText("暂无工作流")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "刷新" }));
    await waitFor(() => {
      expect(screen.getByText("workflows down")).toBeInTheDocument();
    });
  });
});
