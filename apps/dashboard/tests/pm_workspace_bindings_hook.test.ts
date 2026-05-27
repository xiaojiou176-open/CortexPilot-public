import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { usePersistedWorkspaceBindings } from "../app/pm/hooks/usePersistedWorkspaceBindings";

describe("usePersistedWorkspaceBindings", () => {
  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("hydrates workspace and repo from localStorage with defaults", async () => {
    const setWorkspacePath = vi.fn();
    const setRepoName = vi.fn();

    window.localStorage.setItem("codeflow.pm.workspace", "apps/custom");
    window.localStorage.setItem("codeflow.pm.repo", "custom-repo");

    renderHook(() =>
      usePersistedWorkspaceBindings({
        workspacePath: "",
        repoName: "",
        setWorkspacePath,
        setRepoName,
      }),
    );

    await waitFor(() => {
      expect(setWorkspacePath).toHaveBeenCalledWith("apps/custom");
      expect(setRepoName).toHaveBeenCalledWith("custom-repo");
    });

    setWorkspacePath.mockClear();
    setRepoName.mockClear();

    window.localStorage.clear();

    renderHook(() =>
      usePersistedWorkspaceBindings({
        workspacePath: "",
        repoName: "",
        setWorkspacePath,
        setRepoName,
      }),
    );

    await waitFor(() => {
      expect(setWorkspacePath).toHaveBeenCalledWith("apps/dashboard");
      expect(setRepoName).toHaveBeenCalledWith("codeflow");
    });
  });

  it("persists trimmed workspace and repo values only when non-empty", async () => {
    const setWorkspacePath = vi.fn();
    const setRepoName = vi.fn();
    const setItemSpy = vi.spyOn(window.localStorage.__proto__, "setItem");

    const { rerender } = renderHook(
      ({ workspacePath, repoName }) =>
        usePersistedWorkspaceBindings({
          workspacePath,
          repoName,
          setWorkspacePath,
          setRepoName,
        }),
      {
        initialProps: {
          workspacePath: "   ",
          repoName: "",
        },
      },
    );

    await waitFor(() => {
      expect(window.localStorage.getItem("codeflow.pm.workspace")).toBeNull();
      expect(window.localStorage.getItem("codeflow.pm.repo")).toBeNull();
    });

    rerender({
      workspacePath: " apps/orchestrator ",
      repoName: " codeflow-main ",
    });

    await waitFor(() => {
      expect(window.localStorage.getItem("codeflow.pm.workspace")).toBe("apps/orchestrator");
      expect(window.localStorage.getItem("codeflow.pm.repo")).toBe("codeflow-main");
    });

    expect(setItemSpy).toHaveBeenCalledWith("codeflow.pm.workspace", "apps/orchestrator");
    expect(setItemSpy).toHaveBeenCalledWith("codeflow.pm.repo", "codeflow-main");
  });
});
