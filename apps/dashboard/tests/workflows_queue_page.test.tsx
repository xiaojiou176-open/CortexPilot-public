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
  fetchWorkflows: vi.fn(),
}));

vi.mock("../lib/serverPageData", () => ({
  safeLoad: vi.fn(),
}));

import WorkflowsPage from "../app/workflows/page";
import { fetchQueue, fetchWorkflows } from "../lib/api";
import { safeLoad } from "../lib/serverPageData";

describe("workflows queue page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
  });

  it("renders queue summary alongside workflows", async () => {
    const view = await WorkflowsPage();
    render(view);

    expect(screen.getByText("1 workflows / 1 queue items")).toBeInTheDocument();
    expect(screen.getByText("queue: 1 / SLA at_risk")).toBeInTheDocument();
    expect(screen.getByText("Drive queue layer")).toBeInTheDocument();
  });
});
