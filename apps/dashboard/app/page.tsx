import Link from "next/link";
import { Button, type ButtonVariant } from "../components/ui/button";
import { Badge, type BadgeVariant } from "../components/ui/badge";
import { Card } from "../components/ui/card";
import { fetchRuns, fetchWorkflows } from "../lib/api";
import { safeLoad } from "../lib/serverPageData";
import { DEFAULT_UI_LOCALE, getUiCopy } from "@cortexpilot/frontend-shared/uiCopy";

const CJK_TEXT_RE = /[\u3400-\u9fff]/;

const STATUS_ALIASES_EN: Record<string, string> = {
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

const STATUS_LABELS_EN: Record<string, string> = {
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

const OUTCOME_LABELS_EN: Record<string, string> = {
  blocked: "Blocked",
  denied: "Policy denied",
  env: "Environment error",
  environment_error: "Environment error",
  error: "Execution error",
  failure: "Execution failed",
  functional_failure: "Product failure",
  gate: "Policy blocked",
  gate_blocked: "Policy blocked",
  manual: "Manual review required",
  manual_pending: "Manual review required",
  product: "Product failure",
  success: "Completed successfully",
  timeout: "Timed out",
  unknown: "Failure awaiting classification",
};

const FIRST_LOOP_STEPS = [
  {
    href: "/pm",
    prefetch: true,
    step: "Step 1",
    title: "Describe the request (goal + acceptance)",
    desc: "State the goal and acceptance target in one sentence, then let the system open the session.",
  },
  {
    href: "/command-tower",
    prefetch: false,
    step: "Step 2",
    title: "Watch live progress (confirm it is moving)",
    desc: "Open Command Tower and confirm the run is advancing instead of getting stuck.",
  },
  {
    href: "/workflows",
    prefetch: true,
    step: "Step 3",
    title: "Confirm the Workflow Case",
    desc: "Open Workflow Cases to confirm the durable case record, queue posture, and linked runs.",
  },
  {
    href: "/runs",
    prefetch: true,
    step: "Step 4",
    title: "Inspect Proof & Replay",
    desc: "Open the run ledger to inspect status, evidence, compare state, and replay state.",
  },
];

const OPTIONAL_APPROVAL_STEP = {
  href: "/god-mode",
  prefetch: true,
  step: "Optional",
  title: "Approval checkpoint (only when review is required)",
  desc: "Use Quick approval to confirm the blocked step and complete the final release.",
};

const PUBLIC_TASK_TEMPLATES = [
  {
    href: "/pm?template=news_digest",
    badge: "Release-proven first run",
    title: "news_digest",
    desc: "Generate a news summary around one topic from public sources while keeping the evidence auditable.",
    bestFor: "Use when you want the fastest proof-oriented public path.",
    example: "Seattle tech and AI + 3 source domains + 24h",
    proof: "Proof state: official public baseline",
    fields: ["topic", "sources[]", "time_range", "max_results"],
  },
  {
    href: "/pm?template=topic_brief",
    badge: "Public showcase",
    title: "topic_brief",
    desc: "Open a bounded topic brief as a read-only workflow case with search-backed proof.",
    bestFor: "Use when you want a narrow brief around one topic and a recent time window.",
    example: "Seattle tech and AI + 7d + 5 results",
    proof: "Proof state: public, but not yet release-proven",
    fields: ["topic", "time_range", "max_results"],
  },
  {
    href: "/pm?template=page_brief",
    badge: "Public showcase",
    title: "page_brief",
    desc: "Capture one URL as a read-only workflow case with browser-backed evidence.",
    bestFor: "Use when one page matters more than a whole search topic.",
    example: "https://example.com + focused summary request",
    proof: "Proof state: browser-backed showcase path",
    fields: ["url", "focus"],
  },
];

const PUBLIC_ADVANTAGES = [
  {
    href: "/runs",
    title: "Proof before promotion",
    desc: "Every first-run case still lands on evidence, compare, and replay before you trust the output.",
  },
  {
    href: "/runs",
    title: "AI operator brief",
    desc: "Run Detail and Run Compare now explain what changed, why it matters, and the next operator step.",
  },
  {
    href: "/workflows",
    title: "Share-ready Workflow Cases",
    desc: "Workflow Cases are now moving toward reusable assets instead of staying trapped as one-off detail pages.",
  },
];

const ECOSYSTEM_BINDING_HREFS = [
  "/command-tower",
  "/command-tower",
  "/runs",
  "https://xiaojiou176-open.github.io/CortexPilot-public/ecosystem/",
] as const;

const AI_SURFACE_HREFS = [
  "/pm",
  "/workflows",
  "/runs",
] as const;

const BUILDER_ENTRYPOINT_HREFS = [
  "https://github.com/xiaojiou176-open/CortexPilot-public/blob/main/packages/frontend-api-client/README.md",
  "https://github.com/xiaojiou176-open/CortexPilot-public/blob/main/packages/frontend-api-contract/index.d.ts",
  "https://github.com/xiaojiou176-open/CortexPilot-public/blob/main/packages/frontend-shared/README.md",
] as const;

const PUBLIC_CASE_GALLERY_BASELINE = [
  {
    href: "/pm?template=news_digest",
    title: "News digest gallery card",
    desc: "Release-proven case archetype for a proof-first public recap.",
    evidence: "Primary report: news_digest_result.json",
    shareMode: "Share mode: proof-first recap",
  },
  {
    href: "/pm?template=topic_brief",
    title: "Topic brief gallery card",
    desc: "Public showcase case archetype for a narrow, search-backed brief.",
    evidence: "Primary report: topic_brief_result.json",
    shareMode: "Share mode: research recap",
  },
  {
    href: "/pm?template=page_brief",
    title: "Page brief gallery card",
    desc: "Browser-backed case archetype for one URL and one focused brief.",
    evidence: "Primary report: page_brief_result.json",
    shareMode: "Share mode: source-page review",
  },
];

const PRODUCT_SPINE = [
  {
    href: "/command-tower",
    title: "Command Tower",
    desc: "Watch governed AI agents and MCP-driven work move through one operator surface.",
  },
  {
    href: "/workflows",
    title: "Workflow Cases",
    desc: "Track the case record that ties request, queue, verdict, proof, and linked runs together.",
  },
  {
    href: "/runs",
    title: "Proof & Replay",
    desc: "Inspect evidence bundles, compare reruns, and replay failures before you trust the result.",
  },
];

function hasCjkText(value: string | undefined | null): boolean {
  return Boolean(value && CJK_TEXT_RE.test(value));
}

function firstEnglishText(...values: Array<string | undefined | null>): string | undefined {
  for (const value of values) {
    const trimmed = String(value || "").trim();
    if (trimmed && !hasCjkText(trimmed)) {
      return trimmed;
    }
  }
  return undefined;
}

function statusLabelEn(status: string | undefined | null): string {
  const raw = String(status || "").trim().toLowerCase();
  if (!raw) {
    return "Unknown";
  }
  const canonical = STATUS_ALIASES_EN[raw] || raw;
  return STATUS_LABELS_EN[canonical] || raw.toUpperCase();
}

function outcomeLabelEn(value: string | undefined | null): string {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) {
    return "Unclassified";
  }
  return OUTCOME_LABELS_EN[raw] || "Unclassified";
}

function formatLocalTime(value: string | undefined): string {
  if (!value) {
    return "-";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString("en-US", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function runIdentityLabel(runId: string | undefined, taskId: string | undefined): string {
  const runRaw = String(runId || "").trim();
  if (!runRaw) {
    return "-";
  }
  if (runRaw.length <= 20) {
    return runRaw;
  }
  const runHead = runRaw.slice(0, 8);
  const runTail = runRaw.slice(-10);
  const taskRaw = String(taskId || "").trim();
  if (!taskRaw) {
    return `${runHead}…${runTail}`;
  }
  const taskTail = taskRaw.length <= 10 ? taskRaw : taskRaw.slice(-10);
  return `${runTail} · ${taskTail}`;
}

function compactTaskId(value: string | undefined): string {
  const raw = String(value || "").trim();
  if (!raw) {
    return "-";
  }
  return raw.length <= 16 ? raw : `${raw.slice(0, 8)}...${raw.slice(-4)}`;
}

export default async function Home() {
  const homePhase2Copy = getUiCopy(DEFAULT_UI_LOCALE).dashboard.homePhase2;
  const { data: runs, warning } = await safeLoad(fetchRuns, [], "run list");
  const { data: workflows, warning: workflowsWarning } = await safeLoad(fetchWorkflows, [], "workflow list");
  const latestRuns = Array.isArray(runs) ? runs.slice(0, 12) : [];
  const latestWorkflows = Array.isArray(workflows) ? workflows.slice(0, 3) : [];
  const latestRun = latestRuns[0];
  const hasDegradedRunsData = Boolean(warning);
  const hasDegradedWorkflowData = Boolean(workflowsWarning);
  const latestFailure = latestRuns.find((run) =>
    ["FAILED", "FAILURE", "ERROR"].includes(String(run.status || "").toUpperCase())
  );

  const successCount = latestRuns.filter((run) =>
    ["SUCCESS", "DONE", "PASSED"].includes(String(run.status || "").toUpperCase())
  ).length;
  const failedCount = latestRuns.filter((run) =>
    ["FAILED", "FAILURE", "ERROR"].includes(String(run.status || "").toUpperCase())
  ).length;
  const runningCount = Math.max(latestRuns.length - successCount - failedCount, 0);
  const statusSampleCount = latestRuns.length;
  const hasRunHistory = statusSampleCount > 0;
  const failureRate = statusSampleCount > 0 ? failedCount / statusSampleCount : 0;
  const failureRatePercent = Math.round(failureRate * 100);
  const latestRunStatus = String(latestRun?.status || "UNKNOWN").toUpperCase();
  const latestRunIsFailed = ["FAILED", "FAILURE", "ERROR"].includes(latestRunStatus);
  const latestRunIsSuccess = ["SUCCESS", "DONE", "PASSED"].includes(latestRunStatus);
  const latestRunIsRunning = hasRunHistory && !latestRunIsFailed && !latestRunIsSuccess;
  const latestRunStatusClass = latestRunIsFailed
    ? "metric-value--danger"
    : latestRunIsSuccess
      ? "metric-value--success"
      : latestRunIsRunning
        ? "metric-value--warning"
        : "metric-value--primary";
  const distributionValueClass =
    hasDegradedRunsData
      ? "metric-value--warning"
      : failureRate >= 0.5
      ? "metric-value--danger"
      : failureRate >= 0.25
        ? "metric-value--warning"
        : failedCount === 0
          ? "metric-value--success"
          : "metric-value--primary";
  const distributionRiskBadgeVariant: BadgeVariant =
    hasDegradedRunsData
      ? "warning"
      : failureRate >= 0.5
      ? "failed"
      : failureRate >= 0.25
        ? "warning"
        : failedCount === 0
          ? "success"
          : "running";
  const distributionRiskText =
    hasDegradedRunsData
      ? "Data degraded: the run list is temporarily unavailable"
      : failureRate >= 0.5
      ? "High risk: failure rate is elevated, investigate first"
      : failureRate >= 0.25
        ? "Attention: failure rate is rising, monitor abnormal events"
        : failedCount === 0
          ? "Stable: no recent failed runs"
          : "Controlled: a few failures exist, keep monitoring";
  const primaryActionLabel = latestRuns.length > 0 ? "Start new task" : "Start first task";
  const latestFailureCategory =
    (latestFailure
      ? outcomeLabelEn(latestFailure.failure_class) ||
        outcomeLabelEn(latestFailure.outcome_type)
      : undefined) || "-";
  const latestFailureHint = firstEnglishText(latestFailure?.action_hint_zh) || "inspect failure events";
  const latestFailureGovernanceHref = latestFailure ? "/events" : "/runs";
  const latestFailureGovernanceLabel = latestFailure
    ? `Governance entry: ${latestFailureHint}`
    : "Governance entry: open runs";
  const topSecondaryAction = failedCount > 0
    ? {
        href: failureRate >= 0.5 ? "/events" : latestFailureGovernanceHref,
        label: failureRate >= 0.5 ? "Investigate high-risk failures" : "Handle latest failure",
        variant: (failureRate >= 0.5 ? "warning" : "secondary") as ButtonVariant,
      }
    : latestRuns.length > 0
      ? {
          href: "/runs",
          label: "View latest runs",
          variant: "secondary" as ButtonVariant,
        }
      : null;
  const riskSummaryTitle =
    hasDegradedRunsData
      ? "Data degraded"
      : !hasRunHistory
      ? "Waiting for first run"
      : failureRate >= 0.5 || latestRunIsFailed
      ? "High-risk alert"
      : failureRate >= 0.25 || latestRunIsRunning
        ? "Risk rising"
        : failedCount === 0
          ? "Stable"
          : "Controlled";
  const riskSummaryClass =
    hasDegradedRunsData
      ? "metric-value--warning"
      : !hasRunHistory
      ? "metric-value--primary"
      : failureRate >= 0.5 || latestRunIsFailed
      ? "metric-value--danger"
      : failureRate >= 0.25 || latestRunIsRunning
      ? "metric-value--warning"
      : "metric-value--success";
  const warningText =
    firstEnglishText(warning) || "The run list is temporarily unavailable. Try again soon.";
  const ecosystemBindings = homePhase2Copy.ecosystemCards.map((item, index) => ({
    ...item,
    href: ECOSYSTEM_BINDING_HREFS[index],
  }));
  const aiSurfaceCards = homePhase2Copy.aiSurfaceCards.map((item, index) => ({
    ...item,
    href: AI_SURFACE_HREFS[index],
  }));
  const builderEntrypoints = homePhase2Copy.builderCards.map((item, index) => ({
    ...item,
    href: BUILDER_ENTRYPOINT_HREFS[index],
  }));

  return (
    <main className="grid" aria-labelledby="dashboard-home-title">
      <header className="app-section">
        <div className="section-header">
          <div>
            <h1 id="dashboard-home-title" className="page-title">
              {homePhase2Copy.heroTitle}
            </h1>
            <p className="page-subtitle">
              {homePhase2Copy.heroSubtitle}
            </p>
          </div>
          <nav aria-label="Home primary actions">
            <Button asChild variant="default">
              <Link href="/pm" prefetch>{primaryActionLabel}</Link>
            </Button>
            {topSecondaryAction ? (
              <Button asChild variant={topSecondaryAction.variant}>
                <Link href={topSecondaryAction.href}>{topSecondaryAction.label}</Link>
              </Button>
            ) : null}
          </nav>
        </div>
      </header>

      <section className="app-section" aria-labelledby="dashboard-product-spine-title">
        <div className="section-header">
          <div>
            <h2 id="dashboard-product-spine-title" className="section-title">
              Product spine
            </h2>
            <p>Keep the first screen aligned around the three product words: Command Tower, Workflow Cases, and Proof &amp; Replay.</p>
          </div>
        </div>
        <div className="quick-grid">
          {PRODUCT_SPINE.map((item) => (
            <Link key={item.title} href={item.href} className="quick-card">
              <span className="quick-card-title">{item.title}</span>
              <span className="quick-card-desc">{item.desc}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="app-section" aria-labelledby="dashboard-public-templates-title">
        <div className="section-header">
          <div>
            <h2 id="dashboard-public-templates-title" className="section-title">
              Three public first-run cases
            </h2>
            <p>Start with one public, read-only workflow case. `news_digest` is the official first public baseline; `topic_brief` and `page_brief` are showcase paths from the same front door.</p>
          </div>
          <nav aria-label="Public task template actions">
            <Button asChild variant="secondary">
              <Link href="/pm">Open task creation</Link>
            </Button>
          </nav>
        </div>
        <div className="quick-grid">
          {PUBLIC_TASK_TEMPLATES.map((item) => (
            <Link key={item.title} href={item.href} className="quick-card">
              <span className="quick-card-desc">{item.badge}</span>
              <span className="quick-card-title">{item.title}</span>
              <span className="quick-card-desc">{item.desc}</span>
              <span className="cell-sub mono">Best for: {item.bestFor}</span>
              <span className="cell-sub mono">Try with: {item.example}</span>
              <span className="cell-sub mono">{item.proof}</span>
              <span className="cell-sub mono">{item.fields.join(" · ")}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="app-section" aria-labelledby="dashboard-public-differentiators-title">
        <div className="section-header">
          <div>
            <h2 id="dashboard-public-differentiators-title" className="section-title">
              Why the first run is credible
            </h2>
            <p>Prompt 5 keeps the public story anchored on proof, replay, read-only MCP access, and explainable operator review instead of generic AI claims.</p>
          </div>
        </div>
        <div className="quick-grid">
          {PUBLIC_ADVANTAGES.map((item) => (
            <Link key={item.title} href={item.href} className="quick-card">
              <span className="quick-card-title">{item.title}</span>
              <span className="quick-card-desc">{item.desc}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="app-section" aria-labelledby="dashboard-ecosystem-title">
        <div className="section-header">
          <div>
            <h2 id="dashboard-ecosystem-title" className="section-title">
              {homePhase2Copy.ecosystemTitle}
            </h2>
            <p>{homePhase2Copy.ecosystemDescription}</p>
          </div>
          <nav aria-label="Ecosystem actions">
            <Button asChild variant="secondary">
              <Link href="https://xiaojiou176-open.github.io/CortexPilot-public/ecosystem/">
                {homePhase2Copy.ecosystemAction}
              </Link>
            </Button>
          </nav>
        </div>
        <div className="quick-grid">
          {ecosystemBindings.map((item) => (
            <Link key={item.title} href={item.href} className="quick-card" prefetch={item.href.startsWith("/")}>
              <span className="quick-card-desc">{item.badge}</span>
              <span className="quick-card-title">{item.title}</span>
              <span className="quick-card-desc">{item.desc}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="app-section" aria-labelledby="dashboard-ai-surfaces-title">
        <div className="section-header">
          <div>
            <h2 id="dashboard-ai-surfaces-title" className="section-title">
              {homePhase2Copy.aiSurfacesTitle}
            </h2>
            <p>{homePhase2Copy.aiSurfacesDescription}</p>
          </div>
        </div>
        <div className="quick-grid">
          {aiSurfaceCards.map((item) => (
            <Link key={item.title} href={item.href} className="quick-card" prefetch={item.href.startsWith("/")}>
              <span className="quick-card-desc">{item.badge}</span>
              <span className="quick-card-title">{item.title}</span>
              <span className="quick-card-desc">{item.desc}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="app-section" aria-labelledby="dashboard-builder-entrypoints-title">
        <div className="section-header">
          <div>
            <h2 id="dashboard-builder-entrypoints-title" className="section-title">
              {homePhase2Copy.builderTitle}
            </h2>
            <p>{homePhase2Copy.builderDescription}</p>
          </div>
          <nav aria-label="Builder quickstart actions">
            <Button asChild variant="secondary">
              <Link href="https://xiaojiou176-open.github.io/CortexPilot-public/builders/">
                Open builder quickstart
              </Link>
            </Button>
          </nav>
        </div>
        <div className="quick-grid">
          {builderEntrypoints.map((item) => (
            <Link key={item.title} href={item.href} className="quick-card" prefetch={false}>
              <span className="quick-card-desc">{item.badge}</span>
              <span className="quick-card-title">{item.title}</span>
              <span className="quick-card-desc">{item.desc}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="app-section" aria-labelledby="dashboard-case-gallery-title">
        <div className="section-header">
          <div>
            <h2 id="dashboard-case-gallery-title" className="section-title">
              Public case gallery baseline
            </h2>
            <p>These cards stay grounded in the tracked public packs and their evidence contracts. They are gallery-ready archetypes, not invented showcase data.</p>
          </div>
          <nav aria-label="Public case gallery actions">
            <Button asChild variant="secondary">
              <Link href="https://xiaojiou176-open.github.io/CortexPilot-public/use-cases/">Open use-case guide</Link>
            </Button>
          </nav>
        </div>
        <div className="quick-grid">
          {PUBLIC_CASE_GALLERY_BASELINE.map((item) => (
            <Link key={item.title} href={item.href} className="quick-card">
              <span className="quick-card-title">{item.title}</span>
              <span className="quick-card-desc">{item.desc}</span>
              <span className="cell-sub mono">{item.evidence}</span>
              <span className="cell-sub mono">{item.shareMode}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="app-section" aria-labelledby="dashboard-case-gallery-title">
        <div className="section-header">
          <div>
            <h2 id="dashboard-case-gallery-title" className="section-title">
              Public case gallery baseline
            </h2>
            <p>Use real Workflow Cases as lightweight showcase assets. This baseline links to live case detail and share-ready recap instead of inventing demo-only gallery data.</p>
          </div>
          <nav aria-label="Case gallery actions">
            <Button asChild variant="secondary">
              <Link href="/workflows">Open Workflow Cases</Link>
            </Button>
          </nav>
        </div>
        {hasDegradedWorkflowData ? (
          <Card>
            <p className="muted">Workflow gallery data is temporarily degraded. Use the workflow list directly until the gallery snapshot refreshes.</p>
            <p className="mono muted">{String(workflowsWarning || "").trim() || "Workflow list is temporarily unavailable."}</p>
          </Card>
        ) : latestWorkflows.length === 0 ? (
          <Card>
            <p className="muted">No Workflow Case is available for gallery mode yet. Start from PM, then return here to reuse the share-ready case path as a showcase asset.</p>
          </Card>
        ) : (
          <div className="quick-grid">
            {latestWorkflows.map((workflow) => {
              const workflowId = String(workflow.workflow_id || "").trim();
              const workflowSummary = firstEnglishText(workflow.summary, workflow.objective) || "No workflow summary is attached yet.";
              const runCount = Array.isArray(workflow.runs) ? workflow.runs.length : Array.isArray(workflow.run_ids) ? workflow.run_ids.length : 0;
              return (
                <Card key={workflowId || workflowSummary}>
                  <div className="stack-gap-2">
                    <div className="toolbar">
                      <Badge variant="default">Workflow Case</Badge>
                      <Badge>{statusLabelEn(workflow.status)}</Badge>
                    </div>
                    <h3 className="quick-card-title">{workflowId || "Workflow case"}</h3>
                    <p className="quick-card-desc">{workflowSummary}</p>
                    <p className="cell-sub mono">Verdict: {String(workflow.verdict || "-")}</p>
                    <p className="cell-sub mono">Owner: {String(workflow.owner_pm || "-")} · Project: {String(workflow.project_key || "-")}</p>
                    <p className="cell-sub mono">Run mappings: {runCount}</p>
                    <div className="toolbar">
                      {workflowId ? (
                        <Button asChild variant="secondary">
                          <Link href={`/workflows/${encodeURIComponent(workflowId)}`}>Open case</Link>
                        </Button>
                      ) : null}
                      {workflowId ? (
                        <Button asChild variant="ghost">
                          <Link href={`/workflows/${encodeURIComponent(workflowId)}/share`}>Open share-ready asset</Link>
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {latestRuns.length === 0 ? (
        <section className="app-section" aria-label="Start your first task in four steps">
          <div className="section-header">
            <div>
              <h2 className="section-title">First-task guide (expandable)</h2>
              <p>Start with the request, watch Command Tower, confirm the Workflow Case, then inspect Proof &amp; Replay. It stays collapsed by default to keep the first screen quiet.</p>
            </div>
          </div>
          <Card asChild>
            <details data-testid="home-onboarding-details">
              <summary className="quick-card-title">Show the four-step first-task flow</summary>
              <div className="quick-grid mt-2">
                {FIRST_LOOP_STEPS.map((step) => (
                  <Link key={step.href} href={step.href} prefetch={step.prefetch} className="quick-card">
                    <span className="quick-card-desc">{step.step}</span>
                    <span className="quick-card-title">{step.title}</span>
                    <span className="quick-card-desc">{step.desc}</span>
                  </Link>
                ))}
              </div>
              <div className="quick-grid mt-2" aria-label="Optional approval step">
                <Link href={OPTIONAL_APPROVAL_STEP.href} prefetch={OPTIONAL_APPROVAL_STEP.prefetch} className="quick-card">
                  <span className="quick-card-desc">{OPTIONAL_APPROVAL_STEP.step}</span>
                  <span className="quick-card-title">{OPTIONAL_APPROVAL_STEP.title}</span>
                  <span className="quick-card-desc">{OPTIONAL_APPROVAL_STEP.desc}</span>
                </Link>
              </div>
            </details>
          </Card>
        </section>
      ) : null}

      <section className="app-section" aria-label="Risk and status summary">
        {warning ? (
          <Card variant="compact" role="status" aria-live="polite">
            <p className="ct-home-empty-text">Some home data is degraded. Core entry actions and the latest snapshot remain available.</p>
            <p className="mono muted">{warningText}</p>
          </Card>
        ) : null}
        <div className="stats-grid">
          <article className="metric-card">
            <p className="metric-label">Risk summary</p>
            <p className={`metric-value ${riskSummaryClass}`}>{riskSummaryTitle}</p>
            <p className={`cell-sub mono ${latestRunStatusClass}`}>
              Latest status: {hasDegradedRunsData ? "Data degraded" : hasRunHistory ? statusLabelEn(latestRun?.status) : "No runs yet"}
            </p>
            <p className={`cell-sub mono ${hasDegradedRunsData ? "cell-warning" : latestFailure ? "cell-danger" : "muted"}`}>
              Failure category: {hasDegradedRunsData ? "unavailable while data is degraded" : String(latestFailureCategory)}
            </p>
            <p className="cell-sub mono muted">{formatLocalTime(latestRun?.last_event_ts || latestRun?.created_at)}</p>
            <Link href={latestFailureGovernanceHref} className="cell-sub mono">
              {hasDegradedRunsData ? "Governance entry: inspect data sources and the run list" : latestFailureGovernanceLabel}
            </Link>
          </article>
          <article className="metric-card">
            <p className="metric-label">Status distribution across the last 12 runs</p>
            <p className={`metric-value ${distributionValueClass}`}>{`Success ${successCount} / Running ${runningCount} / Failed ${failedCount}`}</p>
            <div className="inline-stack" aria-label="Failure-rate risk signal">
              <progress
                className="run-progress"
                max={Math.max(statusSampleCount, 1)}
                value={failedCount}
                aria-label={`Failure share ${failedCount}/${statusSampleCount}`}
              />
              <Badge variant={distributionRiskBadgeVariant} role="status" aria-live="polite">
                {`${distributionRiskText} (${failureRatePercent}%)`}
              </Badge>
            </div>
            <p className="cell-sub mono muted">Total: {hasDegradedRunsData ? "-" : statusSampleCount}</p>
          </article>
        </div>
      </section>

      <section className="app-section" aria-labelledby="dashboard-latest-runs-title">
        <div className="section-header">
          <div>
            <h2 id="dashboard-latest-runs-title" className="section-title">
              Latest results and runs
            </h2>
            <p>Start with the latest outcomes. Each entry keeps the task ID, failure clue, and next operator action visible.</p>
            <p>Use run details and deeper evidence surfaces only when you need audit or attribution.</p>
          </div>
          <nav aria-label="Latest runs actions">
            <Button asChild>
              <Link href="/runs">View all runs</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/search">Open results view</Link>
            </Button>
          </nav>
        </div>
        {latestRuns.length === 0 ? (
          <Card><p className="muted">No runs yet.</p></Card>
        ) : (
          <Card>
            <ul className="row-stack" aria-label="Latest run summary">
              {latestRuns.slice(0, 6).map((run) => {
                const runIdRaw = String(run.run_id || "").trim();
                const runHasId = Boolean(runIdRaw);
                const taskIdRaw = String(run.task_id || "").trim();
                const runStatus = String(run.status || "").toUpperCase();
                const runIsFailed = ["FAILED", "FAILURE", "ERROR"].includes(runStatus);
                const runIsSuccess = ["SUCCESS", "DONE", "PASSED"].includes(runStatus);
                const runLabel = runIdentityLabel(runIdRaw, taskIdRaw);
                const failureActionHref = runHasId ? `/events?run_id=${encodeURIComponent(runIdRaw)}` : "/events";
                const runContextText = String(
                  firstEnglishText(run.failure_summary_zh, run.failure_reason, run.outcome_label_zh) ||
                    outcomeLabelEn(run.failure_class) ||
                    outcomeLabelEn(run.outcome_type) ||
                    "Status pending"
                );
                const runActionText =
                  firstEnglishText(run.action_hint_zh) ||
                  (runIsFailed ? "Recommended: inspect failure events" : "Recommended: open run details");

                return (
                  <li key={runIdRaw || String(run.task_id || "")} className="row-stack-item">
                    <span>
                      {runHasId ? (
                        <Link
                          href={`/runs/${encodeURIComponent(runIdRaw)}`}
                          className="run-link"
                          title={runIdRaw}
                          aria-label={`Run ${runIdRaw}`}
                        >
                          {runLabel}
                        </Link>
                      ) : (
                        <span className="mono muted">{runLabel}</span>
                      )}
                      <span className="cell-sub mono muted">{`Task: ${compactTaskId(taskIdRaw)} · ${runContextText}`}</span>
                      {runIsFailed ? (
                        <span className="cell-sub mono cell-danger">
                          {runActionText} · {" "}
                          <Button asChild variant="warning">
                            <Link
                              href={failureActionHref}
                              aria-label={`Handle failure ${runIdRaw || taskIdRaw || "run"}`}
                            >
                              Handle failure
                            </Link>
                          </Button>
                        </span>
                      ) : (
                        <span className="cell-sub mono muted">{runActionText}</span>
                      )}
                    </span>
                    <Badge variant={runIsFailed ? "failed" : runIsSuccess ? "success" : "running"}>
                      {statusLabelEn(run.status)}
                    </Badge>
                    <span className="muted">{formatLocalTime(run.last_event_ts || run.created_at)}</span>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </section>

      <section className="app-section" aria-labelledby="dashboard-advanced-title">
        <div className="section-header">
          <div>
            <h2 id="dashboard-advanced-title" className="section-title">
              Advanced / Operator
            </h2>
            <p>These entry points keep the original governance power, but they now live in an advanced zone instead of defining the public first impression.</p>
          </div>
        </div>
        <div className="quick-grid">
          <Link href="/command-tower" className="quick-card">
            <span className="quick-card-desc">Advanced</span>
            <span className="quick-card-title">Command Tower</span>
            <span className="quick-card-desc">Watch sessions, alerts, and pipeline health.</span>
          </Link>
          <Link href="/runs" className="quick-card">
            <span className="quick-card-desc">Operator</span>
            <span className="quick-card-title">Proof &amp; Replay</span>
            <span className="quick-card-desc">Inspect run details, compare reruns, replay evidence, and review governed actions.</span>
          </Link>
          <Link href="/god-mode" className="quick-card">
            <span className="quick-card-desc">Governance</span>
            <span className="quick-card-title">Approvals and release control</span>
            <span className="quick-card-desc">Enter manual approval only when a review item requires it.</span>
          </Link>
        </div>
      </section>
    </main>
  );
}
