import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockCookies } = vi.hoisted(() => ({
  mockCookies: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/headers", () => ({
  cookies: mockCookies,
}));

vi.mock("../lib/api", () => ({
  fetchRuns: vi.fn(),
  fetchRun: vi.fn(),
  fetchArtifact: vi.fn(),
  fetchReports: vi.fn(),
}));

import PlannerPage from "../app/planner/page";
import { fetchArtifact, fetchReports, fetchRun, fetchRuns } from "../lib/api";

describe("planner page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCookies.mockResolvedValue({
      get: () => undefined,
      toString: () => "",
    });
    vi.mocked(fetchRuns).mockResolvedValue([
      { run_id: "run-plan-1", task_id: "task-plan-1", status: "SUCCESS" },
    ] as never);
    vi.mocked(fetchRun).mockResolvedValue({
      run_id: "run-plan-1",
      task_id: "task-plan-1",
      status: "SUCCESS",
      manifest: {
        artifacts: [
          { name: "planning_wave_plan", path: "artifacts/planning_wave_plan.json" },
          { name: "planning_worker_prompt_contracts", path: "artifacts/planning_worker_prompt_contracts.json" },
          { name: "planning_unblock_tasks", path: "artifacts/planning_unblock_tasks.json" },
        ],
      },
    } as never);
    vi.mocked(fetchArtifact).mockImplementation(async (_runId: string, name: string) => {
      if (name === "planning_wave_plan.json") {
        return {
          name,
          data: {
            objective: "Ship one planning bridge",
            worker_count: 2,
            wake_policy_ref: "policies/control_plane_runtime_policy.json#/wake_policy",
          },
        } as never;
      }
      if (name === "planning_worker_prompt_contracts.json") {
        return {
          name,
          data: [{ prompt_contract_id: "worker-1" }, { prompt_contract_id: "worker-2" }],
        } as never;
      }
      return {
        name,
        data: [{ unblock_task_id: "unblock-1" }],
      } as never;
    });
    vi.mocked(fetchReports).mockResolvedValue([
      {
        name: "completion_governance_report.json",
        data: {
          overall_verdict: "continue_same_session",
          continuation_decision: { selected_action: "reply_auditor_reprompt_and_continue_same_session" },
        },
      },
    ] as never);
  });

  it("renders a first-class planner desk from planning artifacts", async () => {
    render(await PlannerPage());

    expect(screen.getByRole("heading", { name: "Planner desk" })).toBeInTheDocument();
    expect(screen.getByText("Ship one planning bridge")).toBeInTheDocument();
    expect(screen.getByText(/Wake policy:/)).toBeInTheDocument();
    expect(screen.getByText(/reply_auditor_reprompt_and_continue_same_session/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open PM intake" })).toHaveAttribute("href", "/pm");
    expect(screen.getAllByRole("link", { name: "Open Workflow Cases" })[0]).toHaveAttribute("href", "/workflows");
    expect(screen.getByRole("link", { name: "Open run detail" })).toHaveAttribute("href", "/runs/run-plan-1");
  });
});
