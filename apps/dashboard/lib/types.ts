import type { OperatorCopilotBrief as SharedOperatorCopilotBrief } from "@codeflow/frontend-shared/types";

export * from "@codeflow/frontend-shared/types";
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
} from "@codeflow/frontend-shared/types";

export type OperatorCopilotBrief = SharedOperatorCopilotBrief;
