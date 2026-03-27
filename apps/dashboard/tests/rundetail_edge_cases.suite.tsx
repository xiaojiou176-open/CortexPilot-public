import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  RunDetail,
  flushPromises,
  mockFetchFactory,
  setupRunDetailTestEnv,
  teardownRunDetailTestEnv,
} from "./rundetail.shared";

describe("RunDetail edge cases", () => {
  beforeEach(() => {
    setupRunDetailTestEnv();
  });

  afterEach(() => {
    teardownRunDetailTestEnv();
  });

  it("handles run list, chain spec, and replay exceptions", async () => {
    const run = {
      run_id: "run_throw",
      task_id: "task_throw",
      status: "RUNNING",
      allowed_paths: [],
      contract: {},
      manifest: { chain_id: "chain_throw" },
    };
    const fetchMock = mockFetchFactory({
      throwRuns: true,
      throwChain: true,
      throwReplay: true,
      throwToolCalls: true,
    });
    // @ts-expect-error test override
    global.fetch = fetchMock;

    render(<RunDetail run={run} events={[]} diff="diff --git a/a b/b" reports={[]} />);
    await act(async () => {
      await flushPromises();
    });

    fireEvent.click(screen.getByText("报告"));
    fireEvent.click(screen.getByText("执行回放对比"));

    await waitFor(() => {
      expect(screen.getByText(/Replay comparison failed/)).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/artifacts?name=chain.json"),
        expect.anything(),
      );
    });

    fireEvent.click(screen.getByText("日志"));
    expect(screen.getByRole("alert")).toHaveTextContent("工具调用加载失败");

    fireEvent.click(screen.getByText("链路"));
    expect(screen.getByRole("alert")).toHaveTextContent("链路规格加载失败");
  });

  it("skips chain spec when run_id missing and allows diff tab switch", async () => {
    const run = {
      run_id: "",
      task_id: "task_no_run",
      status: "RUNNING",
      allowed_paths: [],
      contract: {},
      manifest: { chain_id: "chain_should_skip" },
    };
    const fetchMock = mockFetchFactory({ events: [], reports: [], availableRuns: [] });
    // @ts-expect-error test override
    global.fetch = fetchMock;

    render(<RunDetail run={run} events={[]} diff="diff --git a/a b/b" reports={[]} />);
    await act(async () => {
      await flushPromises();
    });

    fireEvent.click(screen.getByText("日志"));
    fireEvent.click(screen.getByText("差异"));
    await waitFor(() => {
      expect(document.querySelector(".diff-viewer")).not.toBeNull();
    });
  });

  it("covers optional fallbacks and default replay error message", async () => {
    const run = {
      run_id: "run_fallback",
      task_id: "task_fallback",
      status: "SUCCESS",
      manifest: { chain_id: "chain_fallback" },
    };
    const fetchMock = mockFetchFactory({
      events: undefined as any,
      reports: undefined as any,
      availableRuns: { run_id: "not-array" } as any,
      chainSpec: undefined,
      throwReplay: true,
      throwReplayValue: null,
    });
    // @ts-expect-error test override
    global.fetch = fetchMock;

    render(<RunDetail run={run} events={undefined as any} diff="diff --git a/a b/b" reports={undefined as any} />);
    await act(async () => {
      await flushPromises();
    });

    expect(screen.getByText("运行允许路径:")).toBeInTheDocument();
    expect(screen.getByText("合约")).toBeInTheDocument();

    fireEvent.click(screen.getByText("报告"));
    fireEvent.click(screen.getByText("执行回放对比"));
    await waitFor(() => {
      expect(screen.getByText(/Replay comparison failed/)).toBeInTheDocument();
    });
  });

  it("handles null event refresh and empty tool context", async () => {
    const run = {
      run_id: "run_refresh",
      task_id: "task_refresh",
      status: "SUCCESS",
      allowed_paths: [],
      contract: {},
      manifest: {},
    };
    const fetchMock = mockFetchFactory({
      events: null as any,
      reports: [],
    });
    // @ts-expect-error test override
    global.fetch = fetchMock;

    render(
      <RunDetail
        run={run}
        events={[{ ts: "t1", event: "CODEX_CMD" }]}
        diff="diff --git a/a b/b"
        reports={[]}
      />,
    );
    await act(async () => {
      await flushPromises();
    });

    fireEvent.click(screen.getByText("日志"));
    expect(screen.getAllByText(/CODEX_CMD/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("{}").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByText("报告"));
    fireEvent.click(screen.getByText("执行回放对比"));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/events"), expect.anything());
    });
    fireEvent.click(screen.getByText("日志"));
    expect(screen.getByText("暂无工具调用")).toBeInTheDocument();
  });

  it("renders agent cards, tool call cards, trace link, workflow link and live toggle", async () => {
    const run = {
      run_id: "run_rich",
      task_id: "task_rich",
      status: "RUNNING",
      allowed_paths: ["apps/"],
      contract: {},
      manifest: {
        trace_id: "trace-rich",
        trace: { trace_id: "trace-rich-fallback", trace_url: "https://trace.local/rich" },
        workflow: { workflow_id: "wf-rich", status: "RUNNING" },
        versions: { contracts_schema: "v2", orchestrator: "orch-1" },
        observability: { enabled: true },
        evidence_hashes: { a: 1 },
        artifacts: ["reports/test_report.json"],
      },
    };
    const fetchMock = mockFetchFactory({
      events: [
        { ts: "t1", event: "MCP_CALL", context: { cmd: "search" } },
        { ts: "t2", event: "CHAIN_HANDOFF", context: { from: "PM", to: "TL" } },
      ],
      reports: [{ name: "chain_report.json", data: { status: "RUNNING" } }],
      availableRuns: [{ run_id: "baseline-rich" }],
      agentStatus: [
        {
          run_id: "run_rich",
          role: "PM",
          agent_id: "agent-rich",
          stage: "running",
          task_id: "task_rich",
          worktree: "/tmp/worktree",
          current_files: ["a.ts"],
        },
      ],
      toolCalls: [
        {
          tool: "shell",
          status: "ok",
          task_id: "task_rich",
          duration_ms: 123,
          error: "",
        },
      ],
    });
    // @ts-expect-error test override
    global.fetch = fetchMock;

    render(<RunDetail run={run as any} events={[]} diff="diff --git a/a b/b" reports={[]} />);
    await act(async () => {
      await flushPromises();
    });

    expect(screen.getByText(/追踪 ID: trace-rich/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "https://trace.local/rich" })).toHaveAttribute(
      "href",
      "https://trace.local/rich",
    );
    expect(screen.getByRole("link", { name: "wf-rich" })).toHaveAttribute("href", "/workflows/wf-rich");
    expect(screen.getByText(/可观测: 已开启/)).toBeInTheDocument();

    fireEvent.click(screen.getByText("日志"));
    expect(screen.getByText(/工具: shell/)).toBeInTheDocument();
    expect(screen.getByText(/代理 ID: agent-rich/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Pause Live|暂停实时刷新/ }));
    expect(screen.getByText(/已暂停|Paused/i)).toBeInTheDocument();
  });

  it("shows replay evidence empty state when replay report is absent", async () => {
    const run = {
      run_id: "run_no_replay",
      task_id: "task_no_replay",
      status: "SUCCESS",
      allowed_paths: [],
      contract: {},
      manifest: {},
    };
    const fetchMock = mockFetchFactory({
      events: [],
      reports: [{ name: "task_result.json", data: { status: "SUCCESS" } }],
      availableRuns: [],
    });
    // @ts-expect-error test override
    global.fetch = fetchMock;

    render(<RunDetail run={run as any} events={[]} diff="" reports={[]} />);
    await act(async () => {
      await flushPromises();
    });

    fireEvent.click(screen.getByText("报告"));
    expect(screen.getByText("暂无 replay 证据哈希")).toBeInTheDocument();
  });

  it("renders sparse fallback fields for agent/tool/replay diff rows", async () => {
    const run = {
      run_id: "run_sparse",
      task_id: "task_sparse",
      status: "RUNNING",
      allowed_paths: [],
      contract: {},
      manifest: {
        workflow: {},
        trace: {},
        versions: {},
      },
    };

    const reports = [
      {
        name: "replay_report.json",
        data: {
          evidence_hashes: {
            mismatched: [{ key: "", baseline: undefined, current: undefined }],
            missing: [""],
            extra: [""],
          },
        },
      },
    ];

    const fetchMock = mockFetchFactory({
      events: [{ ts: "t-tool", event: "MCP_CALL", context: undefined }],
      reports,
      availableRuns: [],
      agentStatus: [{ run_id: "", role: "", agent_id: "", stage: "", task_id: "", worktree: "" }],
      toolCalls: [{ tool: "", status: "", task_id: "", duration_ms: undefined, error: "" }],
    });
    // @ts-expect-error test override
    global.fetch = fetchMock;

    render(<RunDetail run={run as any} events={[]} diff="" reports={reports as any} />);
    await act(async () => {
      await flushPromises();
    });

    expect(screen.getByText(/工作流状态: -/)).toBeInTheDocument();
    expect(screen.getByText(/终态状态: RUNNING/)).toBeInTheDocument();

    fireEvent.click(screen.getByText("日志"));
    expect(screen.getAllByText(/代理 ID: -/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/任务 ID: -/).length).toBeGreaterThan(0);
    expect(screen.getByText(/工具:/)).toBeInTheDocument();
    expect(screen.getByText(/耗时\(ms\): -/)).toBeInTheDocument();

    fireEvent.click(screen.getByText("报告"));
    expect(screen.getByText(/键:/)).toBeInTheDocument();
    expect(screen.getByText(/基线:/)).toBeInTheDocument();
    expect(screen.getByText(/当前:/)).toBeInTheDocument();
    expect(screen.getAllByText(/缺失:/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/新增:/).length).toBeGreaterThan(0);
  });
});
