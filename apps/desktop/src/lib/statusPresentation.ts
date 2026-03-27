import {
  badgeClassFromVariant,
  type StatusVariant,
  stageCtaZhFromCanonical,
  stageLabelZhFromCanonical,
  stageVariantFromCanonical,
  statusCtaZhFromCanonical,
  statusDotClassFromVariant,
  statusLabelZhFromCanonical,
  statusVariantFromCanonical,
  toCanonicalStage,
  toCanonicalStatusStrict,
  toCanonicalToken,
} from "@cortexpilot/frontend-shared/statusPresentation";

export type RunOutcomeSemantic = "gate_blocked" | "environment_error" | "manual_pending" | "functional_failure" | "unknown";

const CJK_PATTERN = /[\u3400-\u9fff]/u;

function normalizeFailureCode(failureCode: string | undefined | null): string {
  return toCanonicalToken(failureCode) || "";
}

function toPublicCopy(explicitValue: string | undefined | null): string | undefined {
  const explicit = typeof explicitValue === "string" ? explicitValue.trim() : "";
  if (!explicit || CJK_PATTERN.test(explicit)) return undefined;
  return explicit;
}

function toDesktopBadgeClassContract(raw: string): string {
  return raw
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => {
      if (token === "badge") return "ui-badge";
      if (token.startsWith("badge--")) return `ui-badge--${token.slice("badge--".length)}`;
      return token;
    })
    .join(" ");
}

export function outcomeSemantic(
  outcomeType: string | undefined | null,
  status: string | undefined | null,
  failureClass?: string | undefined | null,
  failureCode?: string | undefined | null,
): RunOutcomeSemantic {
  const outcomeToken = toCanonicalToken(outcomeType);
  const statusToken = toCanonicalStatusStrict(status);
  const classToken = toCanonicalToken(failureClass);
  const codeToken = normalizeFailureCode(failureCode);

  if (classToken === "gate") return "gate_blocked";
  if (classToken === "manual") return "manual_pending";
  if (classToken === "env") return "environment_error";
  if (classToken === "product") return "functional_failure";

  if (outcomeToken && (outcomeToken.includes("gate") || outcomeToken.includes("blocked") || outcomeToken.includes("deny"))) {
    return "gate_blocked";
  }
  if (outcomeToken && (outcomeToken.includes("manual") || outcomeToken.includes("approval") || outcomeToken.includes("human"))) {
    return "manual_pending";
  }
  if (outcomeToken && (outcomeToken.includes("env") || outcomeToken.includes("infra") || outcomeToken.includes("runtime"))) {
    return "environment_error";
  }
  if (outcomeToken && (outcomeToken.includes("functional") || outcomeToken.includes("biz") || outcomeToken.includes("logic"))) {
    return "functional_failure";
  }

  if (codeToken.startsWith("gate_") || codeToken.includes("diff_gate") || codeToken.startsWith("policy_")) {
    return "gate_blocked";
  }
  if (codeToken.startsWith("approval_") || codeToken.startsWith("human_")) return "manual_pending";
  if (
    codeToken.startsWith("env_")
    || codeToken.startsWith("infra_")
    || codeToken.startsWith("runtime_")
    || codeToken.startsWith("rollback_")
  ) {
    return "environment_error";
  }
  if (codeToken.startsWith("func_") || codeToken.startsWith("biz_") || codeToken.startsWith("logic_")) return "functional_failure";

  if (statusToken === "blocked" || statusToken === "paused" || statusToken === "pending") return "manual_pending";
  if (statusToken === "failed") return "functional_failure";
  return "unknown";
}

export function outcomeSemanticLabelZh(
  outcomeType: string | undefined | null,
  outcomeLabelZh: string | undefined | null,
  status: string | undefined | null,
  failureClass?: string | undefined | null,
  failureCode?: string | undefined | null,
): string {
  const explicit = toPublicCopy(outcomeLabelZh);
  if (explicit) return explicit;

  const semantic = outcomeSemantic(outcomeType, status, failureClass, failureCode);
  if (semantic === "gate_blocked") return "Gate blocked";
  if (semantic === "environment_error") return "Environment issue";
  if (semantic === "manual_pending") return "Manual confirmation required";
  if (semantic === "functional_failure") return "Functional failure";
  return "Status pending confirmation";
}

export function outcomeSemanticBadgeClass(
  outcomeType: string | undefined | null,
  status: string | undefined | null,
  failureClass?: string | undefined | null,
  failureCode?: string | undefined | null,
): string {
  return toDesktopBadgeClassContract(badgeClassFromVariant(
    outcomeSemanticBadgeVariant(outcomeType, status, failureClass, failureCode),
  ));
}

export function outcomeSemanticBadgeVariant(
  outcomeType: string | undefined | null,
  status: string | undefined | null,
  failureClass?: string | undefined | null,
  failureCode?: string | undefined | null,
): StatusVariant {
  const semantic = outcomeSemantic(outcomeType, status, failureClass, failureCode);
  if (semantic === "gate_blocked" || semantic === "manual_pending") return "warning";
  if (semantic === "environment_error" || semantic === "functional_failure") return "failed";
  return badgeVariant(status);
}

export function outcomeActionHintZh(
  actionHintZh: string | undefined | null,
  outcomeType: string | undefined | null,
  status: string | undefined | null,
  failureClass?: string | undefined | null,
  failureCode?: string | undefined | null,
): string {
  const explicit = toPublicCopy(actionHintZh);
  if (explicit) return explicit;
  const semantic = outcomeSemantic(outcomeType, status, failureClass, failureCode);
  if (semantic === "gate_blocked") return "Adjust the gate and retry";
  if (semantic === "environment_error") return "Check the environment and dependencies, then retry";
  if (semantic === "manual_pending") return "Complete manual confirmation before continuing";
  if (semantic === "functional_failure") return "Fix the functional issue and retry";
  return "View details and continue investigating";
}

export function statusLabelZh(status: string | undefined | null): string {
  return statusLabelZhFromCanonical(toCanonicalStatusStrict(status));
}

export function statusVariant(status: string | undefined | null) {
  return statusVariantFromCanonical(toCanonicalStatusStrict(status));
}

export function statusDotClass(status: string | undefined | null): string {
  return statusDotClassFromVariant(statusVariant(status));
}

export function badgeVariant(status: string | undefined | null): StatusVariant {
  return statusVariant(status);
}

export function badgeClass(status: string | undefined | null): string {
  return toDesktopBadgeClassContract(badgeClassFromVariant(badgeVariant(status)));
}

export function stageLabelZh(stage: string | undefined | null): string {
  return stageLabelZhFromCanonical(toCanonicalStage(stage));
}

export function stageVariant(stage: string | undefined | null) {
  return stageVariantFromCanonical(toCanonicalStage(stage));
}

export function statusCtaZh(status: string | undefined | null): string {
  return statusCtaZhFromCanonical(toCanonicalStatusStrict(status));
}

export function stageCtaZh(stage: string | undefined | null): string {
  return stageCtaZhFromCanonical(toCanonicalStage(stage));
}
