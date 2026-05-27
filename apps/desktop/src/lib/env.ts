import { FRONTEND_API_CONTRACT } from "@codeflow/frontend-api-contract";

type ImportMetaLike = {
  env?: Record<string, unknown>;
};

type ProcessEnvCarrier = {
  process?: {
    env?: Record<string, string | undefined>;
  };
};

function readViteEnv(
  keyName: "VITE_CODEFLOW_API_BASE" | "VITE_CODEFLOW_API_TOKEN" | "VITE_CODEFLOW_OPERATOR_ROLE",
): string {
  const env = (import.meta as unknown as ImportMetaLike).env || {};
  const fromVite = String(env[keyName] || "").trim();
  if (fromVite) {
    return fromVite;
  }
  if (typeof globalThis === "undefined" || !("process" in globalThis)) {
    return "";
  }
  const processEnv = (globalThis as ProcessEnvCarrier).process?.env || {};
  return String(processEnv[keyName] || "").trim();
}

export function resolveDesktopApiBase(): string {
  const candidate = readViteEnv("VITE_CODEFLOW_API_BASE");
  if (!candidate) {
    return FRONTEND_API_CONTRACT.defaultApiBase;
  }
  return candidate.replace(/\/+$/, "");
}

export function resolveDesktopApiToken(): string {
  return readViteEnv("VITE_CODEFLOW_API_TOKEN");
}

export function resolveDesktopOperatorRoleEnv(): string {
  const role = readViteEnv("VITE_CODEFLOW_OPERATOR_ROLE");
  return role ? role.toUpperCase() : "";
}
