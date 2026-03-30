import { useCallback, useEffect, useState } from "react";
import type { QueueItemRecord, WorkflowDetailPayload } from "../lib/types";
import { enqueueRunQueue, fetchQueue, fetchWorkflow, runNextQueue } from "../lib/api";
import { statusLabelZh, statusVariant } from "../lib/statusPresentation";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/Card";
import { Input } from "../components/ui/Input";

type Props = { workflowId: string; onBack: () => void; onNavigateToRun: (runId: string) => void };

function toUtcIsoOrEmpty(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
}

export function WorkflowDetailPage({ workflowId, onBack, onNavigateToRun }: Props) {
  const [data, setData] = useState<WorkflowDetailPayload | null>(null);
  const [queueItems, setQueueItems] = useState<QueueItemRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [queueBusy, setQueueBusy] = useState(false);
  const [queueNotice, setQueueNotice] = useState("");
  const [queuePriority, setQueuePriority] = useState("0");
  const [queueScheduledAt, setQueueScheduledAt] = useState("");
  const [queueDeadlineAt, setQueueDeadlineAt] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [workflowPayload, queuePayload] = await Promise.all([fetchWorkflow(workflowId), fetchQueue(workflowId)]);
      setData(workflowPayload);
      setQueueItems(Array.isArray(queuePayload) ? queuePayload : []);
    } catch (err) { setError(err instanceof Error ? err.message : String(err)); } finally { setLoading(false); }
  }, [workflowId]);
  useEffect(() => { void load(); }, [load]);

  if (loading) return <div className="content"><div className="skeleton-stack-lg"><div className="skeleton skeleton-row" /></div></div>;
  if (error) return <div className="content"><div className="alert alert-danger">{error}</div><Button onClick={onBack}>Back</Button></div>;
  if (!data) return null;
  const workflowData = data;

  async function handleQueueLatestRun() {
    const latestRunId = workflowData.runs[0]?.run_id;
    if (!latestRunId) {
      setQueueNotice("No run is available to enqueue.");
      return;
    }
    setQueueBusy(true);
    setQueueNotice("");
    try {
      const priority = Number.parseInt(queuePriority, 10);
      const payload: Record<string, string | number> = {};
      if (Number.isFinite(priority)) {
        payload.priority = priority;
      }
      if (queueScheduledAt.trim()) {
        payload.scheduled_at = toUtcIsoOrEmpty(queueScheduledAt);
      }
      if (queueDeadlineAt.trim()) {
        payload.deadline_at = toUtcIsoOrEmpty(queueDeadlineAt);
      }
      const result = await enqueueRunQueue(latestRunId, payload);
      setQueueNotice(`Queued ${String(result.task_id || latestRunId)}.`);
      await load();
    } catch (err) {
      setQueueNotice(err instanceof Error ? err.message : String(err));
    } finally {
      setQueueBusy(false);
    }
  }

  async function handleRunNextQueue() {
    setQueueBusy(true);
    setQueueNotice("");
    try {
      const result = await runNextQueue({});
      setQueueNotice(result?.ok ? `Started ${String(result.run_id || "-")}.` : String(result?.reason || "queue empty"));
      await load();
    } catch (err) {
      setQueueNotice(err instanceof Error ? err.message : String(err));
    } finally {
      setQueueBusy(false);
    }
  }

  return (
    <div className="content">
      <Button variant="ghost" className="mb-2" onClick={onBack}>Back to workflow list</Button>
      <div className="section-header"><div><h1 className="page-title mono">{workflowData.workflow.workflow_id}</h1></div><Badge variant={statusVariant(workflowData.workflow.status)}>{statusLabelZh(workflowData.workflow.status)}</Badge></div>
      <div className="row-gap-2 mb-2">
        <Input
          type="number"
          aria-label="Queue priority"
          value={queuePriority}
          onChange={(event) => setQueuePriority(event.target.value)}
          placeholder="Priority"
        />
        <Input
          type="datetime-local"
          aria-label="Queue scheduled at"
          value={queueScheduledAt}
          onChange={(event) => setQueueScheduledAt(event.target.value)}
          placeholder="Scheduled at"
        />
        <Input
          type="datetime-local"
          aria-label="Queue deadline at"
          value={queueDeadlineAt}
          onChange={(event) => setQueueDeadlineAt(event.target.value)}
          placeholder="Deadline at"
        />
        <Button variant="secondary" onClick={() => void handleQueueLatestRun()} disabled={queueBusy || workflowData.runs.length === 0}>Queue latest run contract</Button>
        <Button variant="secondary" onClick={() => void handleRunNextQueue()} disabled={queueBusy}>{queueBusy ? "Running..." : "Run next queued task"}</Button>
      </div>
      {queueNotice ? <div className="alert alert-warning">{queueNotice}</div> : null}
      <div className="grid-2">
        <Card>
          <CardHeader>
            <CardTitle>Workflow Case Summary</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="stack-gap-2">
              <div className="mono">status: {workflowData.workflow.status || "-"}</div>
              <div className="mono">objective: {workflowData.workflow.objective || "-"}</div>
              <div className="mono">owner: {workflowData.workflow.owner_pm || "-"}</div>
              <div className="mono">project: {workflowData.workflow.project_key || "-"}</div>
              <div className="mono">verdict: {workflowData.workflow.verdict || "-"}</div>
              <div className="mono">pm_sessions: {(workflowData.workflow.pm_session_ids || []).join(", ") || "-"}</div>
              <div className="mono">summary: {workflowData.workflow.summary || "-"}</div>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Related Runs ({workflowData.runs.length})</CardTitle>
          </CardHeader>
          <CardBody>
            {workflowData.runs.length === 0 ? <p className="muted">No related runs</p> : (
              <div className="stack-gap-2">
                {workflowData.runs.map((r) => (
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
            <CardTitle>Events ({workflowData.events.length})</CardTitle>
          </CardHeader>
          <CardBody>
            {workflowData.events.length === 0 ? <p className="muted">No events</p> : (
              <div className="stack-gap-2 max-h-400 overflow-auto">
                {workflowData.events.map((evt, i) => (
                  <div key={`${evt.ts}-${i}`} className="row-between text-xs py-1 border-bottom-subtle">
                    <span className="muted">{evt.ts ? new Date(evt.ts).toLocaleString("zh-CN") : "-"}</span>
                    <span>{evt.event || evt.event_type || "-"}</span>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Queue / SLA ({queueItems.length})</CardTitle>
          </CardHeader>
          <CardBody>
            {queueItems.length === 0 ? <p className="muted">No queued work for this workflow case.</p> : (
              <div className="stack-gap-2">
                {queueItems.map((item) => (
                  <div key={item.queue_id} className="row-between py-2 border-bottom-subtle">
                    <div className="mono">
                      <div>{item.task_id}</div>
                      <div className="muted">priority {String(item.priority ?? "-")} / sla {String(item.sla_state || "-")}</div>
                    </div>
                    <Badge variant={statusVariant(item.status)}>{statusLabelZh(item.status)}</Badge>
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
