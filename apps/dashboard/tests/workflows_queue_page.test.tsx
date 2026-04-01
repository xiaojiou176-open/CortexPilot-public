import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRefresh = vi.fn();

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

vi.mock("../lib/api", () => ({
  enqueueRunQueue: vi.fn(),
  fetchQueue: vi.fn(),
  fetchWorkflows: vi.fn(),
  mutationExecutionCapability: vi.fn(),
  runNextQueue: vi.fn(),
}));

vi.mock("../lib/serverPageData", () => ({
  safeLoad: vi.fn(),
}));

import WorkflowsPage from "../app/workflows/page";
import { fetchQueue, fetchWorkflows, mutationExecutionCapability, runNextQueue } from "../lib/api";
import { safeLoad } from "../lib/serverPageData";

describe("workflows queue page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRefresh.mockReset();
    vi.mocked(safeLoad).mockImplementation(async (loader: () => Promise<unknown>, fallback: unknown) => {
      try {
        return { data: await loader(), warning: "" };
      } catch {
        return { data: fallback, warning: "degraded" };
      }
    });
    vi.mocked(fetchWorkflows).mockResolvedValue([
      {
        workflow_id: "wf-queue",
        status: "running",
        namespace: "default",
        objective: "Drive queue layer",
        runs: [{ run_id: "run-001" }],
      },
    ] as never);
    vi.mocked(fetchQueue).mockResolvedValue([
      {
        queue_id: "queue-1",
        task_id: "task-queue",
        workflow_id: "wf-queue",
        status: "PENDING",
        priority: 5,
        sla_state: "at_risk",
      },
    ] as never);
    vi.mocked(runNextQueue).mockResolvedValue({ ok: true, run_id: "run-queued-1" } as never);
    vi.mocked(mutationExecutionCapability).mockReturnValue({ executable: true, operatorRole: "TECH_LEAD" } as never);
  });

  it("renders queue summary alongside workflows", async () => {
    const view = await WorkflowsPage();
    render(view);

    expect(screen.getByText("1 workflows / 1 queue items")).toBeInTheDocument();
    expect(screen.getByText("Cases with queued work: 1")).toBeInTheDocument();
    expect(screen.getByText("Queue / SLA").closest("article")).toHaveTextContent("Eligible now: 1 / at risk: 1");
    expect(screen.getByText(/Run the next queued task to move the active Workflow Case chain forward\./)).toBeInTheDocument();
    expect(screen.getByText("queue: 1 / SLA at_risk")).toBeInTheDocument();
    expect(screen.getByText("Drive queue layer")).toBeInTheDocument();
    expect(screen.getByText(/operator role/i)).toHaveTextContent("TECH_LEAD");
  });

  it("runs next queued task from the web workflow surface", async () => {
    const view = await WorkflowsPage();
    render(view);

    fireEvent.click(screen.getByRole("button", { name: "Run next queued task" }));
    await waitFor(() => {
      expect(runNextQueue).toHaveBeenCalledTimes(1);
      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });
    expect(await screen.findByText("Started queued work as run run-queued-1. Refreshing the workflow view...")).toBeInTheDocument();
  });
});
