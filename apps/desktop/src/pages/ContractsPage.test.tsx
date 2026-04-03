import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ContractsPage } from "./ContractsPage";

vi.mock("../lib/api", () => ({
  fetchContracts: vi.fn(),
}));

import { fetchContracts } from "../lib/api";

describe("ContractsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders empty state and then contract details after refresh", async () => {
    vi.mocked(fetchContracts)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          task_id: "task-1",
          run_id: "run-1",
          allowed_paths: ["apps/desktop/src"],
          acceptance_tests: ["pnpm test"],
          tool_permissions: { shell: "allow" },
        },
      ] as any);
    const user = userEvent.setup();
    render(<ContractsPage />);
    expect(await screen.findByText(/No contracts yet|暂无合约/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Refresh|刷新/ }));
    expect(await screen.findByText("task-1")).toBeInTheDocument();
    expect(screen.getByText("apps/desktop/src")).toBeInTheDocument();
    expect(screen.getByText("pnpm test")).toBeInTheDocument();
    expect(screen.getByText(/"shell": "allow"/)).toBeInTheDocument();
  });

  it("surfaces load error", async () => {
    vi.mocked(fetchContracts).mockRejectedValue(new Error("contracts down"));
    render(<ContractsPage />);
    await waitFor(() => {
      expect(screen.getByText("contracts down")).toBeInTheDocument();
    });
  });
});
