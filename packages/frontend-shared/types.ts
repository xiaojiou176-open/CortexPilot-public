export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export type JsonObject = { [key: string]: JsonValue };
export type PublicTaskTemplate = "news_digest" | "topic_brief" | "page_brief";
export type NewsDigestTimeRange = "24h" | "7d" | "30d";
export type NewsDigestTemplatePayload = {
  topic: string;
  sources: string[];
  time_range: NewsDigestTimeRange;
  max_results: number;
};
export type TopicBriefTemplatePayload = {
  topic: string;
  time_range: NewsDigestTimeRange;
  max_results: number;
};
export type PageBriefTemplatePayload = {
  url: string;
  focus: string;
};
export type NewsDigestItem = {
  title: string;
  url: string;
  publisher?: string;
  provider?: string;
  snippet?: string;
};
export type NewsDigestResult = {
  task_template: "news_digest";
  generated_at: string;
  status: "SUCCESS" | "EMPTY" | "FAILED";
  topic: string;
  time_range: NewsDigestTimeRange;
  requested_sources: string[];
  max_results: number;
  summary: string;
  sources: NewsDigestItem[];
  evidence_refs: {
    raw: string;
    purified: string;
    verification: string;
    evidence_bundle: string;
  };
  failure_reason_zh?: string;
};
export type TopicBriefResult = {
  task_template: "topic_brief";
  generated_at: string;
  status: "SUCCESS" | "EMPTY" | "FAILED";
  topic: string;
  time_range: NewsDigestTimeRange;
  requested_sources: string[];
  max_results: number;
  summary: string;
  sources: NewsDigestItem[];
  evidence_refs: {
    raw: string;
    purified: string;
    verification: string;
    evidence_bundle: string;
  };
  failure_reason_zh?: string;
};
export type PageBriefResult = {
  task_template: "page_brief";
  generated_at: string;
  status: "SUCCESS" | "EMPTY" | "FAILED";
  url: string;
  resolved_url: string;
  page_title: string;
  focus: string;
  summary: string;
  key_points: string[];
  screenshot_artifact?: string;
  failure_reason_zh?: string;
};

export type WorkflowInfo = {
  workflow_id?: string;
  status?: string;
};

export type AgentRef = {
  role?: string;
  agent_id?: string;
};

export type RunContract = {
  task_id?: string;
  run_id?: string;
  task_template?: PublicTaskTemplate;
  template_payload?: NewsDigestTemplatePayload | TopicBriefTemplatePayload | PageBriefTemplatePayload;
  allowed_paths?: string[];
  acceptance_tests?: string[];
  tool_permissions?: Record<string, JsonValue>;
  owner_agent?: AgentRef;
  assigned_agent?: AgentRef;
  rollback?: Record<string, JsonValue>;
  [key: string]: JsonValue | undefined;
};

export type RunManifest = {
  failure_reason?: string;
  versions?: { contracts_schema?: string; orchestrator?: string };
  trace_id?: string;
  trace?: { trace_id?: string; trace_url?: string };
  workflow?: WorkflowInfo;
  evidence_hashes?: Record<string, JsonValue>;
  artifacts?: JsonValue[];
  observability?: { enabled?: boolean };
  chain_id?: string;
  [key: string]: JsonValue | undefined;
};

export type RunSummary = {
  run_id: string;
  task_id: string;
  status: string;
  workflow_status?: string;
  created_at?: string;
  start_ts?: string;
  owner_agent_id?: string;
  owner_role?: string;
  assigned_agent_id?: string;
  assigned_role?: string;
  last_event_ts?: string;
  failure_reason?: string;
  failure_class?: string;
  outcome_type?: string;
  outcome_label_zh?: string;
  failure_summary_zh?: string;
  action_hint_zh?: string;
  failure_code?: string;
  failure_stage?: string;
  root_event?: string;
};

export type RunDetailPayload = RunSummary & {
  allowed_paths?: string[];
  contract?: RunContract;
  manifest?: RunManifest;
  news_digest_result?: NewsDigestResult;
  topic_brief_result?: TopicBriefResult;
  page_brief_result?: PageBriefResult;
};

export type EventRecord = {
  ts?: string;
  event?: string;
  event_type?: string;
  level?: string;
  task_id?: string;
  run_id?: string;
  _run_id?: string;
  trace_id?: string;
  context?: Record<string, JsonValue>;
  [key: string]: JsonValue | undefined;
};

export type ReportRecord = {
  name: string;
  data: JsonValue;
};

export type ToolCallRecord = {
  tool?: string;
  status?: string;
  task_id?: string;
  duration_ms?: number;
  error?: string;
  args?: Record<string, JsonValue>;
  [key: string]: JsonValue | undefined;
};

export type ContractRecord = {
  _source?: string;
  _path?: string;
  payload?: RunContract;
} & RunContract;

export type WorkflowRun = {
  run_id: string;
  status?: string;
  created_at?: string;
  task_id?: string;
};

export type WorkflowRecord = {
  workflow_id: string;
  status?: string;
  namespace?: string;
  task_queue?: string;
  runs?: WorkflowRun[];
};

export type WorkflowDetailPayload = {
  workflow: WorkflowRecord;
  runs: WorkflowRun[];
  events: EventRecord[];
};

export type PmSessionStatus = "active" | "paused" | "done" | "failed" | "archived";

export type PmSessionSummary = {
  pm_session_id: string;
  objective?: string;
  owner_pm?: string;
  project_key?: string;
  session_source?: string;
  status: PmSessionStatus;
  created_at?: string;
  updated_at?: string;
  closed_at?: string;
  run_count: number;
  running_runs: number;
  failed_runs: number;
  success_runs: number;
  latest_run_id?: string;
  current_role?: string;
  current_step?: string;
  blocked_runs: number;
};

export type PmSessionRun = {
  run_id: string;
  task_id?: string;
  status?: string;
  failure_reason?: string;
  workflow_id?: string;
  created_at?: string;
  finished_at?: string;
  last_event_ts?: string;
  blocked?: boolean;
  current_role?: string;
  current_step?: string;
  binding_type?: string;
  bound_at?: string;
};

export type PmSessionDetailPayload = {
  session: PmSessionSummary;
  run_ids: string[];
  runs: PmSessionRun[];
  bindings?: Array<{
    pm_session_id: string;
    run_id: string;
    binding_type: string;
    bound_at?: string;
  }>;
  blockers?: Array<{
    run_id: string;
    task_id?: string;
    status?: string;
    current_role?: string;
    current_step?: string;
  }>;
};

export type PmSessionConversationEdge = {
  from_role?: string;
  to_role?: string;
  run_id?: string;
  ts?: string;
  event_ref?: string;
  count?: number;
};

export type PmSessionConversationGraphPayload = {
  pm_session_id: string;
  window: string;
  group_by_role?: boolean;
  nodes: string[];
  edges: PmSessionConversationEdge[];
  stats: {
    node_count: number;
    edge_count: number;
  };
};

export type PmSessionMetricsPayload = {
  pm_session_id: string;
  run_count: number;
  running_runs: number;
  failed_runs: number;
  success_runs: number;
  blocked_runs: number;
  failure_rate: number;
  blocked_ratio: number;
  avg_duration_seconds: number;
  avg_recovery_seconds: number;
  cycle_time_seconds: number;
  mttr_seconds: number;
};

export type CommandTowerOverviewPayload = {
  generated_at: string;
  total_sessions: number;
  active_sessions: number;
  failed_sessions: number;
  blocked_sessions: number;
  failed_ratio: number;
  blocked_ratio: number;
  failure_trend_30m: number;
  slo_targets?: Record<string, number>;
  top_blockers: PmSessionSummary[];
};

export type CommandTowerAlert = {
  code: string;
  severity: "info" | "warning" | "critical";
  message: string;
  suggested_action?: string;
};

export type CommandTowerAlertsPayload = {
  generated_at: string;
  status: "healthy" | "degraded" | "critical";
  slo_targets?: Record<string, number>;
  alerts: CommandTowerAlert[];
};
