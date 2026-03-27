import Link from "next/link";
import EventTimeline from "../../../components/EventTimeline";
import type { BadgeVariant } from "../../../components/ui/badge";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { fetchWorkflow } from "../../../lib/api";
import { safeLoad } from "../../../lib/serverPageData";

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

  if (warning) {
    return (
      <main className="grid" aria-labelledby="workflow-detail-title">
        <header className="app-section">
          <div className="section-header">
            <div>
              <h1 id="workflow-detail-title">Workflow detail</h1>
              <p>Confirm whether the workflow can keep running and whether governance actions should pause.</p>
            </div>
            <Badge className="mono">{workflowId}</Badge>
          </div>
        </header>
        <section className="app-section" aria-label="Workflow degraded state">
          <Card>
            <div className="empty-state-stack" role="alert" aria-live="assertive">
              <strong>Workflow detail is in read-only degraded mode</strong>
              <span className="muted">{warning}</span>
              <span className="mono muted">The current data is incomplete, so approval, rollback, replay, and similar governance actions stay disabled by default.</span>
            </div>
          </Card>
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
            <h1 id="workflow-detail-title">Workflow detail</h1>
            <p>Classify risk first, then confirm run mapping and the event timeline before taking governance action.</p>
          </div>
          <div className="toolbar" role="group" aria-label="Workflow risk summary">
            <Badge className="mono">{workflow.workflow_id || workflowId}</Badge>
            <Badge variant={workflowRiskBadgeVariant(workflow.status)}>{riskLabel}</Badge>
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
      <section className="app-section" aria-label="Workflow detail panels">
        <div className="grid grid-3">
          <Card>
            <h3>Basics</h3>
            <div className="mono">workflow_id: {workflow.workflow_id || workflowId}</div>
            <div className="mono">Name: {workflowName}</div>
            <div className="mono">Status: {statusLabelEn(workflow.status)}</div>
            <div className="mono">Updated at: {workflowUpdatedAt}</div>
            <div className="mono">Namespace: {workflow.namespace || "-"}</div>
            <div className="mono">Task queue: {workflow.task_queue || "-"}</div>
            <div className="mono">Runs: {runs.length}</div>
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
        </div>
      </section>
    </main>
  );
}
