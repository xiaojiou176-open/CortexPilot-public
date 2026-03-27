import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { RunSummary, EventRecord } from "../lib/types";
import type { CommandTowerOverviewPayload } from "../lib/types";
import { fetchRuns, fetchAllEvents, fetchCommandTowerOverview } from "../lib/api";
import { statusLabelZh, badgeClass, statusDotClass } from "../lib/statusPresentation";
import type { DesktopPageKey } from "../App";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";

/* ── SVG Icons (matching Dashboard) ── */
const IconChat = () => (
  <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3h10a1 1 0 011 1v6a1 1 0 01-1 1H6l-3 3V4a1 1 0 011-1z" />
  </svg>
);
const IconTower = () => (
  <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 2v12M4 6h8M5 2h6M3 14h10" />
  </svg>
);
const IconRuns = () => (
  <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="4" cy="4" r="2" /><circle cx="12" cy="8" r="2" /><circle cx="4" cy="12" r="2" />
    <path d="M6 4h4l2 4M6 12h4l2-4" />
  </svg>
);
const IconBolt = () => (
  <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 1L3 9h5l-1 6 6-8H8l1-6z" />
  </svg>
);

function statusLabel(status: string | undefined): string {
  const normalized = (status || "").trim().toLowerCase();
  const labels: Record<string, string> = {
    active: "Active",
    archived: "Archived",
    blocked: "Blocked",
    done: "Done",
    error: "Error",
    failed: "Failed",
    paused: "Paused",
    rejected: "Rejected",
    running: "Running",
    success: "Success",
  };
  return labels[normalized] || statusLabelZh(status || "");
}

function formatDateTime(value: string | undefined): string {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-US");
}

type OverviewPageProps = {
  onNavigate: (page: DesktopPageKey) => void;
  onNavigateToRun: (runId: string) => void;
};

export function OverviewPage({ onNavigate, onNavigateToRun }: OverviewPageProps) {
  const [overview, setOverview] = useState<CommandTowerOverviewPayload | null>(null);
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [o, r, e] = await Promise.all([
        fetchCommandTowerOverview().catch(() => null),
        fetchRuns().catch(() => []),
        fetchAllEvents().catch(() => []),
      ]);
      setOverview(o);
      setRuns(Array.isArray(r) ? r.slice(0, 10) : []);
      setEvents(Array.isArray(e) ? e.slice(0, 15) : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const metrics = [
    { label: "Total sessions", value: overview?.total_sessions ?? "-", variant: "" },
    { label: "Active now", value: overview?.active_sessions ?? "-", variant: "metric-value--primary" },
    { label: "Failure ratio", value: overview?.failed_ratio != null ? `${(overview.failed_ratio * 100).toFixed(1)}%` : "-", variant: overview && overview.failed_ratio > 0.1 ? "metric-value--danger" : "metric-value--success" },
    { label: "Blocked queue", value: overview?.blocked_sessions ?? "-", variant: overview && (overview.blocked_sessions ?? 0) > 0 ? "metric-value--danger" : "" },
  ];

  const quickActions: { label: string; desc: string; page: DesktopPageKey; icon: ReactNode }[] = [
    { label: "Step 1 · Brief PM", desc: "Start at the PM entrypoint, state the goal and acceptance criteria, and let the system open the session.", page: "pm", icon: <IconChat /> },
    { label: "Step 2 · Watch progress", desc: "Use Command Tower to monitor session state, alerts, and pipeline health.", page: "command-tower", icon: <IconTower /> },
    { label: "Step 3 · Verify outcomes", desc: "Open runs to inspect status, evidence chain, and replay results.", page: "runs", icon: <IconRuns /> },
  ];

  const runningRuns = runs.filter((run) => (run.status || "").toLowerCase() === "running");
  const failedRuns = runs.filter((run) => {
    const s = (run.status || "").toLowerCase();
    return s === "failed" || s === "error" || s === "rejected";
  });
  const blockedEvents = events.filter((evt) => {
    const eventToken = (evt.event || evt.event_type || "").toUpperCase();
    const levelToken = (evt.level || "").toUpperCase();
    return (
      levelToken === "ERROR" ||
      levelToken === "WARN" ||
      eventToken.includes("FAIL") ||
      eventToken.includes("ERROR") ||
      eventToken.includes("BLOCK") ||
      eventToken.includes("DENY")
    );
  });

  const progressCards = [
    {
      title: "Running now",
      value: runningRuns.length,
      hint: runningRuns.length > 0 ? 'Open "Runs" to follow the active work.' : 'No tasks are running right now. Start a new one from the PM entrypoint.',
      variant: "metric-value--primary",
    },
    {
      title: "Needs attention",
      value: failedRuns.length,
      hint: failedRuns.length > 0 ? "Prioritize the affected Run detail and decide whether to rollback, reject, or replay." : "No failed tasks are currently visible.",
      variant: failedRuns.length > 0 ? "metric-value--danger" : "metric-value--success",
    },
    {
      title: "Risk events",
      value: blockedEvents.length,
      hint: blockedEvents.length > 0 ? "Inspect the event stream to locate the blocking root cause." : "Recent events do not show warning signals.",
      variant: blockedEvents.length > 0 ? "metric-value--danger" : "metric-value--success",
    },
  ];

  const recentExceptions = [
    ...failedRuns.map((run) => ({
      key: `run-${run.run_id}`,
      time: formatDateTime(run.created_at),
      title: `Task ${run.task_id} requires attention`,
      detail: `Run ${run.run_id.slice(0, 12)} · ${statusLabel(run.status)}`,
      runId: run.run_id,
    })),
    ...blockedEvents.slice(0, 6).map((evt, index) => ({
      key: `evt-${evt.ts || index}`,
      time: formatDateTime(evt.ts),
      title: `${evt.event || evt.event_type || "Operator event"}`,
      detail: `Level ${evt.level || "-"} · Run ${(evt.run_id || evt._run_id || "-").toString().slice(0, 12)}`,
      runId: (evt.run_id || evt._run_id || "").toString(),
    })),
  ].slice(0, 8);

  return (
    <section className="content" aria-labelledby="overview-title">
      {/* Header */}
      <header className="section-header">
        <div>
          <h1 id="overview-title" className="page-title">Operator overview</h1>
          <p className="page-subtitle">For a first pass, follow the primary path: submit one request, complete the run, then verify the outcome. Only open approvals when the flow asks for one.</p>
        </div>
        <Button onClick={load} aria-label="Refresh data">Refresh</Button>
      </header>

      {/* Metrics */}
      <section className="app-section" aria-label="Overview metrics">
        {loading ? (
          <div className="stats-grid">
            <div className="skeleton skeleton-card" />
            <div className="skeleton skeleton-card" />
            <div className="skeleton skeleton-card" />
            <div className="skeleton skeleton-card" />
          </div>
        ) : (
          <div className="stats-grid">
            {metrics.map((m) => (
              <article key={m.label} className="metric-card">
                <p className="metric-label">{m.label}</p>
                <p className={`metric-value ${m.variant}`}>{m.value}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Main actions */}
      <section className="app-section" aria-label="Primary actions">
        <h2 className="section-title">Primary actions</h2>
        <div className="quick-grid">
          {quickActions.map((a) => (
            <Button
              key={a.page}
              unstyled
              className="quick-card"
              onClick={() => onNavigate(a.page)}
            >
              <div className="quick-card-icon">{a.icon}</div>
              <span className="quick-card-title">{a.label}</span>
              <span className="quick-card-desc">{a.desc}</span>
            </Button>
          ))}
        </div>
        <div className="quick-grid" aria-label="Optional approval step">
          <Button
            unstyled
            className="quick-card"
            onClick={() => onNavigate("god-mode")}
          >
            <div className="quick-card-icon"><IconBolt /></div>
            <span className="quick-card-desc">Optional step</span>
            <span className="quick-card-title">Approval checkpoint</span>
            <span className="quick-card-desc">Use the approval workspace only when the flow pauses for human confirmation.</span>
          </Button>
        </div>
      </section>

      {/* Current progress */}
      <section className="app-section" aria-labelledby="progress-title">
        <h2 id="progress-title" className="section-title">Current progress</h2>
        <div className="stats-grid">
          {progressCards.map((card) => (
            <article key={card.title} className="metric-card">
              <p className="metric-label">{card.title}</p>
              <p className={`metric-value ${card.variant}`}>{card.value}</p>
              <p className="muted text-xs">{card.hint}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Recent Runs */}
      <section className="app-section" aria-labelledby="recent-runs-title">
        <div className="section-header">
          <div>
            <h2 id="recent-runs-title" className="section-title">Recent runs</h2>
            <p className="overview-runs-hint">
              {"Open Run detail from here to review evidence and resolve outcomes."}
            </p>
            <p className="muted text-xs">No runs yet. Start your first request from the PM entrypoint.</p>
          </div>
          <Button onClick={() => onNavigate("runs")}>View all runs</Button>
        </div>
        {runs.length === 0 ? (
          <div className="empty-state-stack"><p className="muted">No runs yet. Start your first request from the PM entrypoint.</p></div>
        ) : (
          <Card className="table-card">
            <table className="run-table">
              <thead>
                <tr><th>Run ID</th><th>Task ID</th><th>Status</th><th>Created at</th></tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.run_id} className={run.status === "failed" ? "session-row--failed" : run.status === "running" ? "session-row--running" : ""}>
                    <td>
                      <Button
                        type="button"
                        unstyled
                        className="run-link run-link-reset"
                        onClick={() => onNavigateToRun(run.run_id)}
                      >
                        {run.run_id.slice(0, 12)}
                      </Button>
                    </td>
                    <td className="cell-primary">{run.task_id}</td>
                    <td>
                      <span className="status-inline">
                        <span className={statusDotClass(run.status)} />
                        <Badge className={badgeClass(run.status)}>{statusLabel(run.status)}</Badge>
                      </span>
                    </td>
                    <td className="muted">{formatDateTime(run.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </section>

      {/* Recent Events */}
      <section className="app-section" aria-labelledby="recent-events-title">
        <div className="section-header">
          <h2 id="recent-events-title" className="section-title">Recent exceptions</h2>
          <Button variant="ghost" onClick={() => onNavigate("events")}>View all exceptions</Button>
        </div>
        {recentExceptions.length === 0 ? (
          <div className="empty-state-stack"><p className="muted">No exception signals yet. Failed runs and risk events will appear here after tasks start running.</p></div>
        ) : (
          <Card className="table-card">
            <table className="run-table">
              <thead>
                <tr><th>Time</th><th>Exception</th><th>Details</th><th>Action</th></tr>
              </thead>
              <tbody>
                {recentExceptions.map((entry) => (
                  <tr key={entry.key}>
                    <td className="muted">{entry.time}</td>
                    <td className="cell-primary">{entry.title}</td>
                    <td className="muted">{entry.detail}</td>
                    <td>
                      {entry.runId ? (
                        <Button variant="ghost" onClick={() => onNavigateToRun(entry.runId)}>
                          View Run
                        </Button>
                      ) : (
                        <span className="muted">Open event stream</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </section>
    </section>
  );
}
