import Link from "next/link";
import type { BadgeVariant } from "../../components/ui/badge";
import { Badge } from "../../components/ui/badge";
import { Card } from "../../components/ui/card";
import { fetchQueue, fetchWorkflows } from "../../lib/api";
import { safeLoad } from "../../lib/serverPageData";
import WorkflowQueueMutationControls from "./WorkflowQueueMutationControls";

function statusLabelEn(status: string | undefined): string {
  const normalized = String(status || "").trim().toLowerCase();
  if (!normalized) {
    return "Unknown";
  }
  if (["success", "done", "passed", "completed", "approved"].includes(normalized)) return "Completed";
  if (["failed", "failure", "error"].includes(normalized)) return "Failed";
  if (["running", "active", "in_progress"].includes(normalized)) return "Running";
  if (["blocked", "warning", "paused"].includes(normalized)) return "Blocked";
  if (["queued", "pending"].includes(normalized)) return "Queued";
  if (["ready"].includes(normalized)) return "Ready";
  return normalized.replace(/_/g, " ");
}

function statusBadgeVariant(status: string | undefined): BadgeVariant {
  const s = String(status || "").toLowerCase();
  if (["success", "done", "passed", "completed"].includes(s)) return "success";
  if (["failed", "failure", "error"].includes(s)) return "failed";
  if (["running", "active", "in_progress"].includes(s)) return "running";
  if (["blocked", "warning", "paused"].includes(s)) return "warning";
  return "default";
}

export default async function WorkflowsPage() {
  const { data: workflows, warning } = await safeLoad(fetchWorkflows, [] as Record<string, unknown>[], "Workflow list");
  const { data: queueItems } = await safeLoad(fetchQueue, [] as Record<string, unknown>[], "Queue list");

  const queueByWorkflow = new Map<string, Array<Record<string, unknown>>>();
  for (const item of queueItems) {
    const workflowId = String(item.workflow_id || "").trim();
    if (!workflowId) {
      continue;
    }
    queueByWorkflow.set(workflowId, [...(queueByWorkflow.get(workflowId) || []), item]);
  }
  const eligibleQueueCount = queueItems.filter((item) => {
    if (Boolean(item.eligible) || String(item.queue_state || "") === "eligible") {
      return true;
    }
    const status = String(item.status || "").toUpperCase();
    return status === "PENDING";
  }).length;
  const atRiskQueueCount = queueItems.filter((item) => {
    const state = String(item.sla_state || "").toLowerCase();
    return state === "at_risk" || state === "breached";
  }).length;
  const queuedWorkflowCount = new Set(
    queueItems.map((item) => String(item.workflow_id || "").trim()).filter(Boolean),
  ).size;
  const recommendedActionText =
    eligibleQueueCount > 0
      ? "Run the next queued task to move the active Workflow Case chain forward."
      : queueItems.length > 0
      ? "Review queue timing and SLA state, then dispatch when the next case becomes eligible."
      : workflows.length > 0
      ? "Open a Workflow Case and queue the latest run contract to start the next operator loop."
      : "Create the first Workflow Case from PM intake, then return here to dispatch queued work.";

  return (
    <main className="grid" aria-labelledby="workflows-page-title">
      <header className="app-section">
        <div className="section-header">
          <div>
            <h1 id="workflows-page-title" className="page-title">Workflow Cases</h1>
            <p className="page-subtitle">Workflow Cases are the operating record tying queue, linked runs, verdict, and later Proof &amp; Replay decisions to the same objective.</p>
          </div>
          <Badge>{workflows.length} workflows / {queueItems.length} queue items</Badge>
        </div>
        <WorkflowQueueMutationControls queueCount={queueItems.length} eligibleCount={eligibleQueueCount} compact />
      </header>
      <section className="stats-grid" aria-label="Workflow Case operator summary">
        <article className="metric-card">
          <p className="metric-label">Workflow Cases</p>
          <p className="metric-value">{workflows.length}</p>
          <p className="cell-sub mono muted">Cases with queued work: {queuedWorkflowCount}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Queue / SLA</p>
          <p className="metric-value">{queueItems.length}</p>
          <p className="cell-sub mono muted">Eligible now: {eligibleQueueCount} / at risk: {atRiskQueueCount}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Next recommended action</p>
          <p className="cell-sub mono muted">{recommendedActionText}</p>
        </article>
      </section>
      <section className="app-section" aria-label="Workflow list">
        {warning ? <p className="alert alert-warning" role="status">{warning}</p> : null}
        {workflows.length === 0 ? (
          <Card>
            <div className="empty-state-stack">
              <span className="muted">No workflow cases yet</span>
              <span className="mono muted">A Workflow Case is opened automatically on first execution.</span>
            </div>
          </Card>
        ) : (
          <Card variant="table">
            <table className="run-table">
              <caption className="sr-only">Workflow list</caption>
              <thead>
                <tr>
                  <th scope="col">Workflow ID</th>
                  <th scope="col">Status</th>
                  <th scope="col">Namespace</th>
                  <th scope="col">Task queue</th>
                  <th scope="col">Runs</th>
                </tr>
              </thead>
              <tbody>
                {workflows.map((workflow: Record<string, unknown>) => {
                  const wfId = String(workflow.workflow_id || "-");
                  const runs = Array.isArray(workflow.runs) ? workflow.runs : [];
                  const queueItemsForWorkflow = queueByWorkflow.get(wfId) || [];
                  const objective = String(workflow.objective || "").trim();
                  const verdict = String(workflow.verdict || "").trim();
                  return (
                    <tr key={wfId}>
                      <th scope="row">
                        <Link href={`/workflows/${encodeURIComponent(wfId)}`} className="run-link">
                          {wfId.length > 20 ? `${wfId.slice(0, 20)}...` : wfId}
                        </Link>
                        {objective ? (
                          <span className="cell-sub mono muted">{objective}</span>
                        ) : null}
                      </th>
                      <td>
                        <Badge variant={statusBadgeVariant(workflow.status as string)}>
                          {statusLabelEn(workflow.status as string)}
                        </Badge>
                        {verdict ? <span className="cell-sub mono muted">verdict: {verdict}</span> : null}
                      </td>
                      <td><span className="mono">{String(workflow.namespace || "-")}</span></td>
                      <td><span className="mono">{String(workflow.task_queue || "-")}</span></td>
                      <td>
                        <span className="cell-primary">{runs.length}</span>
                        {runs.slice(0, 2).map((run: Record<string, unknown>) => (
                          <span key={String(run.run_id)} className="cell-sub mono muted">
                            <Link href={`/runs/${encodeURIComponent(String(run.run_id || ""))}`} className="run-link">{String(run.run_id).slice(0, 10)}</Link>
                          </span>
                        ))}
                        {queueItemsForWorkflow.length > 0 ? (
                          <span className="cell-sub mono muted">
                            queue: {queueItemsForWorkflow.length} / SLA {String(queueItemsForWorkflow[0]?.sla_state || "-")}
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        )}
      </section>
    </main>
  );
}
