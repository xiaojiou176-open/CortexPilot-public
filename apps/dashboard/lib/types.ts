import type { OperatorCopilotBrief as SharedOperatorCopilotBrief } from "@agentcoder/frontend-shared/types";

export * from "@agentcoder/frontend-shared/types";
export {
  GENERAL_TASK_TEMPLATE,
  buildTaskPackFieldStateForPack,
  buildTaskPackTemplatePayload,
  findTaskPackByTemplate,
  formatBindingReadModelLabel,
  formatRoleBindingRuntimeCapabilitySummary,
  formatRoleBindingRuntimeSummary,
  hydrateTaskPackFieldStateFromPayload,
  mergeTaskPackFieldStateByTemplate,
} from "@agentcoder/frontend-shared/types";

export type OperatorCopilotBrief = SharedOperatorCopilotBrief;
