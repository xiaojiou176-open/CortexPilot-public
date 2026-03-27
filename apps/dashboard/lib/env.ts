import { FRONTEND_API_CONTRACT } from "./frontendApiContract";

type DashboardPublicEnvKey =
  | "NEXT_PUBLIC_CORTEXPILOT_API_BASE"
  | "NEXT_PUBLIC_CORTEXPILOT_OPERATOR_ROLE"
  | "NEXT_PUBLIC_API_BASE"
  | "NEXT_PUBLIC_PM_COPY_VARIANT";

function readPublicEnv(key: DashboardPublicEnvKey): string {
  switch (key) {
    case "NEXT_PUBLIC_CORTEXPILOT_API_BASE":
      return String(process.env.NEXT_PUBLIC_CORTEXPILOT_API_BASE || "").trim();
    case "NEXT_PUBLIC_CORTEXPILOT_OPERATOR_ROLE":
      return String(process.env.NEXT_PUBLIC_CORTEXPILOT_OPERATOR_ROLE || "").trim();
    case "NEXT_PUBLIC_API_BASE":
      return String(process.env.NEXT_PUBLIC_API_BASE || "").trim();
    case "NEXT_PUBLIC_PM_COPY_VARIANT":
      return String(process.env.NEXT_PUBLIC_PM_COPY_VARIANT || "").trim();
    default:
      return "";
  }
}

export function resolveDashboardApiBase(): string {
  const candidates = [
    readPublicEnv("NEXT_PUBLIC_CORTEXPILOT_API_BASE"),
    readPublicEnv("NEXT_PUBLIC_API_BASE"),
    FRONTEND_API_CONTRACT.defaultApiBase,
  ];
  for (const candidate of candidates) {
    if (candidate) {
      return candidate.replace(/\/+$/, "");
    }
  }
  return FRONTEND_API_CONTRACT.defaultApiBase;
}

export function resolveDashboardPmCopyVariantEnv(): string {
  return readPublicEnv("NEXT_PUBLIC_PM_COPY_VARIANT");
}

export function resolveDashboardOperatorRoleEnv(): string {
  const candidates = [readPublicEnv("NEXT_PUBLIC_CORTEXPILOT_OPERATOR_ROLE")];
  for (const candidate of candidates) {
    if (candidate) {
      return candidate.toUpperCase();
    }
  }
  return "";
}
