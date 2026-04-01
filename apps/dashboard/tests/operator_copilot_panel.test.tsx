import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/api", () => ({
  fetchOperatorCopilotBrief: vi.fn(),
}));

import OperatorCopilotPanel from "../components/control-plane/OperatorCopilotPanel";
import { fetchOperatorCopilotBrief } from "../lib/api";

describe("operator copilot panel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchOperatorCopilotBrief).mockResolvedValue({
      report_type: "operator_copilot_brief",
      generated_at: "2026-03-31T12:00:00Z",
      run_id: "run-1",
      workflow_id: "wf-1",
      status: "OK",
      summary: "The run is blocked by a governance gate and needs review.",
      likely_cause: "A diff gate rejection is the dominant blocker.",
      compare_takeaway: "Compare shows one material delta against the baseline.",
      proof_takeaway: "Proof artifacts exist but should not be promoted yet.",
      incident_takeaway: "Incident summary points to a blocking gate.",
      queue_takeaway: "Queue state is stable and not the immediate blocker.",
      approval_takeaway: "No pending approval is attached right now.",
      recommended_actions: ["Inspect the diff gate output.", "Decide whether to replay after fixing the violation."],
      top_risks: ["Diff gate failure", "Operator approval may still be required later"],
      questions_answered: ["Why did this run fail?", "What should the operator do next?"],
      used_truth_surfaces: ["run detail", "run reports", "workflow case"],
      limitations: ["V1 is explain-only and does not execute recovery actions."],
      provider: "gemini",
      model: "gemini-2.5-flash",
    } as never);
  });

  it("renders a generated structured operator brief", async () => {
    render(<OperatorCopilotPanel runId="run-1" />);

    fireEvent.click(screen.getByRole("button", { name: "Generate operator brief" }));

    await waitFor(() => {
      expect(fetchOperatorCopilotBrief).toHaveBeenCalledWith("run-1");
    });
    expect(await screen.findByText("Why we think so")).toBeInTheDocument();
    expect(screen.getByText("The run is blocked by a governance gate and needs review.")).toBeInTheDocument();
    expect(screen.getByText("A diff gate rejection is the dominant blocker.")).toBeInTheDocument();
    expect(screen.getByText("Best next action")).toBeInTheDocument();
  });
});
