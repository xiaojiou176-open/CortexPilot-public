import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_UI_LOCALE, getUiCopy, type UiLocale } from "@cortexpilot/frontend-shared/uiCopy";
import type { RunDetailPayload, EventRecord, ReportRecord, ToolCallRecord, JsonValue, RunSummary } from "../lib/types";
import {
  fetchRun, fetchEvents, fetchDiff, fetchReports, fetchToolCalls, fetchChainSpec,
  fetchAgentStatus, fetchRuns, rollbackRun, rejectRun, replayRun, promoteEvidence, fetchOperatorCopilotBrief,
  type EventsStream,
  openEventsStream,
} from "../lib/api";
import { sanitizeUiError, uiErrorDetail } from "../lib/uiError";
import {
  statusLabelZh,
  badgeVariant,
  statusDotClass,
  outcomeSemanticLabelZh,
  outcomeSemanticBadgeVariant,
  outcomeActionHintZh,
  outcomeSemantic,
} from "../lib/statusPresentation";
import { toast } from "sonner";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/Card";
import { Select } from "../components/ui/Input";
import { DesktopCopilotPanel } from "../components/copilot/DesktopCopilotPanel";

const RUN_COPILOT_QUESTIONS = [
  "Why did this run fail or get blocked?",
  "What changed compared with the baseline?",
  "What is the next operator action?",
  "Where is the workflow or queue risk right now?",
];

type RunDetailTab = "events" | "diff" | "reports" | "tools" | "chain" | "contract" | "replay";

type RunDetailPageProps = {
  runId: string;
  onBack: () => void;
  onOpenCompare?: () => void;
  locale?: UiLocale;
};

/* ─── helpers ─── */
function asRecord(value: unknown): Record<string, JsonValue> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, JsonValue>) : {};
}
function toArr<T>(v: T[] | undefined | null): T[] { return Array.isArray(v) ? v : []; }
function toStr(v: unknown, fallback = "-"): string { return typeof v === "string" && v.trim() ? v.trim() : fallback; }
function asNumber(value: JsonValue | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
function eventDedupeKey(event: EventRecord): string {
  const maybeTrace = event.trace_id ?? "";
  const maybeTs = event.ts ?? "";
  const maybeEvent = event.event ?? event.event_type ?? "";
  return `${maybeTs}|${maybeEvent}|${String(maybeTrace)}`;
}
function dedupeAndSortEvents(items: EventRecord[]): EventRecord[] {
  const seen = new Set<string>();
  const deduped: EventRecord[] = [];
  for (const item of items) {
    const key = eventDedupeKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }
  return deduped.sort((a, b) => (a.ts || "").localeCompare(b.ts || ""));
}

const TERMINAL_RUN_STATUS = new Set([
  "success",
  "done",
  "passed",
  "failed",
  "failure",
  "error",
  "rejected",
  "completed",
  "cancelled",
  "stopped",
  "archived",
]);

const TERMINAL_EVENT_NAMES = new Set([
  "RUN_COMPLETED",
  "RUN_FAILED",
  "RUN_REJECTED",
  "RUN_CANCELLED",
  "RUN_ARCHIVED",
  "TASK_RUN_COMPLETED",
  "TASK_RUN_FAILED",
]);

function isTerminalStatus(status: unknown): boolean {
  return typeof status === "string" && TERMINAL_RUN_STATUS.has(status.toLowerCase());
}

function isTerminalEvent(event: EventRecord): boolean {
  const name = typeof event.event === "string" ? event.event : event.event_type;
  return typeof name === "string" && TERMINAL_EVENT_NAMES.has(name.toUpperCase());
}

function statusLabel(status: string): string {
  const normalized = status.trim().toLowerCase();
  const labels: Record<string, string> = {
    archived: "Archived",
    blocked: "Blocked",
    cancelled: "Cancelled",
    completed: "Completed",
    done: "Done",
    error: "Error",
    failed: "Failed",
    paused: "Paused",
    rejected: "Rejected",
    running: "Running",
    stopped: "Stopped",
    success: "Success",
  };
  return labels[normalized] || statusLabelZh(status);
}

export function RunDetailPage({ runId, onBack, onOpenCompare = () => {}, locale = DEFAULT_UI_LOCALE }: RunDetailPageProps) {
  const runDetailCopy = getUiCopy(locale).desktop.runDetail;
  const [run, setRun] = useState<RunDetailPayload | null>(null);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [diff, setDiff] = useState("");
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [toolCalls, setToolCalls] = useState<ToolCallRecord[]>([]);
  const [chainSpec, setChainSpec] = useState<Record<string, JsonValue> | null>(null);
  const [agentStatus, setAgentStatus] = useState<Array<Record<string, unknown>>>([]);
  const [availableRuns, setAvailableRuns] = useState<RunSummary[]>([]);
  const [baselineRunId, setBaselineRunId] = useState("");
  const [replayResult, setReplayResult] = useState<Record<string, JsonValue> | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<RunDetailTab>("events");
  const [actionBusy, setActionBusy] = useState(false);
  const [liveEnabled, setLiveEnabled] = useState(true);
  const [liveTransport, setLiveTransport] = useState<"sse" | "polling">("sse");
  const [expandedEvent, setExpandedEvent] = useState<number | null>(null);

  const eventsRef = useRef<EventRecord[]>([]);
  const loadTokenRef = useRef(0);

  const toggleExpandedEvent = useCallback((index: number) => {
    setExpandedEvent((prev) => (prev === index ? null : index));
  }, []);

  /* ─── initial load ─── */
  const load = useCallback(async () => {
    const loadToken = loadTokenRef.current + 1;
    loadTokenRef.current = loadToken;
    setLoading(true);
    setError("");
    try {
      const [runResult, eventsResult] = await Promise.allSettled([fetchRun(runId), fetchEvents(runId)]);
      if (loadToken !== loadTokenRef.current) {
        return;
      }
      if (runResult.status !== "fulfilled") {
        throw runResult.reason;
      }
      const runData = runResult.value;
      const eventsData = eventsResult.status === "fulfilled" ? eventsResult.value : [];
      setRun(runData);
      const sortedEvents = dedupeAndSortEvents(toArr(eventsData));
      setEvents(sortedEvents);
      eventsRef.current = sortedEvents;
      if (eventsResult.status !== "fulfilled") {
        console.warn(`[RunDetailPage] initial events refresh failed: ${uiErrorDetail(eventsResult.reason)}`);
      }

      // parallel secondary loads
      const [diffRes, reportsRes, toolsRes, chainRes, agentRes, runsRes] = await Promise.allSettled([
        fetchDiff(runId),
        fetchReports(runId),
        fetchToolCalls(runId),
        fetchChainSpec(runId),
        fetchAgentStatus(runId),
        fetchRuns(),
      ]);
      if (loadToken !== loadTokenRef.current) {
        return;
      }
      if (diffRes.status === "fulfilled") setDiff(diffRes.value.diff || "");
      if (reportsRes.status === "fulfilled") setReports(toArr(reportsRes.value));
      if (toolsRes.status === "fulfilled") setToolCalls(toArr(toolsRes.value?.data));
      if (chainRes.status === "fulfilled") setChainSpec((chainRes.value?.data as Record<string, JsonValue>) || null);
      if (agentRes.status === "fulfilled") {
        const d = agentRes.value as { agents?: Array<Record<string, unknown>> };
        setAgentStatus(toArr(d?.agents));
      }
      if (runsRes.status === "fulfilled") setAvailableRuns(toArr(runsRes.value));
    } catch (err) {
      setError(sanitizeUiError(err, "Run detail failed to load"));
    } finally {
      if (loadToken === loadTokenRef.current) {
        setLoading(false);
      }
    }
  }, [runId]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    setLiveTransport("sse");
    setLiveEnabled(true);
  }, [runId]);

  useEffect(() => {
    if (isTerminalStatus(run?.status)) {
      setLiveEnabled(false);
    }
  }, [run?.status]);

  /* ─── live SSE ─── */
  useEffect(() => {
    if (!liveEnabled || !run || liveTransport !== "sse" || isTerminalStatus(run.status)) return;

    let es: EventsStream | null = null;
    try {
      es = openEventsStream(runId, { tail: true });
      es.onmessage = (msg) => {
        try {
          const evt = JSON.parse(msg.data) as EventRecord;
          setEvents((prev) => {
            const next = dedupeAndSortEvents([...prev, evt]);
            eventsRef.current = next;
            return next;
          });
          if (isTerminalEvent(evt)) {
            setLiveEnabled(false);
          }
        } catch (e) { console.debug("[RunDetailPage] SSE message parse failed:", e); }
      };
      es.onerror = () => {
        console.warn("[RunDetailPage] SSE disconnected, switching to polling fallback.");
        es?.close();
        setLiveTransport("polling");
      };
    } catch (error) {
      console.warn("[RunDetailPage] SSE unavailable, switching to polling fallback.", error);
      setLiveTransport("polling");
    }

    return () => { es?.close(); };
  }, [liveEnabled, liveTransport, run, runId]);

  /* ─── polling fallback ─── */
  useEffect(() => {
    if (!liveEnabled || !run || liveTransport !== "polling") return;
    if (isTerminalStatus(run.status)) {
      setLiveEnabled(false);
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      try {
        const [runResult, eventsResult] = await Promise.allSettled([fetchRun(runId), fetchEvents(runId)]);
        if (cancelled) return;
        const runData = runResult.status === "fulfilled" ? runResult.value : run;
        const sortedEvents =
          eventsResult.status === "fulfilled"
            ? dedupeAndSortEvents(toArr(eventsResult.value))
            : eventsRef.current;

        if (runResult.status === "fulfilled") {
          setRun(runResult.value);
        } else {
          console.warn(`[RunDetailPage] polling run refresh failed: ${uiErrorDetail(runResult.reason)}`);
        }
        if (eventsResult.status === "fulfilled") {
          setEvents(sortedEvents);
          eventsRef.current = sortedEvents;
        } else {
          console.warn(`[RunDetailPage] polling events refresh failed: ${uiErrorDetail(eventsResult.reason)}`);
        }
        if (isTerminalStatus(runData?.status) || sortedEvents.some(isTerminalEvent)) {
          setLiveEnabled(false);
          return;
        }
      } catch (error) {
        if (!cancelled) {
          console.warn("[RunDetailPage] polling refresh failed.", error);
        }
      }
      if (!cancelled) {
        timer = setTimeout(() => { void poll(); }, 2000);
      }
    };

    void poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [liveEnabled, liveTransport, run, runId]);

  /* ─── actions ─── */
  async function handleAction(action: "rollback" | "reject" | "replay" | "promote") {
    setActionBusy(true);
    try {
      if (action === "rollback") await rollbackRun(runId);
      else if (action === "reject") await rejectRun(runId);
      else if (action === "promote") await promoteEvidence(runId);
      else {
        const result = await replayRun(runId, baselineRunId || undefined);
        setReplayResult(result);
      }
      const successMessage = {
        rollback: "Rollback completed. Next step: refresh and confirm the run returned to a healthy state.",
        reject: "Reject completed. Next step: return to the list and continue with the next item.",
        replay: "Replay comparison completed. Next step: open Replay result to inspect the delta.",
        promote: "Evidence promotion completed. Next step: verify bundle completeness in Reports.",
      }[action];
      toast.success(successMessage);
      void load();
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      toast.error(`Action did not complete: ${detail}. Next step: retry it, and if it still fails, return to the list and re-open the run.`);
    } finally {
      setActionBusy(false);
    }
  }

  /* ─── loading / error ─── */
  if (loading) return (
    <div className="content">
      <div className="skeleton-stack-lg">
        <div className="skeleton skeleton-card-tall" />
        <div className="skeleton skeleton-row" />
        <div className="skeleton skeleton-row" />
        <div className="skeleton skeleton-row" />
      </div>
    </div>
  );
  if (error) return (
    <div className="content">
      <div className="alert alert-danger">
        <div className="stack-gap-2">
          <p>{runDetailCopy.loadErrorPrefix} {error}</p>
          <p className="muted text-xs">{runDetailCopy.loadErrorNextStep}</p>
        </div>
      </div>
      <div className="row-gap-2">
        <Button variant="primary" onClick={() => void load()}>{runDetailCopy.retryLoad}</Button>
        <Button onClick={onBack}>{runDetailCopy.backToList}</Button>
      </div>
    </div>
  );
  if (!run) return (
    <div className="content">
      <div className="empty-state-stack">
        <p className="muted">{runDetailCopy.noDetailPayload}</p>
        <p className="muted text-xs">{runDetailCopy.noDetailNextStep}</p>
        <div className="row-gap-2">
          <Button variant="primary" onClick={() => void load()}>{runDetailCopy.retryLoad}</Button>
          <Button onClick={onBack}>{runDetailCopy.backToList}</Button>
        </div>
      </div>
    </div>
  );

  /* ─── derived data ─── */
  const testReport = reports.find(r => r.name === "test_report.json")?.data;
  const reviewReport = reports.find(r => r.name === "review_report.json")?.data;
  const evidenceReport = reports.find(r => r.name === "evidence_report.json")?.data;
  const incidentPack = reports.find(r => r.name === "incident_pack.json")?.data as Record<string, JsonValue> | undefined;
  const proofPack = reports.find(r => r.name === "proof_pack.json")?.data as Record<string, JsonValue> | undefined;
  const runCompareReport = asRecord(reports.find(r => r.name === "run_compare_report.json")?.data);
  const compareSummary = asRecord(runCompareReport.compare_summary);
  const chainReport = reports.find(r => r.name === "chain_report.json")?.data;
  const workReport = reports.find(r => r.name === "work_report.json")?.data;
  const taskResult = reports.find(r => r.name === "task_result.json")?.data;
  const compareSummaryDeltaCount =
    asNumber(compareSummary.mismatched_count) +
    asNumber(compareSummary.missing_count) +
    asNumber(compareSummary.extra_count);
  const traceId = toStr(run.manifest?.trace_id, toStr(run.manifest?.trace?.trace_id));
  const workflowId = toStr(run.manifest?.workflow?.workflow_id);
  const isTerminal = isTerminalStatus(run.status);
  const pendingApprovals = events.filter(ev => (ev.event || "").toUpperCase() === "HUMAN_APPROVAL_REQUIRED");
  const semanticType = outcomeSemantic(run.outcome_type, run.status, run.failure_class, run.failure_code);
  const outcomeSemanticText = ({
    action_required: "Action required",
    blocked: "Blocked",
    completed: "Completed",
    failed: "Failed",
    manual_pending: "Awaiting approval",
    running: "Running",
    unknown: "Needs review",
  } as Record<string, string>)[semanticType] || outcomeSemanticLabelZh(
    run.outcome_type,
    run.outcome_label_zh,
    run.status,
    run.failure_class,
    run.failure_code,
  );
  const actionHintText = ({
    action_required: "Inspect failure details and choose the next operator action.",
    blocked: "Resolve the blocker before moving the run forward.",
    completed: "Validate the evidence and archive or hand off the result.",
    failed: "Review the failure details, then decide whether to rollback, reject, or replay.",
    manual_pending: "Complete the required approval before continuing.",
    running: "Keep monitoring live progress and refresh when needed.",
    unknown: "Review the reports and timeline to determine the next action.",
  } as Record<string, string>)[semanticType] || outcomeActionHintZh(
    run.action_hint_zh,
    run.outcome_type,
    run.status,
    run.failure_class,
    run.failure_code,
  );

  const tabs: { key: RunDetailTab; label: string }[] = [
    { key: "events", label: `Event timeline (${events.length})` },
    { key: "diff", label: "Change diff" },
    { key: "reports", label: `Reports (${reports.length})` },
    { key: "tools", label: `Tool calls (${toolCalls.length})` },
    { key: "chain", label: "Chain flow" },
    { key: "contract", label: "Contract policy" },
    { key: "replay", label: "Replay compare" },
  ];

  return (
    <div className="content">
      {/* Header */}
      <div className="section-header">
        <div>
          <Button variant="ghost" className="mb-2" onClick={onBack}>{runDetailCopy.backToList}</Button>
          <h1 className="page-title mono run-detail-title">{run.run_id}</h1>
          <p className="page-subtitle">Task {run.task_id}</p>
        </div>
        <div className="row-start-gap-2">
          <Badge variant={badgeVariant(run.status)}>{statusLabel(run.status)}</Badge>
          <Button variant={liveEnabled && !isTerminal ? "primary" : "ghost"} onClick={() => setLiveEnabled(p => !p)} title={liveEnabled ? "Pause live updates" : "Resume live updates"}>
            {liveEnabled && !isTerminal ? "LIVE" : "PAUSED"}
          </Button>
        </div>
      </div>

      {/* Pending approvals alert */}
      {pendingApprovals.length > 0 && (
        <div className="alert alert-danger mb-4">
          {runDetailCopy.pendingApprovalWithCount(pendingApprovals.length)}
        </div>
      )}
      {semanticType === "manual_pending" && pendingApprovals.length === 0 && (
        <div className="alert alert-danger mb-4">
          {runDetailCopy.pendingApprovalWithoutCount}
        </div>
      )}

      <div className="mb-5">
        <DesktopCopilotPanel
          title={runDetailCopy.operatorCopilotTitle}
          intro={runDetailCopy.operatorCopilotIntro}
          buttonLabel={runDetailCopy.operatorCopilotButton}
          questionSet={RUN_COPILOT_QUESTIONS}
          loadBrief={() => fetchOperatorCopilotBrief(runId)}
        />
      </div>

      {/* Summary cards row */}
      <div className="grid-3 mb-5">
        {/* Status + Contract card */}
        <Card>
          <CardHeader><CardTitle className="card-title-reset">Run overview</CardTitle></CardHeader>
          <CardBody>
            <div className="data-list">
              <div className="data-list-row"><span className="data-list-label">Run ID</span><span className="data-list-value mono">{run.run_id}</span></div>
              <div className="data-list-row"><span className="data-list-label">Task ID</span><span className="data-list-value">{run.task_id}</span></div>
              <div className="data-list-row"><span className="data-list-label">Status</span><span className="data-list-value"><span className="status-inline"><span className={statusDotClass(run.status)} /><Badge variant={badgeVariant(run.status)}>{statusLabel(run.status)}</Badge></span></span></div>
              <div className="data-list-row"><span className="data-list-label">Execution semantic</span><span className="data-list-value"><Badge variant={outcomeSemanticBadgeVariant(run.outcome_type, run.status, run.failure_class, run.failure_code)}>{outcomeSemanticText}</Badge></span></div>
              {run.failure_code && <div className="data-list-row"><span className="data-list-label">Failure code</span><span className="data-list-value mono">{run.failure_code}</span></div>}
              {run.failure_summary_zh && <div className="data-list-row"><span className="data-list-label">Failure summary</span><span className="data-list-value cell-danger">{run.failure_summary_zh}</span></div>}
              <div className="data-list-row"><span className="data-list-label">Next action</span><span className="data-list-value">{actionHintText}</span></div>
              <div className="data-list-row"><span className="data-list-label">Current owner</span><span className="data-list-value mono">{toStr(run.owner_agent_id)} ({toStr(run.owner_role)})</span></div>
              <div className="data-list-row"><span className="data-list-label">Assigned execution</span><span className="data-list-value mono">{toStr(run.assigned_agent_id)} ({toStr(run.assigned_role)})</span></div>
              <div className="data-list-row"><span className="data-list-label">Created at</span><span className="data-list-value">{run.created_at ? new Date(run.created_at).toLocaleString("en-US") : "-"}</span></div>
              {traceId !== "-" && <div className="data-list-row"><span className="data-list-label">Trace ID</span><span className="data-list-value mono">{traceId}</span></div>}
              {workflowId !== "-" && <div className="data-list-row"><span className="data-list-label">Workflow</span><span className="data-list-value mono">{workflowId}</span></div>}
              {run.failure_reason && <div className="data-list-row"><span className="data-list-label">Failure reason</span><span className="data-list-value cell-danger">{run.failure_reason}</span></div>}
            </div>
          </CardBody>
        </Card>

        {/* Agent status card */}
        <Card>
          <CardHeader><CardTitle className="card-title-reset">Execution roles</CardTitle></CardHeader>
          <CardBody>
            {agentStatus.length === 0 ? (
              <div className="empty-state-stack">
                <p className="muted">No execution role status is available yet.</p>
                <p className="muted text-xs">Next step: use Retry fetch to request a fresh payload.</p>
                <Button onClick={() => void load()}>Retry fetch</Button>
              </div>
            ) : (
              <div className="data-list">
                {agentStatus.map((agent, i) => {
                  const agentStatusText = typeof agent.status === "string" ? agent.status : "";
                  return (
                    <div key={i} className="data-list-row">
                      <span className="data-list-label mono">{toStr(agent.role as string)}</span>
                      <span className="data-list-value">
                        <span className="status-inline">
                          <span className={statusDotClass(agentStatusText)} />
                          <Badge variant={badgeVariant(agentStatusText)}>{statusLabel(agentStatusText)}</Badge>
                        </span>
                        {typeof agent.agent_id === "string" && (
                          <span className="mono muted ml-2 text-xs">
                            {agent.agent_id}
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Evidence hashes card */}
        <Card>
          <CardHeader><CardTitle className="card-title-reset">Evidence and traceability</CardTitle></CardHeader>
          <CardBody>
            {run.manifest?.evidence_hashes ? (
              <div className="data-list">
                {Object.entries(run.manifest.evidence_hashes as Record<string, unknown>).slice(0, 8).map(([key, val]) => (
                  <div key={key} className="data-list-row">
                    <span className="data-list-label mono text-xs">{key}</span>
                    <span className="data-list-value mono text-xs">{String(val).slice(0, 16)}...</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state-stack">
                <p className="muted">No evidence summary is available yet.</p>
                <p className="muted text-xs">Next step: refresh the payload and try again.</p>
                <Button onClick={() => void load()}>Refresh data</Button>
              </div>
            )}
            <div className="mt-3 row-gap-2">
              <Button className="text-xs" disabled={actionBusy} onClick={() => handleAction("promote")}>Promote evidence</Button>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Actions bar */}
      <div className="row-gap-2 mb-4">
        <Button variant="secondary" disabled={actionBusy} onClick={() => handleAction("rollback")}>Rollback</Button>
        <Button variant="destructive" disabled={actionBusy} onClick={() => handleAction("reject")}>Reject</Button>
        <Button disabled={actionBusy} onClick={load}>Refresh</Button>
      </div>

      {/* Tabs */}
      <div className="nav">
        {tabs.map((tab) => (
          <Button key={tab.key} variant={activeTab === tab.key ? "primary" : "ghost"} onClick={() => setActiveTab(tab.key)}>
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Tab: Events */}
      {activeTab === "events" && (
        <Card className="table-card">
          {events.length === 0 ? (
            <div className="empty-state-stack">
              <p className="muted">No events are available yet.</p>
              <p className="muted text-xs">Next step: refresh events and request a fresh payload.</p>
              <Button onClick={() => void load()}>Refresh events</Button>
            </div>
          ) : (
            <table className="run-table">
              <thead><tr><th>Time</th><th>Event</th><th>Level</th><th>Task ID</th></tr></thead>
              <tbody>
                {events.map((evt, i) => (
                  <Fragment key={`${evt.ts}-${i}`}>
                    <tr
                      className={evt.context ? "clickable-row" : ""}
                    >
                      <td className="muted">{evt.ts ? new Date(evt.ts).toLocaleString("en-US") : "-"}</td>
                      <td className="cell-primary">
                        {evt.context ? (
                          <Button
                            variant="ghost"
                            aria-expanded={expandedEvent === i}
                            aria-label={`View event details ${evt.event || evt.event_type || "event"}`}
                            onClick={() => toggleExpandedEvent(i)}
                          >
                            {evt.event || evt.event_type || "-"}
                          </Button>
                        ) : (
                          evt.event || evt.event_type || "-"
                        )}
                      </td>
                      <td><Badge variant={badgeVariant(evt.level)}>{evt.level || "-"}</Badge></td>
                      <td className="mono">{evt.task_id || "-"}</td>
                    </tr>
                    {expandedEvent === i && evt.context && (
                      <tr><td colSpan={4}><pre className="pre-reset text-xs pre-scroll-300">{JSON.stringify(evt.context, null, 2)}</pre></td></tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {/* Tab: Diff */}
      {activeTab === "diff" && (
        <Card>
          {diff ? (
            <pre className="pre-scroll-500">{diff}</pre>
          ) : (
            <div className="empty-state-stack">
              <p className="muted">No diff content is available yet.</p>
              <p className="muted text-xs">Next step: retry loading. If it stays empty, return to Event timeline and inspect execution progress there.</p>
              <div className="row-gap-2">
                <Button onClick={() => void load()}>Retry load</Button>
                <Button variant="ghost" onClick={() => setActiveTab("events")}>Back to Event timeline</Button>
              </div>
            </div>
          )}
          {run.allowed_paths && run.allowed_paths.length > 0 && (
            <div className="p-3-4 border-top-subtle">
              <span className="muted text-xs fw-500">Allowed paths: </span>
              <span className="chip-list inline-flex">
                {run.allowed_paths.map((p) => <span key={p} className="chip">{p}</span>)}
              </span>
            </div>
          )}
        </Card>
      )}

      {/* Tab: Reports */}
      {activeTab === "reports" && (
        <Card>
          {reports.length === 0 ? (
            <div className="empty-state-stack">
              <p className="muted">No reports are available yet.</p>
              <p className="muted text-xs">Next step: refresh reports and request a fresh payload.</p>
              <Button onClick={() => void load()}>Refresh reports</Button>
            </div>
          ) : (
            <div className="stack-gap-3 p-3">
              {reports.map((r, i) => (
                <details key={`${r.name}-${i}`} className="collapsible">
                  <summary>{r.name}</summary>
                  <div className="collapsible-body"><pre>{typeof r.data === "string" ? r.data : JSON.stringify(r.data, null, 2)}</pre></div>
                </details>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Tab: Tool Calls */}
      {activeTab === "tools" && (
        <Card className="table-card">
          {toolCalls.length === 0 ? (
            <div className="empty-state-stack">
              <p className="muted">No tool-call records are available yet.</p>
              <p className="muted text-xs">Next step: refresh tool calls and request a fresh payload.</p>
              <Button onClick={() => void load()}>Refresh tool calls</Button>
            </div>
          ) : (
            <table className="run-table">
              <thead><tr><th>Tool</th><th>Status</th><th>Task ID</th><th>Duration</th><th>Error</th></tr></thead>
              <tbody>
                {toolCalls.map((tc, i) => (
                  <tr key={i} className={tc.status === "error" ? "session-row--failed" : ""}>
                    <td className="cell-primary mono">{tc.tool || "-"}</td>
                    <td><Badge variant={badgeVariant(tc.status)}>{statusLabel(tc.status || "")}</Badge></td>
                    <td className="mono muted">{tc.task_id || "-"}</td>
                    <td className="muted">{tc.duration_ms != null ? `${tc.duration_ms}ms` : "-"}</td>
                    <td className={tc.error ? "cell-danger" : "muted"}>{tc.error || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {/* Tab: Chain */}
      {activeTab === "chain" && (
        <Card>
          {chainSpec || chainReport ? (
            <div className="stack-gap-3 p-3">
              {chainSpec && (
                <details className="collapsible" open>
                  <summary>Chain Spec (chain.json)</summary>
                  <div className="collapsible-body"><pre>{JSON.stringify(chainSpec, null, 2)}</pre></div>
                </details>
              )}
              {chainReport && (
                <details className="collapsible">
                  <summary>Chain Report</summary>
                  <div className="collapsible-body"><pre>{JSON.stringify(chainReport, null, 2)}</pre></div>
                </details>
              )}
            </div>
          ) : (
            <div className="empty-state-stack">
              <p className="muted">No chain-flow content is available yet.</p>
              <p className="muted text-xs">Next step: refresh chain flow and request a fresh payload.</p>
              <Button onClick={() => void load()}>Refresh chain flow</Button>
            </div>
          )}
        </Card>
      )}

      {/* Tab: Contract */}
      {activeTab === "contract" && (
        <Card>
          {run.contract ? (
            <pre>{JSON.stringify(run.contract, null, 2)}</pre>
          ) : (
            <div className="empty-state-stack">
              <p className="muted">No contract snapshot is available yet.</p>
              <p className="muted text-xs">Next step: refresh contract data and request a fresh payload.</p>
              <Button onClick={() => void load()}>Refresh contract</Button>
            </div>
          )}
        </Card>
      )}

      {/* Tab: Replay */}
      {activeTab === "replay" && (
        <Card>
          <CardBody className="stack-gap-4">
            <div>
              <h3 className="card-title-reset text-base mb-2">Replay compare</h3>
              <p className="muted text-sm">Choose a baseline run to compare evidence-chain differences.</p>
            </div>
            <div className="row-start-gap-2">
              <Select className="flex-1 input-max-400" value={baselineRunId} onChange={(e) => setBaselineRunId(e.target.value)}>
                <option value="">Select a baseline run...</option>
                {availableRuns.filter(r => r.run_id !== runId).map(r => (
                  <option key={r.run_id} value={r.run_id}>{r.run_id.slice(0, 12)} - {r.task_id} ({statusLabel(r.status)})</option>
                ))}
              </Select>
              <Button variant="primary" disabled={actionBusy} onClick={() => handleAction("replay")}>
                Run replay
              </Button>
            </div>
            {replayResult && (
              <details className="collapsible" open>
                <summary>Replay result</summary>
                <div className="collapsible-body"><pre>{JSON.stringify(replayResult, null, 2)}</pre></div>
              </details>
            )}
            {Object.keys(compareSummary).length > 0 && (
              <div className="grid-2">
                <Card>
                  <CardHeader><CardTitle>Compare decision</CardTitle></CardHeader>
                  <CardBody>
                    <div className="stack-gap-2">
                      <p className="muted">
                        {compareSummaryDeltaCount === 0
                          ? "The current run looks aligned with the selected baseline."
                          : "Compare found at least one delta, so this run still needs operator review."}
                      </p>
                      <p className="muted text-sm">Next step: review compare, proof, and incident context before deciding to replay, approve, or keep the run blocked.</p>
                    </div>
                  </CardBody>
                </Card>
                <Card>
                  <CardHeader><CardTitle>Action context</CardTitle></CardHeader>
                  <CardBody>
                    {incidentPack?.summary ? <p className="muted">Incident: {String(incidentPack.summary)}</p> : null}
                    {proofPack?.summary ? <p className="muted">Proof: {String(proofPack.summary)}</p> : null}
                    {!incidentPack?.summary && !proofPack?.summary ? (
                      <p className="muted">No proof or incident pack is attached yet. Continue from the reports below.</p>
                    ) : null}
                  </CardBody>
                </Card>
              </div>
            )}
            {Object.keys(compareSummary).length > 0 && (
              <details className="collapsible" open>
                <summary>Compare summary</summary>
                <div className="collapsible-body"><pre>{JSON.stringify(compareSummary, null, 2)}</pre></div>
              </details>
            )}
            {Object.keys(compareSummary).length > 0 && (
              <Button variant="secondary" onClick={onOpenCompare}>Open compare surface</Button>
            )}
            {proofPack && (
              <details className="collapsible" open>
                <summary>Proof pack</summary>
                <div className="collapsible-body"><pre>{JSON.stringify(proofPack, null, 2)}</pre></div>
              </details>
            )}
            {/* Key reports for quick reference */}
            {(testReport || reviewReport || evidenceReport || workReport || taskResult) && (
              <div>
                <h4 className="card-title-reset text-sm muted mb-2">Related reports</h4>
                <div className="stack-gap-2">
                  {testReport && <details className="collapsible"><summary>test_report.json</summary><div className="collapsible-body"><pre>{JSON.stringify(testReport, null, 2)}</pre></div></details>}
                  {reviewReport && <details className="collapsible"><summary>review_report.json</summary><div className="collapsible-body"><pre>{JSON.stringify(reviewReport, null, 2)}</pre></div></details>}
                  {evidenceReport && <details className="collapsible"><summary>evidence_report.json</summary><div className="collapsible-body"><pre>{JSON.stringify(evidenceReport, null, 2)}</pre></div></details>}
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
