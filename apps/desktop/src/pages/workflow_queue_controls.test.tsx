import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { WorkflowDetailPage } from "./WorkflowDetailPage";
import { WorkflowsPage } from "./WorkflowsPage";

vi.mock("../lib/api", () => ({
  enqueueRunQueue: vi.fn(),
  fetchQueue: vi.fn(),
  fetchWorkflow: vi.fn(),
  fetchWorkflows: vi.fn(),
  runNextQueue: vi.fn(),
}));

import { enqueueRunQueue, fetchQueue, fetchWorkflow, fetchWorkflows, runNextQueue } from "../lib/api";

describe("workflow queue controls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchWorkflows).mockResolvedValue([
      {
        workflow_id: "wf-queue",
        status: "running",
        namespace: "default",
        runs: [{ run_id: "run-001" }],
      },
    ] as never);
    vi.mocked(fetchWorkflow).mockResolvedValue({
      workflow: {
        workflow_id: "wf-queue",
        status: "running",
        objective: "Queue the latest run",
      },
      runs: [{ run_id: "run-001", status: "running" }],
      events: [],
    } as never);
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
    vi.mocked(enqueueRunQueue).mockResolvedValue({ ok: true, task_id: "task-queue" } as never);
    vi.mocked(runNextQueue).mockResolvedValue({ ok: true, run_id: "run-queued-1" } as never);
  });

  it("renders queue summary on workflows list and runs next queued task", async () => {
    render(<WorkflowsPage onNavigateToWorkflow={vi.fn()} />);

    expect(await screen.findByText("sla: at_risk")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Run next queued task" }));

    await waitFor(() => {
      expect(runNextQueue).toHaveBeenCalledTimes(1);
    });
    expect(await screen.findByText("Started queued work as run run-queued-1.")).toBeInTheDocument();
  });

  it("queues latest run contract from workflow detail and shows queue rows", async () => {
    render(<WorkflowDetailPage workflowId="wf-queue" onBack={vi.fn()} onNavigateToRun={vi.fn()} />);

    expect(await screen.findByText("Queue / SLA (1)")).toBeInTheDocument();
    expect(screen.getByText("priority 5 / sla at_risk")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Queue priority"), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText("Queue scheduled at"), { target: { value: "2026-03-30T12:00" } });
    fireEvent.change(screen.getByLabelText("Queue deadline at"), { target: { value: "2026-03-30T13:00" } });
    fireEvent.click(screen.getByRole("button", { name: "Queue latest run contract" }));
    await waitFor(() => {
      expect(enqueueRunQueue).toHaveBeenCalledWith(
        "run-001",
        expect.objectContaining({
          priority: 3,
          scheduled_at: expect.stringMatching(/Z$/),
          deadline_at: expect.stringMatching(/Z$/),
        }),
      );
    });
    expect(await screen.findByText("Queued task-queue.")).toBeInTheDocument();
  });
});
