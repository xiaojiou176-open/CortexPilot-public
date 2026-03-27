import type { ComponentType, KeyboardEvent as ReactKeyboardEvent, RefObject } from "react";

import type { CommandTowerAlert, CommandTowerOverviewPayload, PmSessionStatus, PmSessionSummary } from "../../lib/types";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import Link from "next/link";
import type { StatusVariant } from "@cortexpilot/frontend-shared/statusPresentation";

type SortMode = "updated_desc" | "created_desc" | "failed_desc" | "blocked_desc";
type FocusMode = "all" | "high_risk" | "blocked" | "running";

type LayoutProps = {
  drawerCollapsed: boolean;
  liveMode: "running" | "backoff" | "paused";
  alertsStatus: string;
  refreshHealthSummary: { label: string; badgeVariant: StatusVariant };
  snapshotStatus: { enabled: boolean; label: string };
  toggleDrawerCollapsed: () => void;
  liveStatusText: string;
  intervalMs: number;
  actionFeedback: string;
  priorityLanes: Array<{ lane: string; title: string; summary: string; badgeVariant: StatusVariant; badgeText: string }>;
  showGlobalEmptyState: boolean;
  showFilterEmptyState: boolean;
  showFocusEmptyState: boolean;
  resetFilters: () => void;
  setFocusMode: (value: FocusMode) => void;
  toggleHighRiskFocus: () => void;
  errorMessage: string;
  errorMetaLabel: string;
  visibleSessionCount: number;
  totalSessionCount: number;
  visibleSummary: { total: number; failed: number; blocked: number; running: number };
  focusLabel: string;
  visibleSessions: PmSessionSummary[];
  SessionBoardComponent: ComponentType<{
    sessions: PmSessionSummary[];
    snapshotStatus?: { enabled: boolean; label: string };
  }>;
  DrawerComponent: ComponentType<any>;
  drawerLiveBadgeVariant: StatusVariant;
  homeLiveBadgeText: (mode: "running" | "backoff" | "paused") => string;
  homeLiveBadgeVariant: (mode: "running" | "backoff" | "paused") => StatusVariant;
  alertsBadgeVariant: (status: string) => StatusVariant;
  quickActionItems: Array<{
    id: string;
    shortcut: string;
    description: string;
    actionLabel: string;
    onAction: () => void;
    disabled?: boolean;
  }>;
  contextHealthItems: Array<{ id: string; label: string; value: string; badgeVariant: StatusVariant; badgeLabel: string }>;
  sectionStatusItems: Array<{ id: string; text: string; badgeVariant: StatusVariant }>;
  drawerPromptItems: string[];
  overview: CommandTowerOverviewPayload;
  alerts: CommandTowerAlert[];
  criticalAlerts: number;
  draftChanged: boolean;
  draftStatuses: PmSessionStatus[];
  draftProjectKey: string;
  draftSort: SortMode;
  statusOptions: PmSessionStatus[];
  sortOptions: Array<{ value: SortMode; label: string }>;
  focusOptionsForDrawer: Array<{ value: FocusMode; label: string; count: number }>;
  focusMode: FocusMode;
  appliedFilterCount: number;
  projectInputRef: RefObject<HTMLInputElement | null>;
  toggleDraftStatus: (status: PmSessionStatus) => void;
  setDraftProjectKey: (value: string) => void;
  setDraftSort: (value: SortMode) => void;
  handleFilterKeyDown: (event: ReactKeyboardEvent<HTMLInputElement>) => void;
  applyFilters: () => void;
  onRunQuickAction?: (id: "refresh" | "live" | "export" | "copy" | "focus-filter" | "apply-filter" | "toggle-drawer" | "toggle-pin") => void;
};

export default function CommandTowerHomeLayout(props: LayoutProps) {
  const hasRefreshIssue =
    props.refreshHealthSummary.badgeVariant === "failed" ||
    props.refreshHealthSummary.badgeVariant === "warning";
  const liveSignalVariant = hasRefreshIssue
    ? props.refreshHealthSummary.badgeVariant
    : props.homeLiveBadgeVariant(props.liveMode);
  const liveSignalText = hasRefreshIssue
    ? props.refreshHealthSummary.badgeVariant === "failed"
      ? "Refresh failed"
      : "Degraded mode"
    : props.homeLiveBadgeText(props.liveMode);
  const sloBadgeVariant = hasRefreshIssue ? props.refreshHealthSummary.badgeVariant : props.alertsBadgeVariant(props.alertsStatus);
  const sloBadgeText = hasRefreshIssue
    ? props.refreshHealthSummary.badgeVariant === "failed"
      ? "SLO: degraded"
      : "SLO: warning"
    : `SLO: ${props.alertsStatus}`;
  const showFailureEventsAction = props.visibleSummary.failed > 0 || props.visibleSummary.blocked > 0;
  const primarySession = props.visibleSessions[0];
  const primaryActionHref = primarySession
    ? `/command-tower/sessions/${encodeURIComponent(primarySession.pm_session_id)}`
    : "/pm";
  const primaryActionLabel = primarySession ? "Open first high-risk session" : "Go to PM and start a request";

  return (
    <div
      className={`ct-home-layout ${
        props.drawerCollapsed ? "ct-home-layout--drawer-collapsed" : "ct-home-layout--drawer-expanded"
      }`}
    >
      <div className="ct-main-workspace">
        <section
          className="app-section"
          aria-label="Command Tower workspace overview"
          aria-labelledby="ct-home-overview-title"
          aria-describedby="ct-home-overview-desc"
        >
          <div className="section-header">
            <div>
              <h2 id="ct-home-overview-title" className="ct-home-overview-title">Live posture and action entrypoints</h2>
              <p id="ct-home-overview-desc">The first screen keeps risk signals and primary actions visible. Detailed filters live in the right drawer.</p>
            </div>
            <div className="ct-home-header-badges">
              <Badge variant={liveSignalVariant}>
                {liveSignalText}
              </Badge>
              <Badge variant={sloBadgeVariant}>
                {sloBadgeText}
              </Badge>
            </div>
          </div>

          <div className="ct-home-action-bar">
            <Button
              type="button"
              variant={props.focusMode === "high_risk" ? "secondary" : "default"}
              onClick={props.toggleHighRiskFocus}
              aria-controls="command-tower-session-board-region"
              aria-pressed={props.focusMode === "high_risk"}
              aria-label={
                props.focusMode === "high_risk"
                  ? "High-risk sessions are focused. Click again to restore all sessions."
                  : "Focus high-risk sessions"
              }
              title={
                props.focusMode === "high_risk"
                  ? "Only high-risk sessions are visible. Click again to restore all."
                  : "Show only high-risk sessions. Click again to restore all."
              }
            >
              {props.focusMode === "high_risk" ? "High-risk focused (click to show all)" : "Focus high-risk sessions"}
            </Button>
            {props.focusMode === "high_risk" ? (
              <span className="mono muted" role="status" aria-live="polite">
                Only high-risk sessions are visible. Click the focus button again to restore the full list.
              </span>
            ) : null}
            {!hasRefreshIssue && !props.snapshotStatus.enabled ? (
              <Button asChild variant="secondary">
                <Link href={primaryActionHref}>{primaryActionLabel}</Link>
              </Button>
            ) : null}
            {!hasRefreshIssue && !props.snapshotStatus.enabled && showFailureEventsAction ? (
              <Button asChild variant="ghost">
                <Link href="/events">Failure events</Link>
              </Button>
            ) : null}
            <span className="mono muted" role="note">
              The filter console lives in the right context drawer (Alt+Shift+D)
            </span>
          </div>
          {props.snapshotStatus.enabled || hasRefreshIssue ? (
            <Card variant="compact" className="ct-home-error-alert" role="status" aria-live="polite">
              <p className="ct-home-empty-text">
                {hasRefreshIssue
                  ? props.refreshHealthSummary.badgeVariant === "failed"
                    ? "Refresh failed: the list has switched to a cached snapshot. Review failure events before reloading."
                    : "Refresh is partially degraded: the list is running from a cached snapshot. Review failure events before proceeding."
                  : `${props.snapshotStatus.label}. Timestamps only show when the snapshot was generated, not the live state.`}
              </p>
              <div className="toolbar toolbar--mt" role="group" aria-label="Degraded-state actions">
                {showFailureEventsAction ? (
                  <Button asChild variant="ghost">
                    <Link href="/events">Review failure events</Link>
                  </Button>
                ) : (
                  <Button asChild variant="ghost">
                    <Link href="/runs">Review runs</Link>
                  </Button>
              )}
                <Button asChild variant="secondary">
                  <Link href="/command-tower">Reload</Link>
                </Button>
              </div>
            </Card>
          ) : null}
          {props.totalSessionCount > 0 ? (
            <p className="mono muted" role="status" aria-live="polite">
              Risk sample: {props.visibleSummary.total} sessions (high risk {props.visibleSummary.failed}, blocked {props.visibleSummary.blocked}, running {props.visibleSummary.running}).
            </p>
          ) : null}

          <p className="sr-only" role="status" aria-live="polite">
            {hasRefreshIssue ? `Refresh state ${props.refreshHealthSummary.label}` : props.liveStatusText}. Refresh interval {props.intervalMs} ms. Current SLO state {props.alertsStatus}. Detailed filters are in the right drawer.
          </p>
          {props.actionFeedback && (
            <div role="status" aria-live="polite" className="ct-home-action-feedback">
              {props.actionFeedback}
            </div>
          )}

          <section className="ct-priority-lanes" aria-label="Command Tower priority lanes">
            {props.priorityLanes.map((lane) => (
              <article key={lane.lane} className={`ct-priority-lane is-${lane.lane}`}>
                <header>
                  <h3>{lane.title}</h3>
                  <Badge variant={lane.badgeVariant}>
                    {lane.badgeText}
                  </Badge>
                </header>
                <p>{lane.summary}</p>
                <div className="toolbar toolbar--mt" role="group" aria-label={`${lane.title} quick actions`}>
                  {lane.lane === "live" ? (
                    <Button type="button" variant="ghost" onClick={() => props.onRunQuickAction?.("live")}>
                      {props.liveMode === "paused" ? "Switch to live refresh" : "Switch to paused analysis"}
                    </Button>
                  ) : null}
                  {lane.lane === "risk" ? (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={props.toggleHighRiskFocus}
                      aria-controls="command-tower-session-board-region"
                      aria-pressed={props.focusMode === "high_risk"}
                    >
                      {props.focusMode === "high_risk" ? "Restore full view" : "Switch to high-risk view"}
                    </Button>
                  ) : null}
                  {lane.lane === "actions" ? (
                    <Button asChild variant="ghost">
                      <Link href={primaryActionHref}>Open first risk session</Link>
                    </Button>
                  ) : null}
                </div>
              </article>
            ))}
            <p className="mono muted" role="note">
              Each lane card exposes quick actions so you can jump straight into live control, risk focus, or the next operator step.
            </p>
          </section>

          {props.showGlobalEmptyState && (
            <div className="compact-status-card">
              <p className="ct-home-empty-text">No session data yet. Start a request from PM first.</p>
            </div>
          )}
          {props.showFilterEmptyState && (
            <div className="compact-status-card">
              <p className="ct-home-empty-text">No sessions match the current filters.</p>
              <Button type="button" variant="secondary" onClick={props.resetFilters}>Reset filters</Button>
            </div>
          )}
          {props.showFocusEmptyState && (
            <div className="compact-status-card">
              <p className="ct-home-empty-text">No sessions match the current focus view.</p>
              <Button type="button" variant="secondary" onClick={() => props.setFocusMode("all")}>Show all</Button>
            </div>
          )}
          {props.errorMessage && props.totalSessionCount === 0 && (
            <Card variant="compact" className="ct-home-error-alert" role="status" aria-live="polite">
              <p className="ct-home-empty-text">Live data is unavailable right now. Start a new session or retry refresh later.</p>
              <div className="toolbar toolbar--mt" role="group" aria-label="Degraded-state primary actions">
                <Button asChild variant="secondary">
                  <Link href="/pm">Go to PM and start a request</Link>
                </Button>
                <Button asChild variant="ghost">
                  <Link href="/runs">Review runs</Link>
                </Button>
              </div>
            </Card>
          )}
        </section>
        <section className="app-section" aria-label="Command Tower session board" aria-labelledby="ct-home-session-board-title">
          <div className="section-header">
            <div>
              <h3 id="ct-home-session-board-title" className="ct-home-session-board-title">Risk sample sessions</h3>
              <p className="ct-home-session-board-meta">This list stays in sync with the quick actions above and currently shows {props.visibleSessionCount} / {props.totalSessionCount} sessions with risk-first ordering.</p>
            </div>
            <Badge>{props.focusLabel}</Badge>
            {props.snapshotStatus.enabled ? <Badge variant="warning">Cached snapshot</Badge> : null}
          </div>
          <div id="command-tower-session-board-region" role="region" aria-label="Session board list">
            <props.SessionBoardComponent sessions={props.visibleSessions} snapshotStatus={props.snapshotStatus} />
          </div>
        </section>
      </div>

      {!props.drawerCollapsed && (
        <props.DrawerComponent
          liveBadgeVariant={props.drawerLiveBadgeVariant}
          liveBadgeText={props.homeLiveBadgeText(props.liveMode)}
          alertsBadgeVariant={props.alertsBadgeVariant(props.alertsStatus)}
          alertsStatus={props.alertsStatus}
          refreshBadgeVariant={props.refreshHealthSummary.badgeVariant}
          refreshLabel={props.refreshHealthSummary.label}
          quickActionItems={props.quickActionItems}
          contextHealthItems={props.contextHealthItems}
          sectionStatusItems={props.sectionStatusItems}
          drawerPromptItems={props.drawerPromptItems}
          topBlockers={props.overview.top_blockers || []}
          alerts={props.alerts}
          criticalAlerts={props.criticalAlerts}
          draftChanged={props.draftChanged}
          draftStatuses={props.draftStatuses}
          draftProjectKey={props.draftProjectKey}
          draftSort={props.draftSort}
          statusOptions={props.statusOptions}
          sortOptions={props.sortOptions}
          focusOptions={props.focusOptionsForDrawer}
          focusMode={props.focusMode}
          appliedFilterCount={props.appliedFilterCount}
          projectInputRef={props.projectInputRef}
          onToggleDraftStatus={props.toggleDraftStatus}
          onDraftProjectKeyChange={props.setDraftProjectKey}
          onDraftSortChange={(value: string) => props.setDraftSort(value as SortMode)}
          onFilterKeyDown={props.handleFilterKeyDown}
          onApplyFilters={props.applyFilters}
          onResetFilters={props.resetFilters}
          onFocusModeChange={(value: string) => props.setFocusMode(value as FocusMode)}
          onClose={props.toggleDrawerCollapsed}
        />
      )}
    </div>
  );
}
