import type { CommandTowerPriorityLane } from "../../lib/frontendApiContract";
import type { CommandTowerAlertsPayload } from "../../lib/types";
import type { StatusVariant } from "@cortexpilot/frontend-shared/statusPresentation";

export type SortMode = "updated_desc" | "created_desc" | "failed_desc" | "blocked_desc";
export type FocusMode = "all" | "high_risk" | "blocked" | "running";
export type LiveMode = "running" | "backoff" | "paused";
export type SectionFetchStatus = "ok" | "error";
export type QuickActionId =
  | "refresh"
  | "live"
  | "export"
  | "copy"
  | "focus-filter"
  | "apply-filter"
  | "toggle-drawer"
  | "toggle-pin";

type SessionSummaryStats = {
  total: number;
  failed: number;
  blocked: number;
  running: number;
};

type SeveritySummary = {
  critical: number;
};

type SectionStatus = {
  overview: SectionFetchStatus;
  sessions: SectionFetchStatus;
  alerts: SectionFetchStatus;
};

type BuildArgs = {
  isRefreshing: boolean;
  liveEnabled: boolean;
  drawerCollapsed: boolean;
  drawerPinned: boolean;
  alertsStatus: CommandTowerAlertsPayload["status"];
  liveMode: LiveMode;
  intervalMs: number;
  focusLabel: string;
  visibleSessionCount: number;
  hasAppliedFilters: boolean;
  appliedFilterCount: number;
  sectionStatus: SectionStatus;
  filteredSessionsSummary: SessionSummaryStats;
  alertsSeveritySummary: SeveritySummary;
  draftChanged: boolean;
  draftFilterCount: number;
  errorMessage: string;
  errorMetaLabel: string;
  liveStatusText: string;
  refreshFreshnessSummary: string;
  showFilterEmptyState: boolean;
  showFocusEmptyState: boolean;
  showGlobalEmptyState: boolean;
  onRunQuickAction: (id: QuickActionId) => void;
  sectionStatusLabel: (status: SectionFetchStatus) => string;
  sectionStatusBadgeVariant: (status: SectionFetchStatus) => StatusVariant;
  homeLiveBadgeText: (mode: LiveMode) => string;
  homeLiveBadgeVariant: (mode: LiveMode) => StatusVariant;
  alertsBadgeVariant: (status: CommandTowerAlertsPayload["status"]) => StatusVariant;
};

export function buildHomeViewModel(args: BuildArgs): {
  quickActionItems: Array<{
    id: QuickActionId;
    shortcut: string;
    description: string;
    actionLabel: string;
    onAction: () => void;
    disabled?: boolean;
  }>;
  drawerLiveBadgeVariant: StatusVariant;
  contextHealthItems: Array<{
    id: string;
    label: string;
    value: string;
    badgeVariant: StatusVariant;
    badgeLabel: string;
  }>;
  sectionStatusItems: Array<{ id: string; text: string; badgeVariant: StatusVariant }>;
  drawerPromptItems: string[];
  priorityLanes: Array<{
    lane: CommandTowerPriorityLane;
    title: string;
    summary: string;
    badgeVariant: StatusVariant;
    badgeText: string;
  }>;
  focusOptionsForDrawer: Array<{ value: FocusMode; label: string; count: number }>;
  homeStateSignalLabel: string;
  homeStateSignalDetail: string;
} {
  const quickActionItems: Array<{
    id: QuickActionId;
    shortcut: string;
    description: string;
    actionLabel: string;
    onAction: () => void;
    disabled?: boolean;
  }> = [
    {
      id: "refresh",
      shortcut: "Alt+Shift+R",
      description: "Pull overview, sessions, and alerts immediately.",
      actionLabel: args.isRefreshing ? "Refreshing..." : "Refresh now",
      onAction: () => args.onRunQuickAction("refresh"),
      disabled: args.isRefreshing,
    },
    {
      id: "live",
      shortcut: "Alt+Shift+L",
      description: "Control the live refresh cadence so you can pause on the current snapshot.",
      actionLabel: args.liveEnabled ? "Pause live" : "Resume live",
      onAction: () => args.onRunQuickAction("live"),
    },
    {
      id: "export",
      shortcut: "Alt+Shift+E",
      description: "Export failed sessions as JSON for triage or review.",
      actionLabel: "Export failed",
      onAction: () => args.onRunQuickAction("export"),
    },
    {
      id: "copy",
      shortcut: "Alt+Shift+C",
      description: "Share the current filters, focus mode, and live state with collaborators.",
      actionLabel: "Copy",
      onAction: () => args.onRunQuickAction("copy"),
    },
    {
      id: "focus-filter",
      shortcut: "Alt+Shift+F",
      description: "Jump to the project key input to tighten the filter flow.",
      actionLabel: "Focus",
      onAction: () => args.onRunQuickAction("focus-filter"),
    },
    {
      id: "toggle-drawer",
      shortcut: "Alt+Shift+D",
      description: "Change the right drawer density to favor the workspace or the context tools.",
      actionLabel: args.drawerCollapsed ? "Expand" : "Collapse",
      onAction: () => args.onRunQuickAction("toggle-drawer"),
    },
    {
      id: "toggle-pin",
      shortcut: "Alt+Shift+P",
      description: "Toggle whether the drawer stays pinned or scrolls with the page.",
      actionLabel: args.drawerPinned ? "Unpin" : "Pin",
      onAction: () => args.onRunQuickAction("toggle-pin"),
    },
    {
      id: "apply-filter",
      shortcut: "Enter (while a filter input is focused)",
      description: "Promote the draft state into the applied filters and trigger a refresh.",
      actionLabel: "Apply",
      onAction: () => args.onRunQuickAction("apply-filter"),
    },
  ];

  const drawerLiveBadgeVariant =
    args.liveMode === "backoff"
      ? "failed"
      : args.liveEnabled
        ? "running"
        : "warning";

  const contextHealthItems: Array<{
    id: string;
    label: string;
    value: string;
    badgeVariant: StatusVariant;
    badgeLabel: string;
  }> = [
    {
      id: "engine",
      label: "Live engine",
      value: args.liveEnabled ? `Running (${args.intervalMs}ms)` : "Paused",
      badgeVariant: drawerLiveBadgeVariant,
      badgeLabel: args.liveEnabled ? "RUNNING" : "PAUSED",
    },
    {
      id: "slo",
      label: "SLO health",
      value: args.alertsStatus,
      badgeVariant: args.alertsBadgeVariant(args.alertsStatus),
      badgeLabel: args.alertsStatus.toUpperCase(),
    },
    {
      id: "focus",
      label: "Focus hit",
      value: `${args.focusLabel} (${args.visibleSessionCount}/${args.filteredSessionsSummary.total})`,
      badgeVariant: "success",
      badgeLabel: "FOCUS",
    },
    {
      id: "filter",
      label: "Filter state",
      value: args.hasAppliedFilters ? `${args.appliedFilterCount} filters applied` : "Filters off",
      badgeVariant: args.hasAppliedFilters ? "running" : "warning",
      badgeLabel: args.hasAppliedFilters ? "FILTERED" : "ALL",
    },
  ];

  const sectionStatusItems: Array<{ id: string; text: string; badgeVariant: StatusVariant }> = [
    {
      id: "overview",
      text: `Overview ${args.sectionStatusLabel(args.sectionStatus.overview)}`,
      badgeVariant: args.sectionStatusBadgeVariant(args.sectionStatus.overview),
    },
    {
      id: "sessions",
      text: `Sessions ${args.sectionStatusLabel(args.sectionStatus.sessions)}`,
      badgeVariant: args.sectionStatusBadgeVariant(args.sectionStatus.sessions),
    },
    {
      id: "alerts",
      text: `Alerts ${args.sectionStatusLabel(args.sectionStatus.alerts)}`,
      badgeVariant: args.sectionStatusBadgeVariant(args.sectionStatus.alerts),
    },
  ];

  const drawerPromptItems: string[] = [];
  if (args.alertsSeveritySummary.critical > 0) {
    drawerPromptItems.push(`Detected ${args.alertsSeveritySummary.critical} critical alerts. Triage them first and verify the suggested actions.`);
  }
  if (args.errorMessage) {
    drawerPromptItems.push(`Current issue: ${args.errorMetaLabel}. Run Refresh now first to confirm whether it persists.`);
  }
  if (args.draftChanged) {
    drawerPromptItems.push(`Detected ${args.draftFilterCount} unapplied draft filters. Apply them before judging the risk trend.`);
  }
  if (args.filteredSessionsSummary.failed > 0 || args.filteredSessionsSummary.blocked > 0) {
    drawerPromptItems.push(
      `High-risk sessions ${args.filteredSessionsSummary.failed}, blocked sessions ${args.filteredSessionsSummary.blocked}. Use the focus switcher to narrow quickly.`,
    );
  }
  if (!args.liveEnabled) {
    drawerPromptItems.push("Live refresh is paused. Resume live monitoring after the current analysis.");
  }
  if (drawerPromptItems.length === 0) {
    drawerPromptItems.push("The current posture is stable. Run a routine refresh, then spot-check session details for hidden blockers.");
  }

  const priorityLanes: Array<{
    lane: CommandTowerPriorityLane;
    title: string;
    summary: string;
    badgeVariant: StatusVariant;
    badgeText: string;
  }> = [
    {
      lane: "live" as const,
      title: "Live Lane",
      summary: `${args.homeLiveBadgeText(args.liveMode)} · interval ${args.intervalMs}ms`,
      badgeVariant: args.homeLiveBadgeVariant(args.liveMode),
      badgeText: args.liveEnabled ? "Live" : "Paused",
    },
    {
      lane: "risk" as const,
      title: "Risk Lane",
      summary: `Failed ${args.filteredSessionsSummary.failed} · Blocked ${args.filteredSessionsSummary.blocked} · critical ${args.alertsSeveritySummary.critical}`,
      badgeVariant: args.alertsBadgeVariant(args.alertsStatus),
      badgeText: args.alertsStatus,
    },
    {
      lane: "actions" as const,
      title: "Action Lane",
      summary: args.draftChanged
        ? `${args.draftFilterCount} draft filters waiting`
        : args.errorMessage || args.alertsStatus !== "healthy"
          ? "Refresh first and focus high-risk sessions"
          : "Primary actions are ready",
      badgeVariant: args.draftChanged
        ? "warning"
        : args.errorMessage || args.alertsStatus !== "healthy"
          ? "warning"
          : "success",
      badgeText: args.draftChanged ? "Pending" : args.errorMessage || args.alertsStatus !== "healthy" ? "Converging" : "Ready",
    },
  ];

  const focusOptionsForDrawer = [
    { value: "all" as const, label: "All", count: args.filteredSessionsSummary.total },
    { value: "high_risk" as const, label: "High risk", count: args.filteredSessionsSummary.failed },
    { value: "blocked" as const, label: "Blocked", count: args.filteredSessionsSummary.blocked },
    { value: "running" as const, label: "Running", count: args.filteredSessionsSummary.running },
  ];

  const homeStateSignalLabel = args.isRefreshing
    ? "Refreshing the live overview..."
    : args.errorMessage
      ? `Refresh failed: ${args.errorMetaLabel}`
      : args.alertsStatus !== "healthy"
        ? "Overview partially degraded. Review the risk lane and session board first."
      : args.showFilterEmptyState
        ? "No sessions match the current filters"
        : args.showFocusEmptyState
          ? `No sessions match the current focus view (${args.focusLabel})`
          : args.showGlobalEmptyState
            ? "No session data yet. Start a request from PM first."
            : args.filteredSessionsSummary.failed > 0
              ? `${args.filteredSessionsSummary.failed} high-risk sessions detected. Quick actions are already staged in the main workspace.`
              : "Live overview ready";

  return {
    quickActionItems,
    drawerLiveBadgeVariant,
    contextHealthItems,
    sectionStatusItems,
    drawerPromptItems: drawerPromptItems.slice(0, 4),
    priorityLanes,
    focusOptionsForDrawer,
    homeStateSignalLabel,
    homeStateSignalDetail: `${args.liveStatusText} · ${args.refreshFreshnessSummary}`,
  };
}
