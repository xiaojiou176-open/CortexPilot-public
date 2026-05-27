import { describe, expect, it } from "vitest";

describe("e2e-tauri-shell-real AppleScript escaping", () => {
  it("escapes quotes and backslashes via JSON.stringify-compatible output", () => {
    const processName = 'Codeflow "Desktop" \\ shell';
    const scriptLine = `return count of windows of process ${JSON.stringify(processName)} as text`;

    expect(scriptLine).toContain('"Codeflow \\"Desktop\\" \\\\ shell"');
  });
});
