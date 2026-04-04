import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("command tower reliability copy", () => {
  it("keeps the degraded live-overview callout wired through shared locale copy", () => {
    const pagePath = path.resolve(process.cwd(), "app/command-tower/page.tsx");
    const source = fs.readFileSync(pagePath, "utf8");

    expect(source).toContain("getUiCopy(locale).dashboard.commandTowerPage");
    expect(source).toContain("commandTowerCopy.unavailableTitle");
    expect(source).toContain("commandTowerCopy.partialTitle");
    expect(source).toContain("commandTowerCopy.unavailableBadge");
    expect(source).toContain("commandTowerCopy.partialBadge");
    expect(source).toContain("commandTowerCopy.actions.viewRuns");
  });
});
