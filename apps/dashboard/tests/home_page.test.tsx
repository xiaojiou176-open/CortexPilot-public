import { render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockCookies } = vi.hoisted(() => ({
  mockCookies: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, prefetch: _prefetch, ...props }: { href: string; children: ReactNode; prefetch?: boolean }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("../lib/api", () => ({
  fetchRuns: vi.fn(),
  fetchWorkflows: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: mockCookies,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
  usePathname: () => "/",
}));

import Home from "../app/page";
import RunsPage from "../app/runs/page";
import { metadata } from "../app/layout";
import DashboardShellChrome from "../components/DashboardShellChrome";
import { fetchRuns, fetchWorkflows } from "../lib/api";
import { getUiCopy } from "@cortexpilot/frontend-shared/uiCopy";

describe("dashboard home run-summary clarity", () => {
  const mockFetchRuns = vi.mocked(fetchRuns);
  const mockFetchWorkflows = vi.mocked(fetchWorkflows);

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchRuns.mockResolvedValue([]);
    mockFetchWorkflows.mockResolvedValue([]);
    mockCookies.mockResolvedValue({
      toString: () => "",
    });
  });

  it("renders first-run CTA and onboarding guidance when no runs", async () => {
    render(await Home());

    expect(screen.getByRole("heading", { name: "Command Tower for Codex and Claude Code workflows" })).toBeInTheDocument();
    expect(
      screen.getByText(/Start one workflow case, watch Command Tower, then inspect Proof & Replay\./)
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Start first task" })).toHaveAttribute("href", "/pm");
    expect(screen.getAllByRole("link", { name: /Workflow Cases/ })[0]).toHaveAttribute("href", "/workflows");

    const firstLoop = screen.getByLabelText("Start your first task in four steps");
    expect(within(firstLoop).getByRole("link", { name: /Describe the request \(goal \+ acceptance\)/ })).toHaveAttribute("href", "/pm");
    expect(within(firstLoop).getByRole("link", { name: /Watch live progress \(confirm it is moving\)/ })).toHaveAttribute("href", "/command-tower");
    expect(within(firstLoop).getByRole("link", { name: /Confirm the Workflow Case/ })).toHaveAttribute("href", "/workflows");
    expect(within(firstLoop).getByRole("link", { name: /Inspect Proof & Replay/ })).toHaveAttribute("href", "/runs");
    expect(screen.getByRole("link", { name: /Approval checkpoint \(only when review is required\)/ })).toHaveAttribute("href", "/god-mode");

    expect(within(firstLoop).getAllByText(/Step\s[1-4]/)).toHaveLength(4);
    expect(within(firstLoop).getByText(/Start with the request, watch Command Tower, confirm the Workflow Case, then inspect Proof & Replay\./)).toBeInTheDocument();
    expect(screen.getByText(/Each entry keeps the task ID, failure clue, and next operator action visible\./)).toBeInTheDocument();
    expect(screen.getByText("Release-proven first run")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /news_digest/i })[0]).toHaveAttribute("href", "/pm?template=news_digest");
    expect(screen.getByText("Proof state: official public baseline")).toBeInTheDocument();
    expect(screen.getByText("Works with today's coding-agent ecosystem")).toBeInTheDocument();
    expect(screen.getByText("AI surfaces in the real workflow")).toBeInTheDocument();
    expect(screen.getByText("@cortexpilot/frontend-api-client")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open ecosystem map" })).toHaveAttribute(
      "href",
      "https://xiaojiou176-open.github.io/CortexPilot-public/ecosystem/"
    );
    expect(screen.getByRole("link", { name: "Open builder quickstart" })).toHaveAttribute(
      "href",
      "https://xiaojiou176-open.github.io/CortexPilot-public/builders/"
    );
    expect(screen.getAllByText("Public case gallery baseline").length).toBeGreaterThan(0);
    expect(screen.getByText("Live Workflow Case gallery")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open use-case guide" })).toHaveAttribute(
      "href",
      "https://xiaojiou176-open.github.io/CortexPilot-public/use-cases/"
    );
    expect(screen.getByText("News digest gallery card")).toBeInTheDocument();
    expect(screen.getByText("Primary report: news_digest_result.json")).toBeInTheDocument();
    expect(screen.getByText("Risk summary")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Governance entry: open runs" })).toHaveAttribute("href", "/runs");
    expect(screen.getByText("Stable: no recent failed runs (0%)")).toHaveClass("badge--success");
    expect(screen.getByRole("progressbar", { name: "Failure share 0/0" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View all runs" })).toHaveAttribute("href", "/runs");
    expect(screen.queryByRole("link", { name: "Open Command Tower" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Quick approval" })).not.toBeInTheDocument();
  }, 30000);

  it("keeps the shared home copy contract aligned across locales", () => {
    const en = getUiCopy("en").dashboard.homePhase2;
    const zh = getUiCopy("zh-CN").dashboard.homePhase2;

    expect(en.productSpineCards).toHaveLength(3);
    expect(zh.productSpineCards).toHaveLength(en.productSpineCards.length);
    expect(zh.publicTemplateCards).toHaveLength(en.publicTemplateCards.length);
    expect(zh.publicAdvantageCards).toHaveLength(en.publicAdvantageCards.length);
    expect(zh.caseGalleryBaselineCards).toHaveLength(en.caseGalleryBaselineCards.length);
    expect(zh.firstTaskGuideSteps).toHaveLength(en.firstTaskGuideSteps.length);
    expect(en.publicTemplatesActionHref).toBe("/pm");
    expect(zh.liveCaseGalleryActionHref).toBe("/workflows");
    expect(en.optionalApprovalStep.href).toBe("/god-mode");
    expect(zh.builderQuickstartCtaHref).toBe("https://xiaojiou176-open.github.io/CortexPilot-public/builders/");
  });

  it("switches CTA wording once run history exists", async () => {
    mockFetchRuns.mockResolvedValueOnce([
      {
        run_id: "run-0",
        task_id: "task-0",
        status: "SUCCESS",
      },
    ] as never[]);

    render(await Home());
    expect(screen.getByRole("link", { name: "Start new task" })).toHaveAttribute("href", "/pm");
    expect(screen.queryByRole("link", { name: "Start first task" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Start your first task in four steps")).not.toBeInTheDocument();
  });

  it("renders zh-CN home copy when the locale cookie requests it", async () => {
    mockCookies.mockResolvedValue({
      toString: () => "cortexpilot.ui.locale=zh-CN",
    });

    render(await Home());

    expect(screen.getByRole("heading", { name: "面向 Codex 和 Claude Code 工作流的指挥塔" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "启动首个任务" })).toHaveAttribute("href", "/pm");
    expect(screen.getByText("与当前 coding-agent 生态的关系")).toBeInTheDocument();
    expect(screen.getByText("AI 功能已经进入主工作流")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "打开 builder 快速入口" })).toHaveAttribute(
      "href",
      "https://xiaojiou176-open.github.io/CortexPilot-public/builders/"
    );
    expect(screen.getByText("显示四步首跑流程")).toBeInTheDocument();
  });

  it("maps latest failure category to semantic label and provides governance link", async () => {
    mockFetchRuns.mockResolvedValueOnce([
      {
        run_id: "run-1",
        task_id: "task-1",
        status: "FAILED",
        failure_class: "manual",
        action_hint_zh: "完成人工确认后继续",
      },
    ] as never[]);

    render(await Home());
    expect(screen.getByText("Risk summary")).toBeInTheDocument();
    expect(screen.getByText("Failure category: Manual review required")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Governance entry: inspect failure events" })).toHaveAttribute("href", "/events");
    expect(screen.queryByText(/^manual$/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Run run-1" })).toHaveAttribute("href", "/runs/run-1");
    expect(screen.getByText(/Task: task-1 · Manual review required/)).toBeInTheDocument();
    const handleFailureLink = screen.getByRole("link", { name: "Handle failure run-1" });
    expect(handleFailureLink).toHaveAttribute("href", "/events?run_id=run-1");
    expect(handleFailureLink.closest("span")).toHaveClass("cell-danger");
  });

  it("shows high-risk distribution semantics when failure rate is high", async () => {
    mockFetchRuns.mockResolvedValueOnce([
      { run_id: "run-1", task_id: "task-1", status: "FAILED" },
      { run_id: "run-2", task_id: "task-2", status: "ERROR" },
      { run_id: "run-3", task_id: "task-3", status: "FAILURE" },
      { run_id: "run-4", task_id: "task-4", status: "SUCCESS" },
    ] as never[]);

    render(await Home());
    expect(screen.getByText("Success 1 / Running 0 / Failed 3")).toHaveClass("metric-value--danger");
    expect(screen.getByText("High risk: failure rate is elevated, investigate first (75%)")).toHaveClass("badge--failed");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Investigate high-risk failures" })).toHaveAttribute("href", "/events");
    expect(screen.getAllByRole("link", { name: /Handle failure run-/ })).toHaveLength(3);
    expect(screen.getByRole("link", { name: "Handle failure run-1" })).toHaveAttribute("href", "/events?run_id=run-1");
    const progressBar = screen.getByRole("progressbar", { name: "Failure share 3/4" });
    expect(progressBar).toHaveAttribute("max", "4");
    expect(progressBar).toHaveAttribute("value", "3");
  });

  it("renders long run id with suffix-plus-task format for faster distinction", async () => {
    mockFetchRuns.mockResolvedValueOnce([
      {
        run_id: "run-20260221-aaaaaaaa11111111",
        task_id: "task-20260221-abcde12345",
        status: "SUCCESS",
      },
    ] as never[]);

    render(await Home());
    const runLink = screen.getByRole("link", { name: "Run run-20260221-aaaaaaaa11111111" });
    expect(runLink).toHaveTextContent("aa11111111 · abcde12345");
    expect(runLink).toHaveAttribute("title", "run-20260221-aaaaaaaa11111111");
  });

  it("falls back to raw timestamps and placeholder ids when run metadata is incomplete", async () => {
    mockFetchRuns.mockResolvedValueOnce([
      {
        run_id: "",
        task_id: "",
        status: "RUNNING",
        created_at: "not-a-date",
      },
    ] as never[]);

    render(await Home());

    expect(screen.getAllByText("not-a-date")).toHaveLength(2);
    expect(screen.getByText("Task: - · Unclassified")).toBeInTheDocument();
    expect(screen.getByText("-", { selector: "span.mono.muted" })).toBeInTheDocument();
  });

  it("renders long run id head-tail format when task id is absent", async () => {
    mockFetchRuns.mockResolvedValueOnce([
      {
        run_id: "run-20260221-aaaaaaaa11111111",
        task_id: "",
        status: "SUCCESS",
      },
    ] as never[]);

    render(await Home());

    const runLink = screen.getByRole("link", { name: "Run run-20260221-aaaaaaaa11111111" });
    expect(runLink).toHaveTextContent("run-2026…aa11111111");
    expect(screen.getByText("Task: - · Unclassified")).toBeInTheDocument();
  });

  it("formats valid timestamps with en-US local display", async () => {
    const createdAt = "2026-02-21T08:09:00Z";
    mockFetchRuns.mockResolvedValueOnce([
      {
        run_id: "run-timestamp-1",
        task_id: "task-timestamp-1",
        status: "SUCCESS",
        created_at: createdAt,
      },
    ] as never[]);

    render(await Home());

    expect(screen.getAllByText(new Date(createdAt).toLocaleString("en-US", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })).length).toBeGreaterThan(0);
  });

  it("renders runs governance entry and status-filter links for failed-focused triage", async () => {
    mockFetchRuns.mockResolvedValueOnce([
      { run_id: "run-fail-1", task_id: "task-fail-1", status: "FAILED" },
      { run_id: "run-running-1", task_id: "task-running-1", status: "RUNNING" },
      { run_id: "run-success-1", task_id: "task-success-1", status: "SUCCESS" },
    ] as never[]);

    render(await RunsPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("link", { name: "Open failed-run triage" })).toHaveAttribute("href", "/runs?status=FAILED");
    expect(screen.getByRole("link", { name: "View failed events" })).toHaveAttribute("href", "/events");
    expect(screen.getByRole("link", { name: "All" })).toHaveAttribute("href", "/runs");
    expect(screen.getByRole("link", { name: "Failed" })).toHaveAttribute("href", "/runs?status=FAILED");
    expect(screen.getByRole("link", { name: "Running" })).toHaveAttribute("href", "/runs?status=RUNNING");
    expect(screen.getByRole("link", { name: "Succeeded" })).toHaveAttribute("href", "/runs?status=SUCCESS");
  });

  it("falls back governance CTA to PM creation when there is no failure", async () => {
    mockFetchRuns.mockResolvedValueOnce([
      { run_id: "run-success-2", task_id: "task-success-2", status: "SUCCESS" },
    ] as never[]);

    render(await RunsPage({ searchParams: Promise.resolve({ status: "SUCCESS" }) }));

    expect(screen.getByRole("link", { name: "Create new task" })).toHaveAttribute("href", "/pm");
    expect(screen.queryByRole("link", { name: "View failed events" })).not.toBeInTheDocument();
  });

  it("shows degraded risk summary when runs data is unavailable", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetchRuns.mockRejectedValueOnce(new Error("runs down"));

    render(await Home());

    expect(screen.getByText("Data degraded")).toHaveClass("metric-value--warning");
    expect(screen.getByText("Latest status: Data degraded")).toBeInTheDocument();
    expect(screen.getByText("Failure category: unavailable while data is degraded")).toHaveClass("cell-warning");
    expect(screen.getByRole("link", { name: "Governance entry: inspect data sources and the run list" })).toHaveAttribute("href", "/runs");
    expect(screen.getByText("Data degraded: the run list is temporarily unavailable (0%)")).toHaveClass("badge--warning");
    expect(screen.getByText("Total: -")).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it("renders the public shell with English-first layout metadata and chrome copy", () => {
    expect(metadata.title).toBe("CortexPilot | AI Work Command Tower for Codex, Claude Code, and MCP");
    expect(metadata.description).toContain("Model Context Protocol (MCP)-readable proof and replay");

    render(
      <DashboardShellChrome>
        <div>content</div>
      </DashboardShellChrome>
    );

    expect(screen.getByRole("link", { name: "Skip to dashboard content" })).toHaveAttribute("href", "#dashboard-content");
    expect(screen.getAllByLabelText("Dashboard navigation").length).toBeGreaterThan(0);
    expect(screen.getByText("Command Tower · Workflow Cases · Proof & Replay")).toBeInTheDocument();
    expect(screen.getByText("Operator control plane")).toBeInTheDocument();
    expect(screen.getByLabelText("Platform status overview")).toBeInTheDocument();
    expect(screen.getByText("Governance view")).toBeInTheDocument();
    expect(screen.getByText("Live verification required")).toBeInTheDocument();
    expect(screen.getByText("Page-level status")).toBeInTheDocument();
  });
});
