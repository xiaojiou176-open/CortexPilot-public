import Link from "next/link";
import type { BadgeVariant } from "../../components/ui/badge";
import { Badge } from "../../components/ui/badge";
import { Card } from "../../components/ui/card";
import { fetchWorkflows } from "../../lib/api";
import { safeLoad } from "../../lib/serverPageData";

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

  return (
    <main className="grid" aria-labelledby="workflows-page-title">
      <header className="app-section">
        <div className="section-header">
          <div>
            <h1 id="workflows-page-title" className="page-title">Workflows</h1>
            <p className="page-subtitle">Review workflow status, namespace, and recent run mappings from one page.</p>
          </div>
          <Badge>{workflows.length} workflows</Badge>
        </div>
      </header>
      <section className="app-section" aria-label="Workflow list">
        {warning ? <p className="alert alert-warning" role="status">{warning}</p> : null}
        {workflows.length === 0 ? (
          <Card>
            <div className="empty-state-stack">
              <span className="muted">No workflows yet</span>
              <span className="mono muted">A workflow is created automatically on first execution.</span>
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
                  return (
                    <tr key={wfId}>
                      <th scope="row">
                        <Link href={`/workflows/${encodeURIComponent(wfId)}`} className="run-link">
                          {wfId.length > 20 ? `${wfId.slice(0, 20)}...` : wfId}
                        </Link>
                      </th>
                      <td>
                        <Badge variant={statusBadgeVariant(workflow.status as string)}>
                          {statusLabelEn(workflow.status as string)}
                        </Badge>
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
