import { useCallback, useEffect, useState } from "react";
import type { WorkflowDetailPayload } from "../lib/types";
import { fetchWorkflow } from "../lib/api";
import { statusLabelZh, statusVariant } from "../lib/statusPresentation";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/Card";

type Props = { workflowId: string; onBack: () => void; onNavigateToRun: (runId: string) => void };

export function WorkflowDetailPage({ workflowId, onBack, onNavigateToRun }: Props) {
  const [data, setData] = useState<WorkflowDetailPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setData(await fetchWorkflow(workflowId)); } catch (err) { setError(err instanceof Error ? err.message : String(err)); } finally { setLoading(false); }
  }, [workflowId]);
  useEffect(() => { void load(); }, [load]);

  if (loading) return <div className="content"><div className="skeleton-stack-lg"><div className="skeleton skeleton-row" /></div></div>;
  if (error) return <div className="content"><div className="alert alert-danger">{error}</div><Button onClick={onBack}>Back</Button></div>;
  if (!data) return null;

  return (
    <div className="content">
      <Button variant="ghost" className="mb-2" onClick={onBack}>Back to workflow list</Button>
      <div className="section-header"><div><h1 className="page-title mono">{data.workflow.workflow_id}</h1></div><Badge variant={statusVariant(data.workflow.status)}>{statusLabelZh(data.workflow.status)}</Badge></div>
      <div className="grid-2">
        <Card>
          <CardHeader>
            <CardTitle>Related Runs ({data.runs.length})</CardTitle>
          </CardHeader>
          <CardBody>
            {data.runs.length === 0 ? <p className="muted">No related runs</p> : (
              <div className="stack-gap-2">
                {data.runs.map((r) => (
                  <div key={r.run_id} className="row-between py-2 border-bottom-subtle">
                    <Button variant="unstyled" className="run-link run-link-reset" onClick={() => onNavigateToRun(r.run_id)}>{r.run_id.slice(0, 12)}</Button>
                    <Badge variant={statusVariant(r.status)}>{statusLabelZh(r.status)}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Events ({data.events.length})</CardTitle>
          </CardHeader>
          <CardBody>
            {data.events.length === 0 ? <p className="muted">No events</p> : (
              <div className="stack-gap-2 max-h-400 overflow-auto">
                {data.events.map((evt, i) => (
                  <div key={`${evt.ts}-${i}`} className="row-between text-xs py-1 border-bottom-subtle">
                    <span className="muted">{evt.ts ? new Date(evt.ts).toLocaleString("zh-CN") : "-"}</span>
                    <span>{evt.event || evt.event_type || "-"}</span>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
