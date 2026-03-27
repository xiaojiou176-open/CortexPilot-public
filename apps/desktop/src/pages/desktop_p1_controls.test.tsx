import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ChatPanel } from "../components/conversation/ChatPanel";
import { NodeDetailDrawer } from "../components/chain/NodeDetailDrawer";
import { AgentsPage } from "./AgentsPage";
import { CTSessionDetailPage } from "./CTSessionDetailPage";
import { ChangeGatesPage } from "./ChangeGatesPage";
import { CommandTowerPage } from "./CommandTowerPage";
import { ContractsPage } from "./ContractsPage";
import { EventsPage } from "./EventsPage";
import { GodModePage } from "./GodModePage";
import { LocksPage } from "./LocksPage";
import { OverviewPage } from "./OverviewPage";
import { PoliciesPage } from "./PoliciesPage";
import { ReviewsPage } from "./ReviewsPage";
import { TestsPage } from "./TestsPage";
import { WorkflowDetailPage } from "./WorkflowDetailPage";
import { WorkflowsPage } from "./WorkflowsPage";
import { WorktreesPage } from "./WorktreesPage";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("../lib/api", () => ({
  fetchAgents: vi.fn(),
  fetchAgentStatus: vi.fn(),
  fetchCommandTowerOverview: vi.fn(),
  fetchCommandTowerAlerts: vi.fn(),
  fetchPmSessions: vi.fn(),
  fetchPmSession: vi.fn(),
  fetchPmSessionEvents: vi.fn(),
  fetchPmSessionConversationGraph: vi.fn(),
  fetchPmSessionMetrics: vi.fn(),
  postPmSessionMessage: vi.fn(),
  openEventsStream: vi.fn(() => ({ close: vi.fn() })),
  fetchDiffGate: vi.fn(),
  fetchContracts: vi.fn(),
  fetchAllEvents: vi.fn(),
  fetchPendingApprovals: vi.fn(),
  fetchLocks: vi.fn(),
  fetchPolicies: vi.fn(),
  fetchReviews: vi.fn(),
  fetchTests: vi.fn(),
  fetchWorkflow: vi.fn(),
  fetchWorkflows: vi.fn(),
  fetchWorktrees: vi.fn(),
  fetchRuns: vi.fn(),
}));

import {
  fetchAgents,
  fetchAgentStatus,
  fetchCommandTowerOverview,
  fetchCommandTowerAlerts,
  fetchPmSessions,
  fetchPmSession,
  fetchPmSessionEvents,
  fetchPmSessionConversationGraph,
  fetchPmSessionMetrics,
  fetchDiffGate,
  fetchContracts,
  fetchAllEvents,
  fetchPendingApprovals,
  fetchLocks,
  fetchPolicies,
  fetchReviews,
  fetchTests,
  fetchWorkflow,
  fetchWorkflows,
  fetchWorktrees,
  fetchRuns,
} from "../lib/api";

function readCssBundle(entryPath: string, visited: Set<string> = new Set()): string {
  if (!existsSync(entryPath) || visited.has(entryPath)) {
    return "";
  }
  visited.add(entryPath);
  const css = readFileSync(entryPath, "utf8");
  const imports = [...css.matchAll(/@import\s+["'](.+?)["'];/g)];
  let bundledCss = css;
  for (const match of imports) {
    const importTarget = match[1];
    if (!importTarget.endsWith(".css")) {
      continue;
    }
    bundledCss += `\n${readCssBundle(resolve(dirname(entryPath), importTarget), visited)}`;
  }
  return bundledCss;
}

describe("desktop p1 controls", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    });
    Object.defineProperty(URL, "createObjectURL", {
      value: vi.fn(() => "blob:mock"),
      configurable: true,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      value: vi.fn(),
      configurable: true,
    });

    vi.mocked(fetchAgents).mockResolvedValue({ agents: [] } as any);
    vi.mocked(fetchAgentStatus).mockResolvedValue({ machines: [] } as any);
    vi.mocked(fetchCommandTowerOverview).mockResolvedValue({
      total_sessions: 2,
      active_sessions: 1,
      failed_sessions: 1,
      blocked_sessions: 0,
      failed_ratio: 0.2,
      generated_at: "2026-02-19T00:00:00Z",
    } as any);
    vi.mocked(fetchCommandTowerAlerts).mockResolvedValue({ status: "healthy", alerts: [] } as any);
    vi.mocked(fetchPmSessions).mockResolvedValue([
      {
        pm_session_id: "pm-1",
        objective: "obj",
        status: "active",
        run_count: 1,
        success_runs: 0,
        failed_runs: 0,
        blocked_runs: 0,
        running_runs: 1,
        updated_at: "2026-02-19T00:00:00Z",
      },
    ] as any);
    vi.mocked(fetchPmSession).mockResolvedValue({
      session: { pm_session_id: "pm-1", status: "active", latest_run_id: "" },
      runs: [],
    } as any);
    vi.mocked(fetchPmSessionEvents).mockResolvedValue([] as any);
    vi.mocked(fetchPmSessionConversationGraph).mockResolvedValue({ nodes: [], edges: [] } as any);
    vi.mocked(fetchPmSessionMetrics).mockResolvedValue({
      run_count: 0,
      running_runs: 0,
      failed_runs: 0,
      blocked_runs: 0,
      failure_rate: 0,
      mttr_seconds: 0,
    } as any);

    vi.mocked(fetchDiffGate).mockResolvedValue([] as any);
    vi.mocked(fetchContracts).mockResolvedValue([] as any);
    vi.mocked(fetchAllEvents).mockResolvedValue([] as any);
    vi.mocked(fetchPendingApprovals).mockResolvedValue([] as any);
    vi.mocked(fetchLocks).mockResolvedValue([] as any);
    vi.mocked(fetchPolicies).mockResolvedValue({} as any);
    vi.mocked(fetchReviews).mockResolvedValue([] as any);
    vi.mocked(fetchTests).mockResolvedValue([] as any);
    vi.mocked(fetchWorkflow).mockResolvedValue({
      workflow: { workflow_id: "wf-001", status: "running" },
      runs: [],
      events: [],
    } as any);
    vi.mocked(fetchWorkflows).mockResolvedValue([] as any);
    vi.mocked(fetchWorktrees).mockResolvedValue([] as any);
    vi.mocked(fetchRuns).mockResolvedValue([] as any);
  });

  it("covers ChatPanel refresh and NodeDetailDrawer raw toggle controls", async () => {
    const refreshNow = vi.fn();
    const onToggleRaw = vi.fn();

    render(
      <>
        <ChatPanel
          onboardingVisible={false}
          dismissOnboarding={vi.fn()}
          isOffline={false}
          liveError=""
          workspace={{ id: "w1", repo: "cortexpilot-core", branch: "main", path: ".", activeAgents: 1 }}
          activeSessionId="pm-1"
          activeSessionGenerating={false}
          phaseText="phase"
          refreshNow={refreshNow}
          drawerVisible={true}
          drawerPinned={true}
          setDrawerVisible={vi.fn()}
          setDrawerPinned={vi.fn()}
          activeTimeline={[]}
          chatThreadRef={{ current: null }}
          streamingText=""
          reportActions={{}}
          creatingFirstSession={false}
          firstSessionBootstrapError=""
          firstSessionAllowedPath="."
          onCreateFirstSession={vi.fn()}
          onOpenSessionFallback={vi.fn()}
          chooseDecision={vi.fn()}
          recoverableDraft={null}
          restoreDraft={vi.fn()}
          discardDraft={vi.fn()}
          composerRef={{ current: null }}
          composerInput=""
          setComposerInput={vi.fn()}
          onComposerEnterSend={vi.fn()}
          composerPlaceholder="placeholder"
          composerLength={0}
          composerMaxChars={4000}
          composerOverLimit={false}
          canSend={false}
          sendDisabledReason="请输入消息后发送"
          starterPrompts={[]}
          onApplyStarterPrompt={vi.fn()}
          hasActiveGeneration={false}
          stopGeneration={vi.fn()}
          isUserNearBottom={true}
          unreadCount={0}
          onBackToBottom={vi.fn()}
        />
        <NodeDetailDrawer
          open
          selectedNodeId="n1"
          selectedNode={{ id: "n1", data: { label: "N1", role: "Worker", status: "running", subtitle: "s" } } as any}
          reviewDecision="pending"
          showRawNodeOutput={false}
          nodeRawOutput="raw"
          onClose={vi.fn()}
          onToggleRaw={onToggleRaw}
          onOpenDiff={vi.fn()}
        />
      </>,
    );

    fireEvent.click(screen.getByRole("button", { name: "立即刷新" }));
    expect(refreshNow).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "查看原始输出" }));
    expect(onToggleRaw).toHaveBeenCalled();
  });

  it("covers command tower and ct-session p1 controls", async () => {
    const onBack = vi.fn();
    const onNavigateToSession = vi.fn();

    const commandTower = render(<CommandTowerPage onNavigateToSession={onNavigateToSession} />);
    expect(await screen.findByRole("heading", { name: "指挥塔" })).toBeInTheDocument();
    fireEvent.click(await screen.findByRole("button", { name: "更新进展" }));
    fireEvent.click(screen.getByRole("button", { name: "暂停自动更新" }));
    fireEvent.click(screen.getByRole("button", { name: "展开专家信息" }));
    fireEvent.click(screen.getByRole("button", { name: "应用" }));
    fireEvent.click(screen.getByRole("button", { name: "重置" }));
    const focusToggleGroup = screen.getByRole("group", { name: "聚焦视图切换" });
    fireEvent.click(within(focusToggleGroup).getByRole("button", { name: /^全部/ }));
    commandTower.unmount();

    render(<CTSessionDetailPage sessionId="pm-1" onBack={onBack} />);
    expect(await screen.findByRole("heading", { name: "会话透视" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "< 返回会话总览" }));
    expect(onBack).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "暂停实时" }));
    expect(screen.getByRole("button", { name: "恢复实时" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "手动刷新" }));
    await waitFor(() => expect(fetchPmSession).toHaveBeenCalled());
  });

  it("covers refresh/back controls across desktop pages", async () => {
    const onNavigate = vi.fn();

    const agents = render(<AgentsPage />);
    expect(await screen.findByRole("heading", { name: "代理" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "刷新" }));
    await waitFor(() => expect(fetchAgents).toHaveBeenCalledTimes(2));
    agents.unmount();

    const changeGates = render(<ChangeGatesPage />);
    expect(await screen.findByRole("heading", { name: "变更门禁" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "刷新" }));
    await waitFor(() => expect(fetchDiffGate).toHaveBeenCalledTimes(2));
    changeGates.unmount();

    const contracts = render(<ContractsPage />);
    expect(await screen.findByRole("heading", { name: "合约" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "刷新" }));
    await waitFor(() => expect(fetchContracts).toHaveBeenCalledTimes(2));
    contracts.unmount();

    const events = render(<EventsPage />);
    expect(await screen.findByRole("heading", { name: "事件流" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "刷新" }));
    await waitFor(() => expect(fetchAllEvents).toHaveBeenCalledTimes(2));
    events.unmount();

    const godMode = render(<GodModePage />);
    expect(await screen.findByRole("heading", { name: "快速审批" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "刷新" }));
    await waitFor(() => expect(fetchPendingApprovals).toHaveBeenCalledTimes(2));
    godMode.unmount();

    const locks = render(<LocksPage />);
    expect(await screen.findByRole("heading", { name: "锁管理" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "刷新" }));
    await waitFor(() => expect(fetchLocks).toHaveBeenCalledTimes(2));
    locks.unmount();

    const overview = render(<OverviewPage onNavigate={onNavigate} onNavigateToRun={vi.fn()} />);
    expect(await screen.findByRole("heading", { name: "新手起步" })).toBeInTheDocument();
    const recentExceptionsSection = screen.getByRole("region", { name: "最近异常" });
    fireEvent.click(within(recentExceptionsSection).getByRole("button", { name: "查看全部异常" }));
    expect(onNavigate).toHaveBeenCalledWith("events");
    fireEvent.click(screen.getByRole("button", { name: "刷新数据" }));
    await waitFor(() => expect(fetchCommandTowerOverview).toHaveBeenCalledTimes(2));
    overview.unmount();

    const policies = render(<PoliciesPage />);
    expect(await screen.findByRole("heading", { name: "策略" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "刷新" }));
    await waitFor(() => expect(fetchPolicies).toHaveBeenCalledTimes(2));
    policies.unmount();

    const reviews = render(<ReviewsPage />);
    expect(await screen.findByRole("heading", { name: "评审" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "刷新" }));
    await waitFor(() => expect(fetchReviews).toHaveBeenCalledTimes(2));
    reviews.unmount();

    const tests = render(<TestsPage />);
    expect(await screen.findByRole("heading", { name: "测试" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "刷新" }));
    await waitFor(() => expect(fetchTests).toHaveBeenCalledTimes(2));
    tests.unmount();

    const wfDetailOnBack = vi.fn();
    const workflowDetail = render(<WorkflowDetailPage workflowId="wf-001" onBack={wfDetailOnBack} onNavigateToRun={vi.fn()} />);
    expect(await screen.findByText("wf-001")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "返回工作流列表" }));
    expect(wfDetailOnBack).toHaveBeenCalled();
    workflowDetail.unmount();

    const workflows = render(<WorkflowsPage onNavigateToWorkflow={vi.fn()} />);
    expect(await screen.findByRole("heading", { name: "工作流" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "刷新" }));
    await waitFor(() => expect(fetchWorkflows).toHaveBeenCalledTimes(2));
    workflows.unmount();

    const worktrees = render(<WorktreesPage />);
    expect(await screen.findByRole("heading", { name: "工作树" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "刷新" }));
    await waitFor(() => expect(fetchWorktrees).toHaveBeenCalledTimes(2));
    worktrees.unmount();
  });

  it("keeps contrast-safe muted and badge text tokens in desktop styles", () => {
    const cssPathCandidates = [
      (() => {
        try {
          return fileURLToPath(new URL("../styles.css", import.meta.url));
        } catch {
          return "";
        }
      })(),
      resolve(process.cwd(), "src/styles.css"),
      resolve(process.cwd(), "apps/desktop/src/styles.css"),
    ].filter(Boolean);
    const cssPath = cssPathCandidates.find((candidate) => existsSync(candidate));
    expect(cssPath).not.toBeUndefined();
    const css = readCssBundle(cssPath as string);

    expect(css).toContain("--color-text-muted: #6b7280;");
    expect(css).toContain("--color-success-ink: #065f46;");
    expect(css).toContain("--color-warning-ink: #92400e;");
    expect(css).toContain("--color-danger-ink: #b91c1c;");
    expect(css).toContain(".quick-card-desc");
    expect(css).toContain(".badge--muted");
    expect(css).toContain(".sidebar-link");
  });
});
