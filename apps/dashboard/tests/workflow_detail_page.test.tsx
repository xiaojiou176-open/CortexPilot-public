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
  fetchQueue: vi.fn(),
  fetchWorkflow: vi.fn(),
}));

vi.mock("../lib/serverPageData", () => ({
  safeLoad: vi.fn(),
}));

import WorkflowDetailPage from "../app/workflows/[id]/page";
import { fetchQueue, fetchWorkflow } from "../lib/api";
import { safeLoad } from "../lib/serverPageData";

describe("workflow detail page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(safeLoad).mockImplementation(
      async (loader: () => Promise<unknown>, fallback: unknown, label: string) => {
        try {
          return { data: await loader(), warning: "" };
        } catch (error) {
          const message =
            error instanceof Error ? error.message : typeof error === "string" ? error : "unknown";
          console.error(`[safeLoad] ${label} load failed: ${message}`);
          return { data: fallback, warning: `${label} is temporarily unavailable. Try again later.` };
        }
      },
    );
    vi.mocked(fetchWorkflow).mockResolvedValue({
      workflow: {
        workflow_id: "wf-1",
        status: "running",
        namespace: "ns",
        task_queue: "q1",
        objective: "Close the workflow case loop",
        owner_pm: "pm-owner",
        project_key: "cortex-case",
        verdict: "active",
      },
      runs: [{ run_id: "run/1", status: "running", created_at: "2026-02-25T00:00:00Z" }],
      events: [],
    } as never);
    vi.mocked(fetchQueue).mockResolvedValue([] as never);
  });

  it("falls back to raw id when route id is malformed percent-encoding", async () => {
    const view = await WorkflowDetailPage({
      params: Promise.resolve({ id: "%E0%A4%A" }),
    });
    render(view);
    expect(fetchWorkflow).toHaveBeenCalledWith("%E0%A4%A");
    expect(screen.getByText("workflow_id: wf-1")).toBeInTheDocument();
    expect(screen.getByText("Owner: pm-owner")).toBeInTheDocument();
  });

  it("encodes run link when run id contains reserved chars", async () => {
    const view = await WorkflowDetailPage({
      params: Promise.resolve({ id: "wf-1" }),
    });
    render(view);
    expect(screen.getByRole("link", { name: "run/1" })).toHaveAttribute("href", "/runs/run%2F1");
    expect(screen.getAllByText("Normal state").length).toBeGreaterThan(0);
  });

  it("decodes valid encoded route id before fetching workflow", async () => {
    const view = await WorkflowDetailPage({
      params: Promise.resolve({ id: "wf%2Fencoded" }),
    });
    render(view);

    expect(fetchWorkflow).toHaveBeenCalledWith("wf/encoded");
  });

  it("shows warning and empty run state when fetch fails", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(fetchWorkflow).mockRejectedValueOnce(new Error("service unavailable"));

    const view = await WorkflowDetailPage({
      params: Promise.resolve({ id: "wf-fallback" }),
    });
    render(view);

    expect(screen.getByRole("alert")).toHaveTextContent("Workflow detail is temporarily unavailable. Try again later.");
    expect(screen.getByText("Workflow detail is in read-only degraded mode")).toBeInTheDocument();
    expect(screen.getByText("Identity snapshot (degraded)")).toBeInTheDocument();
    expect(screen.getByText("Run mapping samples (degraded)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Governance entry (disabled in degraded mode)" })).toBeDisabled();
    expect(screen.getByText("workflow_id: wf-fallback")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Retry load" })).toHaveAttribute("href", "/workflows/wf-fallback");
    expect(screen.getByRole("link", { name: "Back to workflow list" })).toHaveAttribute("href", "/workflows");

    consoleSpy.mockRestore();
  });

  it("falls back to empty lists when runs or events are not arrays", async () => {
    vi.mocked(fetchWorkflow).mockResolvedValueOnce({
      workflow: { workflow_id: "wf-2", status: "failed" },
      runs: { run_id: "bad-shape" },
      events: null,
    } as never);

    const view = await WorkflowDetailPage({
      params: Promise.resolve({ id: "wf-2" }),
    });
    render(view);

    expect(screen.getByText("Runs: 0")).toBeInTheDocument();
    expect(screen.getAllByText("High-risk state").length).toBeGreaterThan(0);
    expect(screen.getByText("No run records yet")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "bad-shape" })).not.toBeInTheDocument();
  });

  it("renders degraded run sample rows when fallback payload still contains runs", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(fetchWorkflow).mockRejectedValueOnce(new Error("degraded"));

    const view = await WorkflowDetailPage({
      params: Promise.resolve({ id: "wf-sample" }),
    });
    render(view);

    expect(screen.getByText("No verifiable run mapping is available in degraded mode.")).toBeInTheDocument();
    expect(screen.getByText("Read-only note: use the run chain for assessment only, not for direct governance actions.")).toBeInTheDocument();
    consoleSpy.mockRestore();
  });

  it("maps unknown and success workflow states into risk badges and metadata", async () => {
    vi.mocked(fetchWorkflow).mockResolvedValueOnce({
      workflow: { workflow_id: "wf-3", status: "", title: "Workflow Title", created_at: "2026-03-09T09:00:00Z" },
      runs: [],
      events: [{ event: "READY", ts: "2026-03-09T09:01:00Z" }],
    } as never);

    const unknownView = await WorkflowDetailPage({
      params: Promise.resolve({ id: "wf-3" }),
    });
    render(unknownView);

    expect(screen.getAllByText("Normal state").length).toBeGreaterThan(0);
    expect(screen.getByText("Name: Workflow Title")).toBeInTheDocument();
    expect(screen.getByText("Updated at: 2026-03-09T09:00:00Z")).toBeInTheDocument();
    expect(screen.getByText("Events")).toBeInTheDocument();
  });

  it("covers success badge and workflow id fallback when payload id is missing", async () => {
    vi.mocked(fetchWorkflow).mockResolvedValueOnce({
      workflow: { status: "DONE", title: "No Id Workflow", created_at: "2026-03-09T10:00:00Z" },
      runs: [],
      events: [],
    } as never);

    const view = await WorkflowDetailPage({
      params: Promise.resolve({ id: "wf-fallback-id" }),
    });
    render(view);

    expect(screen.getAllByText("Normal state").length).toBeGreaterThan(0);
    expect(screen.getByText("workflow_id: wf-fallback-id")).toBeInTheDocument();
    expect(screen.getByText("Name: No Id Workflow")).toBeInTheDocument();
  });

  it("covers degraded warning branch with sampled runs payload", async () => {
    vi.mocked(safeLoad).mockResolvedValueOnce({
      data: {
        workflow: { workflow_id: "wf-warning", status: "RUNNING" },
        runs: [{ run_id: "run-warning-1", status: "RUNNING", created_at: "2026-03-09T10:01:00Z" }],
        events: [],
      },
      warning: "Workflow detail is temporarily unavailable. Try again later.",
    } as never);

    const view = await WorkflowDetailPage({
      params: Promise.resolve({ id: "wf-warning" }),
    });
    render(view);

    expect(screen.getByRole("alert")).toHaveTextContent("Workflow detail is temporarily unavailable. Try again later.");
    expect(screen.getByText("run-warning-1 / Running / 2026-03-09T10:01:00Z")).toBeInTheDocument();
  });

  it("covers run link fallback and created-at fallback in normal branch", async () => {
    vi.mocked(fetchWorkflow).mockResolvedValueOnce({
      workflow: { workflow_id: "wf-run-fallback", status: "READY", created_at: "2026-03-09T10:05:00Z" },
      runs: [{ status: "READY", created_at: "" }],
      events: [],
    } as never);

    const view = await WorkflowDetailPage({
      params: Promise.resolve({ id: "wf-run-fallback" }),
    });
    render(view);

    const emptyRunLink = document.querySelector('a[href="/runs/"]');
    expect(emptyRunLink).not.toBeNull();
    expect(emptyRunLink?.parentElement).toHaveTextContent(/Ready|Unknown/);
    expect(emptyRunLink?.parentElement).toHaveTextContent(" -");
  });

  it("falls back to route id and preserves run created_at when workflow payload is missing", async () => {
    vi.mocked(fetchWorkflow).mockResolvedValueOnce({
      runs: [{ run_id: "run-created-at", status: "RUNNING", created_at: "2026-03-09T10:06:00Z" }],
      events: [],
    } as never);

    const view = await WorkflowDetailPage({
      params: Promise.resolve({ id: "wf-missing-payload" }),
    });
    render(view);

    expect(screen.getByText("workflow_id: wf-missing-payload")).toBeInTheDocument();
    expect(screen.getByText("Name: wf-missing-payload")).toBeInTheDocument();
    const runLink = screen.getByRole("link", { name: "run-created-at" });
    expect(runLink.parentElement).toHaveTextContent("Running");
    expect(runLink.parentElement).toHaveTextContent("2026-03-09T10:06:00Z");
  });
});
