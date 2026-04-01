import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("command tower reliability copy", () => {
  it("keeps the degraded live-overview callout wording in the page source", () => {
    const pagePath = path.resolve(process.cwd(), "app/command-tower/page.tsx");
    const source = fs.readFileSync(pagePath, "utf8");

    expect(source).toContain("Command Tower live overview is unavailable");
    expect(source).toContain("Command Tower is running with partial truth");
    expect(source).toContain("Partial context");
    expect(source).toContain("Live data missing");
    expect(source).toContain("Reload Command Tower");
    expect(source).toContain("View runs");
  });
});
