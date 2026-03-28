import { describe, expect, it } from "vitest";
import {
  badgeClass,
  knownOutcomeTypeLabelZh,
  outcomeTypeLabelZh,
  stageCtaZh,
  stageLabelZh,
  stageVariant,
  statusCtaZh,
  statusDotClass,
  statusLabelZh,
  statusVariant,
} from "../lib/statusPresentation";

describe("statusLabelZh", () => {
  it("maps common states to canonical English labels", () => {
    expect(statusLabelZh("success")).toBe("Completed");
    expect(statusLabelZh("running")).toBe("Running");
    expect(statusLabelZh("blocked")).toBe("Blocked");
    expect(statusLabelZh("failed")).toBe("Failed");
    expect(statusLabelZh("paused")).toBe("Paused");
    expect(statusLabelZh("archived")).toBe("Archived");
  });

  it("returns fallback for unknown values", () => {
    expect(statusLabelZh("")).toBe("Unknown");
    expect(statusLabelZh("new_state")).toBe("Unknown");
  });
});

describe("status presentation helpers", () => {
  it("maps status variant classes and cta consistently", () => {
    expect(statusVariant("approved")).toBe("success");
    expect(statusVariant("timeout")).toBe("failed");
    expect(statusVariant("working")).toBe("running");
    expect(statusVariant("pending")).toBe("warning");
    expect(statusVariant("unmapped")).toBe("default");

    expect(statusDotClass("approved")).toBe("status-dot status-dot--success");
    expect(statusDotClass("timeout")).toBe("status-dot status-dot--danger");
    expect(statusDotClass("working")).toBe("status-dot status-dot--primary");
    expect(statusDotClass("pending")).toBe("status-dot status-dot--warning");
    expect(statusDotClass("unmapped")).toBe("status-dot");

    expect(badgeClass("approved")).toBe("badge badge--success");
    expect(badgeClass("timeout")).toBe("badge badge--failed");
    expect(badgeClass("working")).toBe("badge badge--running");
    expect(badgeClass("pending")).toBe("badge badge--warning");
    expect(badgeClass("unmapped")).toBe("badge");

    expect(statusCtaZh("running")).toBe("View progress");
    expect(statusCtaZh("paused")).toBe("Resume run");
    expect(statusCtaZh("unknown")).toBe("View details");
    expect(statusCtaZh("")).toBe("View details");
  });

  it("maps stage label variant and cta consistently", () => {
    expect(stageLabelZh("planning")).toBe("Planning");
    expect(stageLabelZh("analysis")).toBe("Discovery");
    expect(stageLabelZh("execution")).toBe("Execution");
    expect(stageLabelZh("qa")).toBe("Verification");
    expect(stageLabelZh("release")).toBe("Release");
    expect(stageLabelZh("done")).toBe("Done");
    expect(stageLabelZh("unknown")).toBe("Unknown stage");

    expect(stageVariant("planning")).toBe("todo");
    expect(stageVariant("analysis")).toBe("active");
    expect(stageVariant("execution")).toBe("active");
    expect(stageVariant("qa")).toBe("verify");
    expect(stageVariant("release")).toBe("verify");
    expect(stageVariant("done")).toBe("done");
    expect(stageVariant("unknown")).toBe("default");

    expect(stageCtaZh("todo")).toBe("Start intake");
    expect(stageCtaZh("plan")).toBe("Confirm plan");
    expect(stageCtaZh("verify")).toBe("Handle review");
    expect(stageCtaZh("release")).toBe("Start release");
    expect(stageCtaZh("done")).toBe("View result");
    expect(stageCtaZh("unknown")).toBe("View details");
    expect(stageCtaZh("")).toBe("View details");
  });
});

describe("outcome type presentation helpers", () => {
  it("maps unified outcome labels without legacy wording", () => {
    expect(knownOutcomeTypeLabelZh("gate")).toBe("Gate blocked");
    expect(knownOutcomeTypeLabelZh("manual")).toBe("Manual confirmation required");
    expect(knownOutcomeTypeLabelZh("env")).toBe("Environment issue");
    expect(knownOutcomeTypeLabelZh("product")).toBe("Functional failure");
    expect(knownOutcomeTypeLabelZh("functional_failure")).toBe("Functional failure");
    expect(knownOutcomeTypeLabelZh("unknown")).toBe("Failure pending confirmation");
    expect(knownOutcomeTypeLabelZh("not_exists")).toBeUndefined();

    expect(outcomeTypeLabelZh("gate_blocked")).toBe("Gate blocked");
    expect(outcomeTypeLabelZh("manual_pending")).toBe("Manual confirmation required");
    expect(outcomeTypeLabelZh("environment_error")).toBe("Environment issue");
    expect(outcomeTypeLabelZh("functional_failure")).toBe("Functional failure");
    expect(outcomeTypeLabelZh("not_exists")).toBe("Unclassified");
  });
});
