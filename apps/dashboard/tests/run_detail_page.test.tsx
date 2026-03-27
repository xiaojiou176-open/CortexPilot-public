import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/api", () => ({
  fetchDiff: vi.fn(),
  fetchEvents: vi.fn(),
  fetchReports: vi.fn(),
  fetchRun: vi.fn(),
}));

vi.mock("../components/RunDetail", () => ({
  default: ({ run }: { run: { run_id?: string } }) => <div data-testid="run-detail-stub">{run?.run_id || "-"}</div>,
}));

import RunDetailPage from "../app/runs/[id]/page";
import { fetchDiff, fetchEvents, fetchReports, fetchRun } from "../lib/api";

describe("run detail page copy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchRun).mockResolvedValue({ run_id: "run-1", status: "RUNNING" } as never);
    vi.mocked(fetchEvents).mockResolvedValue([] as never[]);
    vi.mocked(fetchDiff).mockResolvedValue({ diff: "" } as never);
    vi.mocked(fetchReports).mockResolvedValue([] as never[]);
  });

  it("renders the English-first page title and summary copy", async () => {
    render(await RunDetailPage({ params: Promise.resolve({ id: "run-1" }) }));

    expect(screen.getByTestId("run-detail-title")).toHaveTextContent("Run detail");
    expect(screen.getByText("Follow one run across status, event evidence, and replay comparison.")).toBeInTheDocument();
    expect(screen.getByTestId("run-detail-stub")).toHaveTextContent("run-1");
  });

  it("shows English safeLoad warning copy when one data source degrades", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(fetchEvents).mockRejectedValueOnce(new Error("events backend down"));

    render(await RunDetailPage({ params: Promise.resolve({ id: "run-2" }) }));

    expect(screen.getByRole("status")).toHaveTextContent("Run events is temporarily unavailable. Try again later.");
    consoleSpy.mockRestore();
  });
});
