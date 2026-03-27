import { afterEach, describe, expect, it } from "vitest";

import { FRONTEND_API_CONTRACT } from "../lib/frontendApiContract";
import {
  resolveDashboardApiBase,
  resolveDashboardOperatorRoleEnv,
  resolveDashboardPmCopyVariantEnv,
} from "../lib/env";

const ORIGINAL_API_BASE = process.env.NEXT_PUBLIC_API_BASE;
const ORIGINAL_CORTEXPILOT_API_BASE = process.env.NEXT_PUBLIC_CORTEXPILOT_API_BASE;
const ORIGINAL_CORTEXPILOT_OPERATOR_ROLE = process.env.NEXT_PUBLIC_CORTEXPILOT_OPERATOR_ROLE;
const ORIGINAL_PM_COPY_VARIANT = process.env.NEXT_PUBLIC_PM_COPY_VARIANT;

function restoreEnv(): void {
  if (ORIGINAL_API_BASE === undefined) delete process.env.NEXT_PUBLIC_API_BASE;
  else process.env.NEXT_PUBLIC_API_BASE = ORIGINAL_API_BASE;

  if (ORIGINAL_CORTEXPILOT_API_BASE === undefined) delete process.env.NEXT_PUBLIC_CORTEXPILOT_API_BASE;
  else process.env.NEXT_PUBLIC_CORTEXPILOT_API_BASE = ORIGINAL_CORTEXPILOT_API_BASE;

  if (ORIGINAL_CORTEXPILOT_OPERATOR_ROLE === undefined) delete process.env.NEXT_PUBLIC_CORTEXPILOT_OPERATOR_ROLE;
  else process.env.NEXT_PUBLIC_CORTEXPILOT_OPERATOR_ROLE = ORIGINAL_CORTEXPILOT_OPERATOR_ROLE;

  if (ORIGINAL_PM_COPY_VARIANT === undefined) delete process.env.NEXT_PUBLIC_PM_COPY_VARIANT;
  else process.env.NEXT_PUBLIC_PM_COPY_VARIANT = ORIGINAL_PM_COPY_VARIANT;
}

describe("dashboard env helpers", () => {
  afterEach(() => {
    restoreEnv();
  });

  it("prefers NEXT_PUBLIC_CORTEXPILOT_API_BASE and trims trailing slashes", () => {
    process.env.NEXT_PUBLIC_CORTEXPILOT_API_BASE = " https://cortexpilot.example/api/// ";
    process.env.NEXT_PUBLIC_API_BASE = "https://fallback.example";

    expect(resolveDashboardApiBase()).toBe("https://cortexpilot.example/api");
  });

  it("falls back to NEXT_PUBLIC_API_BASE when the product-specific env is absent", () => {
    process.env.NEXT_PUBLIC_API_BASE = "https://fallback.example";

    expect(resolveDashboardApiBase()).toBe("https://fallback.example");
  });

  it("falls back to NEXT_PUBLIC_API_BASE when the preferred env is blank", () => {
    process.env.NEXT_PUBLIC_CORTEXPILOT_API_BASE = "   ";
    process.env.NEXT_PUBLIC_API_BASE = "https://fallback.example/base//";

    expect(resolveDashboardApiBase()).toBe("https://fallback.example/base");
  });

  it("uses the frontend contract default when both env values are absent", () => {
    delete process.env.NEXT_PUBLIC_CORTEXPILOT_API_BASE;
    delete process.env.NEXT_PUBLIC_API_BASE;

    expect(resolveDashboardApiBase()).toBe(FRONTEND_API_CONTRACT.defaultApiBase);
  });

  it("falls through to the final default return when every candidate is empty", () => {
    delete process.env.NEXT_PUBLIC_CORTEXPILOT_API_BASE;
    delete process.env.NEXT_PUBLIC_API_BASE;
    const previousDefault = FRONTEND_API_CONTRACT.defaultApiBase;
    try {
      (FRONTEND_API_CONTRACT as { defaultApiBase: string }).defaultApiBase = "";
      expect(resolveDashboardApiBase()).toBe("");
    } finally {
      (FRONTEND_API_CONTRACT as { defaultApiBase: string }).defaultApiBase = previousDefault;
    }
  });

  it("returns the PM copy variant verbatim after trimming", () => {
    process.env.NEXT_PUBLIC_PM_COPY_VARIANT = " b ";

    expect(resolveDashboardPmCopyVariantEnv()).toBe("b");
  });

  it("uses NEXT_PUBLIC_CORTEXPILOT_OPERATOR_ROLE and normalizes casing", () => {
    process.env.NEXT_PUBLIC_CORTEXPILOT_OPERATOR_ROLE = " tech_lead ";
    expect(resolveDashboardOperatorRoleEnv()).toBe("TECH_LEAD");
  });
});
