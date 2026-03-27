const STATUS_ALIASES = {
    active: "running",
    approve: "completed",
    approved: "completed",
    archived: "archived",
    blocked: "blocked",
    canceled: "cancelled",
    cancelled: "cancelled",
    closed: "archived",
    completed: "completed",
    critical: "failed",
    degraded: "blocked",
    denied: "failed",
    done: "completed",
    error: "failed",
    executing: "running",
    fail: "failed",
    failed: "failed",
    failure: "failed",
    healthy: "healthy",
    idle: "idle",
    in_progress: "running",
    info: "info",
    ok: "completed",
    on_hold: "blocked",
    pass: "completed",
    passed: "completed",
    paused: "paused",
    pending: "pending",
    progress: "running",
    reject: "failed",
    rejected: "failed",
    running: "running",
    success: "completed",
    timeout: "failed",
    waiting: "pending",
    warning: "blocked",
    working: "running",
};
const STATUS_LABELS = {
    archived: "Archived",
    blocked: "Blocked",
    cancelled: "Cancelled",
    completed: "Completed",
    failed: "Failed",
    healthy: "Healthy",
    idle: "Idle",
    info: "Info",
    paused: "Paused",
    pending: "Pending",
    running: "Running",
};
const OUTCOME_TYPE_LABELS = {
    blocked: "Blocked",
    env: "Environment issue",
    environment_error: "Environment issue",
    gate: "Gate blocked",
    gate_blocked: "Gate blocked",
    manual: "Manual confirmation required",
    manual_pending: "Manual confirmation required",
    denied: "Denied by policy",
    error: "Execution error",
    failure: "Execution failed",
    functional_failure: "Functional failure",
    product: "Functional failure",
    success: "Completed successfully",
    timeout: "Timed out",
    unknown: "Failure pending confirmation",
};
const STAGE_ALIASES = {
    analysis: "discover",
    apply: "execute",
    completed: "done",
    delivery: "release",
    deploy: "release",
    discovering: "discover",
    discovery: "discover",
    done: "done",
    execution: "execute",
    implement: "execute",
    implemented: "execute",
    intake: "intake",
    plan: "plan",
    planning: "plan",
    qa: "verify",
    release: "release",
    released: "release",
    review: "verify",
    reviewed: "verify",
    test: "verify",
    testing: "verify",
    todo: "intake",
    verify: "verify",
};
const STAGE_LABELS = {
    discover: "Discovery",
    done: "Done",
    execute: "Execution",
    intake: "Intake",
    plan: "Planning",
    release: "Release",
    verify: "Verification",
};
const CTA_BY_STATUS = {
    archived: "View archive",
    blocked: "Resolve blocker",
    cancelled: "View details",
    completed: "View result",
    failed: "Review failure and retry",
    healthy: "View details",
    idle: "Start run",
    info: "View details",
    paused: "Resume run",
    pending: "Start run",
    running: "View progress",
};
const CTA_BY_STAGE = {
    discover: "Refine requirements",
    done: "View result",
    execute: "View progress",
    intake: "Start intake",
    plan: "Confirm plan",
    release: "Start release",
    verify: "Handle review",
};
export function toCanonicalToken(value) {
    if (!value)
        return undefined;
    const lower = value.toLowerCase().trim();
    return lower || undefined;
}
export function toCanonicalStatusStrict(status) {
    const token = toCanonicalToken(status);
    if (!token)
        return undefined;
    return STATUS_ALIASES[token];
}
export function toCanonicalStatusFuzzy(status) {
    const token = toCanonicalToken(status);
    if (!token)
        return undefined;
    const direct = STATUS_ALIASES[token];
    if (direct)
        return direct;
    if (token.includes("failure")
        || token.includes("failed")
        || token.includes("error")
        || token.includes("timeout")
        || token.includes("reject")
        || token.includes("denied")) {
        return "failed";
    }
    if (token.includes("running") || token.includes("execut") || token.includes("progress") || token.includes("working")) {
        return "running";
    }
    if (token.includes("blocked"))
        return "blocked";
    if (token.includes("pending") || token.includes("waiting"))
        return "pending";
    if (token.includes("paused"))
        return "paused";
    if (token.includes("idle"))
        return "idle";
    if (token.includes("success")
        || token.includes("pass")
        || token.includes("done")
        || token.includes("complete")
        || token.includes("approve")) {
        return "completed";
    }
    return undefined;
}
export function toCanonicalStage(stage) {
    const token = toCanonicalToken(stage);
    if (!token)
        return undefined;
    return STAGE_ALIASES[token];
}
export function knownOutcomeTypeLabelZh(outcomeType) {
    const token = toCanonicalToken(outcomeType);
    if (!token)
        return undefined;
    return OUTCOME_TYPE_LABELS[token];
}
export function outcomeTypeLabelZh(outcomeType) {
    return knownOutcomeTypeLabelZh(outcomeType) || "Unclassified";
}
export function statusLabelZhFromCanonical(canonical) {
    if (!canonical)
        return "Unknown";
    return STATUS_LABELS[canonical] || "Unknown";
}
export function statusVariantFromCanonical(canonical) {
    if (canonical === "completed" || canonical === "healthy")
        return "success";
    if (canonical === "failed" || canonical === "cancelled")
        return "failed";
    if (canonical === "running")
        return "running";
    if (canonical === "blocked" || canonical === "pending" || canonical === "paused" || canonical === "idle")
        return "warning";
    return "default";
}
export function statusDotClassFromVariant(variant) {
    if (variant === "success")
        return "status-dot status-dot--success";
    if (variant === "failed")
        return "status-dot status-dot--danger";
    if (variant === "running")
        return "status-dot status-dot--primary";
    if (variant === "warning")
        return "status-dot status-dot--warning";
    return "status-dot";
}
export function badgeClassFromVariant(variant) {
    if (variant === "success")
        return "badge badge--success";
    if (variant === "failed")
        return "badge badge--failed";
    if (variant === "running")
        return "badge badge--running";
    if (variant === "warning")
        return "badge badge--warning";
    return "badge";
}
export function stageLabelZhFromCanonical(canonical) {
    if (!canonical)
        return "Unknown stage";
    return STAGE_LABELS[canonical] || "Unknown stage";
}
export function stageVariantFromCanonical(canonical) {
    if (canonical === "intake" || canonical === "plan")
        return "todo";
    if (canonical === "discover" || canonical === "execute")
        return "active";
    if (canonical === "verify" || canonical === "release")
        return "verify";
    if (canonical === "done")
        return "done";
    return "default";
}
export function statusCtaZhFromCanonical(canonical) {
    if (!canonical)
        return "View details";
    return CTA_BY_STATUS[canonical] || "View details";
}
export function stageCtaZhFromCanonical(canonical) {
    if (!canonical)
        return "View details";
    return CTA_BY_STAGE[canonical] || "View details";
}
