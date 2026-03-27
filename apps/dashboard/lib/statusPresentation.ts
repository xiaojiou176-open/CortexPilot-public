import {
  badgeClassFromVariant,
  stageCtaZhFromCanonical,
  stageLabelZhFromCanonical,
  stageVariantFromCanonical,
  statusCtaZhFromCanonical,
  statusDotClassFromVariant,
  statusLabelZhFromCanonical,
  statusVariantFromCanonical,
  toCanonicalStage,
  toCanonicalStatusFuzzy,
} from "@cortexpilot/frontend-shared/statusPresentation";

export { knownOutcomeTypeLabelZh, outcomeTypeLabelZh } from "@cortexpilot/frontend-shared/statusPresentation";

export function statusLabelZh(status: string | undefined | null): string {
  return statusLabelZhFromCanonical(toCanonicalStatusFuzzy(status));
}

export function statusVariant(status: string | undefined | null) {
  return statusVariantFromCanonical(toCanonicalStatusFuzzy(status));
}

export function statusDotClass(status: string | undefined | null): string {
  return statusDotClassFromVariant(statusVariant(status));
}

export function badgeClass(status: string | undefined | null): string {
  return badgeClassFromVariant(statusVariant(status));
}

export function stageLabelZh(stage: string | undefined | null): string {
  return stageLabelZhFromCanonical(toCanonicalStage(stage));
}

export function stageVariant(stage: string | undefined | null) {
  return stageVariantFromCanonical(toCanonicalStage(stage));
}

export function statusCtaZh(status: string | undefined | null): string {
  return statusCtaZhFromCanonical(toCanonicalStatusFuzzy(status));
}

export function stageCtaZh(stage: string | undefined | null): string {
  return stageCtaZhFromCanonical(toCanonicalStage(stage));
}
