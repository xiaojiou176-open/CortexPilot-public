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
    readonly runs: "/api/runs";
    readonly runDetail: "/api/runs/{run_id}";
    readonly runEvents: "/api/runs/{run_id}/events";
    readonly runEventsStream: "/api/runs/{run_id}/events/stream";
    readonly runDiff: "/api/runs/{run_id}/diff";
    readonly runReports: "/api/runs/{run_id}/reports";
    readonly agents: "/api/agents";
    readonly agentStatus: "/api/agents/status";
    readonly contracts: "/api/contracts";
    readonly queue: "/api/queue";
    readonly workflows: "/api/workflows";
    readonly workflowDetail: "/api/workflows/{workflow_id}";
    readonly pmSessions: "/api/pm/sessions";
    readonly pmSessionMessages: "/api/pm/sessions/{pm_session_id}/messages";
  };
  readonly readModels: {
    readonly bindingStatuses: readonly ["unresolved", "resolved", "registry-backed"];
    readonly bindingValidationModes: readonly ["fail-closed"];
    readonly executionAuthorities: readonly ["task_contract"];
    readonly runtimeBindingStatuses: readonly ["unresolved", "partially-resolved", "contract-derived"];
    readonly runtimeBindingAuthorityScopes: readonly ["contract-derived-read-model"];
    readonly runtimeBindingSourceRunners: readonly ["runtime_options.runner", "role_contract.runtime_binding.runner", "unresolved"];
    readonly runtimeBindingSourceProviders: readonly ["runtime_options.provider", "role_contract.runtime_binding.provider", "unresolved"];
    readonly runtimeBindingSourceModels: readonly ["env.CORTEXPILOT_CODEX_MODEL", "env.CORTEXPILOT_PROVIDER_MODEL", "role_contract.runtime_binding.model", "unresolved"];
    readonly roleBindingAuthorities: readonly ["contract-derived-read-model"];
    readonly roleBindingSources: readonly ["persisted from contract", "derived from compiled role_contract and runtime inputs; not an execution authority surface"];
    readonly workflowCaseAuthorities: readonly ["workflow-case-read-model"];
    readonly workflowCaseSources: readonly ["latest linked run manifest.role_binding_summary"];
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
export type BindingReadModelStatus = "unresolved" | "resolved" | "registry-backed";
export type BindingValidationMode = "fail-closed";
export type ExecutionAuthority = "task_contract";
export type RuntimeBindingStatus = "unresolved" | "partially-resolved" | "contract-derived";
export type RuntimeBindingAuthorityScope = "contract-derived-read-model";
export type RuntimeBindingSourceRunner = "runtime_options.runner" | "role_contract.runtime_binding.runner" | "unresolved";
export type RuntimeBindingSourceProvider = "runtime_options.provider" | "role_contract.runtime_binding.provider" | "unresolved";
export type RuntimeBindingSourceModel = "env.CORTEXPILOT_CODEX_MODEL" | "env.CORTEXPILOT_PROVIDER_MODEL" | "role_contract.runtime_binding.model" | "unresolved";
export type RoleBindingReadModelAuthority = "contract-derived-read-model";
export type RoleBindingReadModelSource = "persisted from contract" | "derived from compiled role_contract and runtime inputs; not an execution authority surface";
export type WorkflowCaseReadModelAuthority = "workflow-case-read-model";
export type WorkflowCaseReadModelSource = "latest linked run manifest.role_binding_summary";
export type RuntimeBindingSourceSummary = {
  runner: RuntimeBindingSourceRunner;
  provider: RuntimeBindingSourceProvider;
  model: RuntimeBindingSourceModel;
};
export type RuntimeBindingValueSummary = {
  runner: string | null;
  provider: string | null;
  model: string | null;
};
export type SkillsBundleReadModel = {
  status: BindingReadModelStatus;
  ref: string | null;
  bundle_id: string | null;
  resolved_skill_set: string[];
  validation: BindingValidationMode;
};
export type McpBundleReadModel = {
  status: BindingReadModelStatus;
  ref: string | null;
  resolved_mcp_tool_set: string[];
  validation: BindingValidationMode;
};
export type RuntimeBindingReadModel = {
  status: RuntimeBindingStatus;
  authority_scope: RuntimeBindingAuthorityScope;
  source: RuntimeBindingSourceSummary;
  summary: RuntimeBindingValueSummary;
};
export type RoleBindingReadModel = {
  authority: RoleBindingReadModelAuthority;
  source: RoleBindingReadModelSource;
  execution_authority: ExecutionAuthority;
  skills_bundle_ref: SkillsBundleReadModel;
  mcp_bundle_ref: McpBundleReadModel;
  runtime_binding: RuntimeBindingReadModel;
};
export type WorkflowCaseReadModel = {
  authority: WorkflowCaseReadModelAuthority;
  source: WorkflowCaseReadModelSource;
  execution_authority: ExecutionAuthority;
  workflow_id: string;
  source_run_id: string;
  role_binding_summary: RoleBindingReadModel;
};
export type AgentCatalogRecord = {
  agent_id: string | null;
  role: string | null;
  sandbox: string | null;
  approval_policy: string | null;
  network: string | null;
  mcp_tools: string[];
  notes: string | null;
  lock_count: number;
  locked_paths: string[];
};
export type AgentLockRecord = {
  lock_id?: string | null;
  run_id?: string | null;
  agent_id?: string | null;
  role?: string | null;
  path?: string | null;
  ts?: string | null;
};
export type RoleCatalogRecord = {
  role: string;
  purpose: string | null;
  system_prompt_ref: string | null;
  handoff_eligible: boolean;
  required_downstream_roles: string[];
  fail_closed_conditions: string[];
  registered_agent_count: number;
  locked_agent_count: number;
  role_binding_read_model: RoleBindingReadModel;
};
export type AgentCatalogPayload = {
  agents: AgentCatalogRecord[];
  locks: AgentLockRecord[];
  role_catalog: RoleCatalogRecord[];
};
export type AgentStatusRecord = {
  run_id: string;
  task_id: string | null;
  agent_id: string;
  role: string;
  stage: string;
  worktree: string;
  allowed_paths: string[];
  locked_paths: string[];
  current_files: string[];
};
export type AgentStatusPayload = {
  agents: AgentStatusRecord[];
};
export type ContractCatalogRecordStatus = "structured" | "raw" | "read-failed";
export type ContractCatalogRecord = {
  source: string | null;
  path: string;
  record_status: ContractCatalogRecordStatus;
  task_id: string | null;
  run_id: string | null;
  allowed_paths: string[];
  acceptance_tests: string[];
  tool_permissions: Record<string, unknown> | null;
  owner_agent_id: string | null;
  owner_role: string | null;
  assigned_agent_id: string | null;
  assigned_role: string | null;
  execution_authority: ExecutionAuthority | null;
  role_binding_read_model: RoleBindingReadModel | null;
  payload: Record<string, unknown> | null;
  raw_preview: string | null;
};
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
