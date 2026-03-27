import { useCallback, useEffect, useState } from "react";
import type { WorkflowRecord } from "../lib/types";
import { fetchWorkflows } from "../lib/api";
import { statusLabelZh, statusVariant } from "../lib/statusPresentation";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";

type WorkflowsPageProps = {
  onNavigateToWorkflow: (workflowId: string) => void;
};

export function WorkflowsPage({ onNavigateToWorkflow }: WorkflowsPageProps) {
  const [workflows, setWorkflows] = useState<WorkflowRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const data = await fetchWorkflows(); setWorkflows(Array.isArray(data) ? data : []); }
    catch (err) { setError(err instanceof Error ? err.message : String(err)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="content">
      <div className="section-header">
        <div><h1 className="page-title">Workflows</h1><p className="page-subtitle">Temporal workflow status and related runs</p></div>
        <Button onClick={load}>Refresh</Button>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      {loading ? (
        <div className="skeleton-stack-lg"><div className="skeleton skeleton-row" /><div className="skeleton skeleton-row" /></div>
      ) : workflows.length === 0 ? (
        <div className="empty-state-stack"><p className="muted">No workflows yet</p></div>
      ) : (
        <Card>
          <table className="run-table">
            <thead><tr><th>Workflow ID</th><th>Status</th><th>Namespace</th><th>Runs</th></tr></thead>
            <tbody>
              {workflows.map((wf) => (
                <tr key={wf.workflow_id}>
                  <td><Button variant="unstyled" className="run-link run-link-reset" onClick={() => onNavigateToWorkflow(wf.workflow_id)}>{wf.workflow_id}</Button></td>
                  <td><Badge variant={statusVariant(wf.status)}>{statusLabelZh(wf.status)}</Badge></td>
                  <td className="mono">{wf.namespace || "-"}</td>
                  <td>{wf.runs?.length ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
