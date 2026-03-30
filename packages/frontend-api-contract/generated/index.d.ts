// GENERATED FILE. DO NOT EDIT.
// Source: docs/api/openapi.cortexpilot.json

export declare const FRONTEND_API_CONTRACT: {
  readonly defaultApiBase: "http://127.0.0.1:10000";
  readonly envKeys: readonly [
    "NEXT_PUBLIC_CORTEXPILOT_API_BASE", "NEXT_PUBLIC_CORTEXPILOT_API_BASE", "VITE_CORTEXPILOT_API_BASE", "VITE_CORTEXPILOT_API_BASE", "CORTEXPILOT_API_BASE", "CORTEXPILOT_API_BASE"
  ];
  readonly headers: {
    readonly requestId: "x-request-id";
    readonly traceId: "x-trace-id";
    readonly traceparent: "traceparent";
    readonly runId: "x-cortexpilot-run-id";
  };
  readonly network: {
    readonly fetchCredentials: "include";
    readonly eventSourceWithCredentials: true;
  };
  readonly query: {
    readonly status: "status";
    readonly statusArray: "status[]";
    readonly types: "types";
    readonly typesArray: "types[]";
    readonly runIds: "run_ids";
    readonly runIdsArray: "run_ids[]";
  };
  readonly paths: {
    readonly commandTowerOverview: "/api/command-tower/overview";
    readonly commandTowerAlerts: "/api/command-tower/alerts";
    readonly queue: "/api/queue";
    readonly pmSessions: "/api/pm/sessions";
    readonly pmSessionMessages: "/api/pm/sessions/{pm_session_id}/messages";
    readonly workflows: "/api/workflows";
  };
};
export declare const PM_SESSION_SORT_OPTIONS: readonly ["updated_desc", "created_desc", "failed_desc", "blocked_desc"];
export type PmSessionSort = "updated_desc" | "created_desc" | "failed_desc" | "blocked_desc";
export type BadgeTone = "running" | "warning" | "completed" | "critical";
export type BadgePresentation = {
  tone: BadgeTone;
  label: string;
};
export declare function mapBadgeByToken(
  token: string | undefined | null,
  mapping: Readonly<Record<string, BadgePresentation>>,
  fallback: BadgePresentation,
  defaultToken?: string,
): BadgePresentation;
export type FrontendApiContract = typeof FRONTEND_API_CONTRACT;
export {
  PM_JOURNEY_STAGES,
  COMMAND_TOWER_PRIORITY_LANES,
  DESKTOP_WORK_MODES,
} from "./ui-flow";
export type {
  PmJourneyStage,
  PmJourneyContext,
  CommandTowerPriorityLane,
  DesktopWorkMode,
} from "./ui-flow";
