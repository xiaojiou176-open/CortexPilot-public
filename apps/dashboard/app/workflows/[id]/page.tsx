import Link from "next/link";
import EventTimeline from "../../../components/EventTimeline";
import type { BadgeVariant } from "../../../components/ui/badge";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import ControlPlaneStatusCallout from "../../../components/control-plane/ControlPlaneStatusCallout";
import WorkflowOperatorCopilotPanel from "../../../components/control-plane/WorkflowOperatorCopilotPanel";
import { fetchQueue, fetchWorkflow } from "../../../lib/api";
import { safeLoad } from "../../../lib/serverPageData";
import WorkflowQueueMutationControls from "../WorkflowQueueMutationControls";

function statusLabelEn(status: string | undefined): string {
  const normalized = String(status || "").trim().toLowerCase();
  if (!normalized) {
    return "Unknown";
  }
  if (["done", "success", "completed", "approved"].includes(normalized)) return "Completed";
  if (["fail", "failed", "failure", "error", "rollback", "rejected", "reject", "abort", "timeout", "blocked", "deny"].includes(normalized)) return "Failed";
  if (["running", "active", "pending", "queued", "ready"].includes(normalized)) return normalized === "ready" ? "Ready" : "Running";
  return normalized.replace(/_/g, " ");
}

type WorkflowDetailPageParams = {
  id: string;
};

function safeDecodeParam(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function isWorkflowAtRisk(status: unknown): boolean {
  const normalized = String(status || "").trim().toUpperCase();
  if (!normalized) {
    return false;
  }
  return ["FAIL", "ERROR", "REJECT", "DENY", "TIMEOUT", "ROLLBACK", "ABORT", "BLOCK"].some((token) =>
    normalized.includes(token)
  );
}

function workflowRiskBadgeVariant(status: unknown): BadgeVariant {
  if (isWorkflowAtRisk(status)) {
    return "failed";
  }
  const normalized = String(status || "").trim().toUpperCase();
  if (!normalized) {
    return "warning";
  }
  if (["RUNNING", "ACTIVE", "PENDING", "QUEUED"].some((token) => normalized.includes(token))) {
    return "running";
  }
  if (["DONE", "SUCCESS", "COMPLETED", "APPROVED"].some((token) => normalized.includes(token))) {
    return "success";
  }
  return "default";
}

function workflowRunRowKey(run: Record<string, unknown>, index: number): string {
  return [
    String(run.run_id || "no-run-id"),
    String(run.created_at || "no-created-at"),
    String(run.status || "no-status"),
    String(index),
  ].join(":");
}

function resolveLatestRunId(runs: Array<Record<string, unknown>>): string {
  const sortedRuns = [...runs];
  sortedRuns.sort((left, right) => {
    const leftTs = Date.parse(String(left.created_at || ""));
    const rightTs = Date.parse(String(right.created_at || ""));
    return (Number.isFinite(rightTs) ? rightTs : 0) - (Number.isFinite(leftTs) ? leftTs : 0);
  });
  return String(sortedRuns[0]?.run_id || "").trim();
}

export default async function WorkflowDetailPage({
  params,
}: {
  params: Promise<WorkflowDetailPageParams>;
}) {
  const { id } = await params;
  const workflowId = safeDecodeParam(id);
  const { data: payload, warning } = await safeLoad(
    () => fetchWorkflow(workflowId),
    { workflow: { workflow_id: workflowId }, runs: [], events: [] },
    "Workflow detail",
  );
  const { data: queueItems } = await safeLoad(
    () => fetchQueue(workflowId),
    [] as Record<string, unknown>[],
    "Queue detail",
  );
  const workflow = payload.workflow || { workflow_id: workflowId };
  const runs = Array.isArray(payload.runs) ? payload.runs : [];
  const events = Array.isArray(payload.events) ? payload.events : [];
  const workflowMeta = workflow as Record<string, unknown>;
  const workflowName = String(
    workflowMeta["name"] || workflowMeta["title"] || workflow.workflow_id || workflowId || "-",
  );
  const workflowStatus = statusLabelEn(workflow.status);
  const workflowUpdatedAt = String(workflowMeta["updated_at"] || workflowMeta["created_at"] || "-");
  const workflowRisk = isWorkflowAtRisk(workflow.status);
  const riskLabel = workflowRisk ? "High-risk state" : "Normal state";
  const latestRunId = resolveLatestRunId(runs);
  const eligibleQueueCount = queueItems.filter((item) => {
    if (item.eligible === true || String(item.eligible || "").toLowerCase() === "true") {
      return true;
    }
    const status = String(item.status || "").toUpperCase();
    const queueState = String(item.queue_state || "").toLowerCase();
    return status === "PENDING" && (queueState === "" || queueState === "eligible");
  }).length;

  if (warning) {
    return (
      <main className="grid" aria-labelledby="workflow-detail-title">
        <header className="app-section">
          <div className="section-header">
            <div>
              <h1 id="workflow-detail-title">Workflow Case Detail</h1>
              <p>Confirm the case status, linked runs, queue posture, and whether governance actions should pause.</p>
            </div>
            <Badge className="mono">{workflowId}</Badge>
          </div>
        </header>
        <section className="app-section" aria-label="Workflow degraded state">
          <ControlPlaneStatusCallout
            title="Workflow Case is in read-only degraded mode"
            summary={warning}
            nextAction="Use the visible case identity, event timeline, and run mapping for diagnosis only. Wait for the data path to recover before taking approval, rollback, replay, or queue actions."
            tone="warning"
            badgeLabel="Read-only"
            actions={[
              { href: `/workflows/${encodeURIComponent(workflowId)}`, label: "Retry load" },
              { href: "/workflows", label: "Back to workflow list" },
            ]}
          />
          <div className="grid grid-3">
            <Card>
              <h3>Identity snapshot (degraded)</h3>
              <div className="mono">workflow_id: {workflowId}</div>
              <div className="mono">Name: {workflowName}</div>
              <div className="mono">Status: {workflowStatus}</div>
              <div className="mono">Updated at: {workflowUpdatedAt}</div>
              <Badge variant="warning">Read-only degraded mode</Badge>
            </Card>
            <Card>
              <h3>Run mapping samples (degraded)</h3>
              {runs.length === 0 ? (
                <div className="mono">No verifiable run mapping is available in degraded mode.</div>
              ) : (
                runs.map((run, index) => (
                  <div key={workflowRunRowKey(run, index)} className="mono">
                    {run.run_id} / {statusLabelEn(run.status)} / {run.created_at || "-"}
                  </div>
                ))
              )}
              <span className="mono muted">Read-only note: use the run chain for assessment only, not for direct governance actions.</span>
            </Card>
            <Card>
              <h3>Event timeline sample (degraded)</h3>
              <EventTimeline events={events} />
              <span className="mono muted">Events remain visible, but governance actions should wait until the data path is restored.</span>
            </Card>
          </div>
          <Card>
            <div className="toolbar mt-2">
              <Button asChild variant="secondary">
                <Link href={`/workflows/${encodeURIComponent(workflowId)}`}>Retry load</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link href="/workflows">Back to workflow list</Link>
              </Button>
              <Button variant="ghost" disabled aria-disabled="true">
                Governance entry (disabled in degraded mode)
              </Button>
            </div>
          </Card>
        </section>
      </main>
    );
  }

  return (
    <main className="grid" aria-labelledby="workflow-detail-title">
      <header className="app-section">
        <div className="section-header">
          <div>
            <h1 id="workflow-detail-title">Workflow Case detail</h1>
            <p>Classify risk first, then confirm the case summary, run mapping, queue posture, and event timeline before taking governance action.</p>
          </div>
          <div className="toolbar" role="group" aria-label="Workflow risk summary">
            <Badge className="mono">{workflow.workflow_id || workflowId}</Badge>
            <Badge variant={workflowRiskBadgeVariant(workflow.status)}>{riskLabel}</Badge>
            <Button asChild variant="secondary">
              <Link href={`/workflows/${encodeURIComponent(workflowId)}/share`}>Open share-ready case asset</Link>
            </Button>
          </div>
        </div>
      </header>
      <section className="stats-grid" aria-label="Workflow summary">
        <article className="metric-card">
          <p className="metric-label">Current status</p>
          <p className={`metric-value ${workflowRisk ? "metric-value--danger" : "metric-value--primary"}`}>{workflowStatus}</p>
          <Badge variant={workflowRiskBadgeVariant(workflow.status)}>{riskLabel}</Badge>
        </article>
        <article className="metric-card">
          <p className="metric-label">Run mappings</p>
          <p className="metric-value">{runs.length}</p>
          <p className="cell-sub mono muted">Use this to locate the current execution path.</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Events</p>
          <p className="metric-value">{events.length}</p>
          <p className="cell-sub mono muted">Filter failed and rollback events first.</p>
        </article>
      </section>
      <section className="app-section" aria-label="Workflow copilot">
        <WorkflowOperatorCopilotPanel workflowId={workflowId} />
      </section>
      <section className="app-section" aria-label="Workflow detail panels">
        <div className="grid grid-3">
          <Card>
            <h3>Next recommended action</h3>
            <div className="mono">
              {queueItems.length > 0
                ? "Queue already has pending work. The next high-value action is to run the next queued task from the web surface."
                : latestRunId
                ? "The next high-value action is to queue the latest run contract so this Workflow Case can move forward."
                : "No run is available yet. Use PM intake to create or resume a run for this Workflow Case."}
            </div>
            <WorkflowQueueMutationControls latestRunId={latestRunId} queueCount={queueItems.length} eligibleCount={eligibleQueueCount} showQueueLatest disableRunNextWhenEmpty />
          </Card>
          <Card>
            <h3>Case summary</h3>
            <div className="mono">workflow_id: {workflow.workflow_id || workflowId}</div>
            <div className="mono">Name: {workflowName}</div>
            <div className="mono">Status: {statusLabelEn(workflow.status)}</div>
            <div className="mono">Updated at: {workflowUpdatedAt}</div>
            <div className="mono">Namespace: {workflow.namespace || "-"}</div>
            <div className="mono">Task queue: {workflow.task_queue || "-"}</div>
            <div className="mono">Owner: {String(workflowMeta["owner_pm"] || "-")}</div>
            <div className="mono">Project: {String(workflowMeta["project_key"] || "-")}</div>
            <div className="mono">Verdict: {String(workflowMeta["verdict"] || "-")}</div>
            <div className="mono">Runs: {runs.length}</div>
            <div className="toolbar mt-2">
              <Button asChild variant="secondary">
                <Link href={`/workflows/${encodeURIComponent(workflowId)}/share`}>Open share-ready case asset</Link>
              </Button>
            </div>
          </Card>
          <Card>
            <h3>Run mapping</h3>
            {runs.length === 0 ? (
              <div className="mono">No run records yet</div>
            ) : (
              runs.map((run, index) => (
                <div key={workflowRunRowKey(run, index)} className="mono">
                  <Link href={`/runs/${encodeURIComponent(String(run.run_id || ""))}`}>{run.run_id}</Link> / {statusLabelEn(run.status)} / {run.created_at || "-"}
                </div>
              ))
            )}
          </Card>
          <Card>
            <h3>Workflow events</h3>
            <EventTimeline events={events} />
          </Card>
          <Card>
            <h3>Queue / SLA</h3>
            {queueItems.length === 0 ? (
              <div className="mono">No queued work for this workflow case.</div>
            ) : (
              queueItems.map((item, index) => (
                <div key={`${String(item.queue_id || "queue")}-${index}`} className="mono">
                  {String(item.task_id || "-")} / {String(item.status || "-")} / priority {String(item.priority ?? "-")} / sla {String(item.sla_state || "-")}
                </div>
              ))
            )}
            <span className="mono muted">The web surface can now advance the queue directly when an operator role is configured.</span>
          </Card>
        </div>
      </section>
    </main>
  );
}
