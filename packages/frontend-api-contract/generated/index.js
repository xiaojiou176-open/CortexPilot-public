// GENERATED FILE. DO NOT EDIT.
// Source: docs/api/openapi.cortexpilot.json

export const FRONTEND_API_CONTRACT = {
  "defaultApiBase": "http://127.0.0.1:10000",
  "envKeys": [
    "NEXT_PUBLIC_CORTEXPILOT_API_BASE",
    "NEXT_PUBLIC_CORTEXPILOT_API_BASE",
    "VITE_CORTEXPILOT_API_BASE",
    "VITE_CORTEXPILOT_API_BASE",
    "CORTEXPILOT_API_BASE",
    "CORTEXPILOT_API_BASE"
  ],
  "headers": {
    "requestId": "x-request-id",
    "traceId": "x-trace-id",
    "traceparent": "traceparent",
    "runId": "x-cortexpilot-run-id"
  },
  "network": {
    "fetchCredentials": "include",
    "eventSourceWithCredentials": true
  },
  "query": {
    "status": "status",
    "statusArray": "status[]",
    "types": "types",
    "typesArray": "types[]",
    "runIds": "run_ids",
    "runIdsArray": "run_ids[]"
  },
  "paths": {
    "commandTowerOverview": "/api/command-tower/overview",
    "commandTowerAlerts": "/api/command-tower/alerts",
    "queue": "/api/queue",
    "pmSessions": "/api/pm/sessions",
    "pmSessionMessages": "/api/pm/sessions/{pm_session_id}/messages",
    "workflows": "/api/workflows"
  }
};

export const PM_SESSION_SORT_OPTIONS = [
  "updated_desc",
  "created_desc",
  "failed_desc",
  "blocked_desc"
];

function normalizeToken(value, defaultToken) {
  const token = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (token) return token;
  return defaultToken ? defaultToken.trim().toLowerCase() : "";
}

export function mapBadgeByToken(token, mapping, fallback, defaultToken) {
  const normalized = normalizeToken(token, defaultToken);
  if (normalized && Object.prototype.hasOwnProperty.call(mapping, normalized)) {
    return mapping[normalized];
  }
  return fallback;
}

export * from "./ui-flow.js";
