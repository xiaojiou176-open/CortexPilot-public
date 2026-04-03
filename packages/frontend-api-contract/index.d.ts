export * from "./generated/index";

export type BindingReadModelStatus = "unresolved" | "resolved" | "registry-backed";
export type BindingValidationMode = "fail-closed";

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

export type RuntimeBindingSourceSummary = {
  runner?: string;
  provider?: string;
  model?: string;
};

export type RuntimeBindingValueSummary = {
  runner?: string;
  provider?: string;
  model?: string | null;
};

export type RuntimeBindingReadModel = {
  status?: string;
  authority_scope?: string;
  source?: RuntimeBindingSourceSummary;
  summary?: RuntimeBindingValueSummary;
};

export type RoleBindingReadModel = {
  authority: string;
  source: string;
  execution_authority: string;
  skills_bundle_ref: SkillsBundleReadModel;
  mcp_bundle_ref: McpBundleReadModel;
  runtime_binding: RuntimeBindingReadModel;
};

export type WorkflowCaseReadModel = {
  authority: string;
  source: string;
  execution_authority: string;
  workflow_id: string;
  source_run_id: string;
  role_binding_summary: RoleBindingReadModel;
};
