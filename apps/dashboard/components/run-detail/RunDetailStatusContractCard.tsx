"use client";

import { DEFAULT_UI_LOCALE, getUiCopy } from "@cortexpilot/frontend-shared/uiCopy";
import Link from "next/link";
import ContractViewer from "../ContractViewer";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import {
  formatBindingReadModelLabel,
  formatRoleBindingRuntimeCapabilitySummary,
  formatRoleBindingRuntimeSummary,
  type EventRecord,
  type RunContract,
  type RunDetailPayload,
} from "../../lib/types";
import type { LifecycleBadge, LiveMode, LiveTransport } from "./runDetailHelpers";
import { badgeVariantForStage, liveBadgeVariant, liveLabel, toArray, toDisplayText, toObject } from "./runDetailHelpers";

type RunDetailStatusContractCardProps = {
  run: RunDetailPayload;
  schemaVersion: string;
  observability: Record<string, unknown>;
  traceId: string;
  traceUrl: string;
  workflowId: string;
  workflowStatus: string;
  terminalStatus: string;
  liveMode: LiveMode;
  liveEnabled: boolean;
  onToggleLive: () => void;
  liveTransport: LiveTransport;
  liveIntervalMs: number;
  liveLagMs: number;
  lastRefreshAt: string;
  liveError: string;
  lifecycleRail: LifecycleBadge[];
  pendingApprovals: EventRecord[];
  evidenceHashes: Record<string, unknown>;
  manifestArtifacts: unknown[];
  planningContracts: Array<Record<string, unknown>>;
  planningContractsError: string;
  onOpenLogs: () => void;
  onOpenReports: () => void;
  failedTerminalActionFeedback: string;
};

export default function RunDetailStatusContractCard({
  run,
  schemaVersion,
  observability,
  traceId,
  traceUrl,
  workflowId,
  workflowStatus,
  terminalStatus,
  liveMode,
  liveEnabled,
  onToggleLive,
  liveTransport,
  liveIntervalMs,
  liveLagMs,
  lastRefreshAt,
  liveError,
  lifecycleRail,
  pendingApprovals,
  evidenceHashes,
  manifestArtifacts,
  planningContracts,
  planningContractsError,
  onOpenLogs,
  onOpenReports,
  failedTerminalActionFeedback,
}: RunDetailStatusContractCardProps) {
  const bindingReadModelCopy = getUiCopy(DEFAULT_UI_LOCALE).desktop.runDetail.bindingReadModel;
  const terminal = terminalStatus.toUpperCase();
  const isTerminal = terminal === "FAILED" || terminal === "ERROR" || terminal === "SUCCESS" || terminal === "DONE" || terminal === "REJECTED";
  const isFailedTerminal = terminal === "FAILED" || terminal === "ERROR" || terminal === "REJECTED";
  const allowedPaths = toArray(run.allowed_paths);
  const evidenceEntries = Object.entries(toObject(evidenceHashes));
  const artifactList = toArray(manifestArtifacts);
  const artifactNames = artifactList
    .map((item) => {
      const record = toObject(item);
      const artifactName = typeof record.name === "string" ? record.name : typeof record.path === "string" ? record.path : "";
      return artifactName.trim();
    })
    .filter(Boolean);
  const lifecycleArtifactLabels = [
    artifactNames.includes("prompt_artifact") || artifactNames.includes("artifacts/prompt_artifact.json")
      ? "Prompt artifact"
      : "",
    artifactNames.includes("planning_wave_plan") || artifactNames.includes("artifacts/planning_wave_plan.json")
      ? "Wave plan"
      : "",
    artifactNames.includes("planning_worker_prompt_contracts") ||
    artifactNames.includes("artifacts/planning_worker_prompt_contracts.json")
      ? "Worker prompt contracts"
      : "",
  ].filter(Boolean);
  const continuationOnIncomplete = Array.from(
    new Set(
      planningContracts
        .map((contract) => toDisplayText(toObject(contract.continuation_policy).on_incomplete))
        .filter((value) => value !== "-"),
    ),
  );
  const continuationOnBlocked = Array.from(
    new Set(
      planningContracts
        .map((contract) => toDisplayText(toObject(contract.continuation_policy).on_blocked))
        .filter((value) => value !== "-"),
    ),
  );
  const doneChecks = Array.from(
    new Set(
      planningContracts.flatMap((contract) =>
        toArray(toObject(contract.done_definition).acceptance_checks as unknown[] | null | undefined)
          .map((value) => toDisplayText(value))
          .filter((value) => value !== "-"),
      ),
    ),
  );
  const roleBindingReadModel = run.role_binding_read_model;

  return (
    <Card>
      <h3>Status & Contract</h3>
      <div className="mono" data-testid="run-id">
        Run ID: {run.run_id}
      </div>
      <div className="mono" data-testid="task-id">
        Task ID: {run.task_id}
      </div>
      <div className="mono" data-testid="run-status">
        Status: {run.status}
      </div>
      <div className="mono">Failure reason: {toDisplayText(run?.manifest?.failure_reason)}</div>
      <div className="mono">Contract version: {schemaVersion}</div>
      <div className="mono">Orchestrator version: {toDisplayText(run?.manifest?.versions?.orchestrator)}</div>
      <div className="mono">Observability: {observability?.enabled ? "Enabled" : "Disabled"}</div>
      <div className="mono">Trace ID: {toDisplayText(traceId)}</div>
      {traceUrl ? (
        <div className="mono">
          Trace link:{" "}
          <a href={traceUrl} target="_blank" rel="noopener noreferrer">
            {traceUrl}
          </a>
        </div>
      ) : null}
      <div className="mono">
        Workflow ID:{" "}
        {workflowId ? <Link href={`/workflows/${encodeURIComponent(workflowId)}`}>{workflowId}</Link> : "-"}
      </div>
      <div className="mono">Workflow status: {toDisplayText(workflowStatus)}</div>
      <div className="mono">Terminal status: {toDisplayText(terminalStatus)}</div>
      <div className="run-detail-live-panel">
        <div className="run-detail-live-head">
          <Badge variant={isTerminal ? "success" : liveBadgeVariant(liveMode)}>
            {isTerminal ? "Terminal snapshot" : liveLabel(liveMode)}
          </Badge>
          {isTerminal ? null : (
            <Button variant="secondary" aria-label={liveEnabled ? "Pause live refresh" : "Resume live refresh"} onClick={onToggleLive}>
              {liveEnabled ? "Pause live" : "Resume live"}
            </Button>
          )}
        </div>
        <div className="mono">Live transport: {liveTransport}</div>
        <div className="mono">Refresh interval (ms): {liveIntervalMs}</div>
        <div className="mono">Event lag (ms): {liveLagMs}</div>
        <div className="mono">Last refresh: {toDisplayText(lastRefreshAt)}</div>
        {liveError ? (
          <div className="mono run-detail-live-error" role="alert" aria-live="assertive">
            {liveError}
          </div>
        ) : null}
      </div>
      {isFailedTerminal ? (
        <div className="run-detail-section" data-testid="failed-terminal-actions">
          <strong>Failure diagnostics</strong>
          <div className="run-detail-inline-gap-lg">
            <Button variant="secondary" onClick={onOpenReports}>
              Open diagnostic report
            </Button>
            <Button variant="secondary" onClick={onOpenLogs}>
              Open execution logs
            </Button>
          </div>
          {failedTerminalActionFeedback ? (
            <div
              className="mono muted"
              role="status"
              aria-live="polite"
              data-testid="failed-terminal-action-feedback"
            >
              {failedTerminalActionFeedback}
            </div>
          ) : null}
        </div>
      ) : null}
      {lifecycleRail.length > 0 ? (
        <>
          <div className="mono run-detail-section-label">Lifecycle rail (PM -&gt; TL -&gt; Worker agents -&gt; Review agents -&gt; Tests -&gt; TL -&gt; PM)</div>
          <div className="run-detail-chip-row">
            {lifecycleRail.map((item) => (
              <Badge key={item.key} variant={badgeVariantForStage(item.status)} title={item.detail}>
                {item.label}: {item.detail}
              </Badge>
            ))}
          </div>
        </>
      ) : null}
      {pendingApprovals.length > 0 ? (
        <div className="alert alert-danger run-detail-alert-gap">
          <div className="mono">Detected {pendingApprovals.length} HUMAN_APPROVAL_REQUIRED event{pendingApprovals.length === 1 ? "" : "s"}.</div>
          <div className="mono run-detail-inline-gap">Open the manual approvals page to unblock the run and continue.</div>
          <div className="run-detail-inline-gap-lg">
            <Button asChild>
              <Link href="/god-mode">Open manual approvals</Link>
            </Button>
          </div>
        </div>
      ) : null}
      <div className="mono" data-testid="allowed-paths-label">
        Allowed paths:
      </div>
      <div className="mono muted">{allowedPaths.length} path{allowedPaths.length === 1 ? "" : "s"}</div>
      <details>
        <summary className="mono">Expand path details</summary>
        <pre className="mono" data-testid="allowed-paths-content">
          {JSON.stringify(allowedPaths, null, 2)}
        </pre>
      </details>
      <div className="mono">Evidence hashes:</div>
      <div className="mono muted">{evidenceEntries.length} key{evidenceEntries.length === 1 ? "" : "s"}</div>
      <details>
        <summary className="mono">Expand evidence hashes</summary>
        <pre className="mono">{JSON.stringify(toObject(evidenceHashes), null, 2)}</pre>
      </details>
      {roleBindingReadModel ? (
        <div className="run-detail-section" data-testid="run-role-binding-read-model">
          <div className="mono run-detail-section-label">{bindingReadModelCopy.title}</div>
          <div className="mono">{bindingReadModelCopy.authority}: {toDisplayText(roleBindingReadModel.authority)}</div>
          <div className="mono">{bindingReadModelCopy.source}: {toDisplayText(roleBindingReadModel.source)}</div>
          <div className="mono">
            {bindingReadModelCopy.executionAuthority}: {toDisplayText(roleBindingReadModel.execution_authority)}
          </div>
          <div className="mono">
            {bindingReadModelCopy.skillsBundle}: {formatBindingReadModelLabel(roleBindingReadModel.skills_bundle_ref)}
          </div>
          <div className="mono">
            {bindingReadModelCopy.mcpBundle}: {formatBindingReadModelLabel(roleBindingReadModel.mcp_bundle_ref)}
          </div>
          <div className="mono">
            {bindingReadModelCopy.runtimeBinding}: {formatRoleBindingRuntimeSummary(roleBindingReadModel)}
          </div>
          <div className="mono">
            {bindingReadModelCopy.runtimeCapability}: {toDisplayText(roleBindingReadModel.runtime_binding?.capability?.lane)}
          </div>
          <div className="mono">
            {bindingReadModelCopy.toolExecution}: {formatRoleBindingRuntimeCapabilitySummary(roleBindingReadModel)}
          </div>
          <div className="mono muted">
            {bindingReadModelCopy.readOnlyNote}
          </div>
        </div>
      ) : null}
      {planningContracts.length > 0 || planningContractsError ? (
        <div className="run-detail-section" data-testid="run-completion-governance-summary">
          <div className="mono run-detail-section-label">Completion governance</div>
          <div className="mono">Worker prompt contracts: {planningContracts.length}</div>
          {continuationOnIncomplete.length > 0 ? (
            <div className="mono">On incomplete: {continuationOnIncomplete.join(" / ")}</div>
          ) : null}
          {continuationOnBlocked.length > 0 ? (
            <div className="mono">On blocked: {continuationOnBlocked.join(" / ")}</div>
          ) : null}
          {doneChecks.length > 0 ? (
            <div className="mono">DoD checks: {doneChecks.join(" / ")}</div>
          ) : null}
          {planningContractsError ? (
            <div className="mono muted">{planningContractsError}</div>
          ) : (
            <div className="mono muted">
              Derived from persisted worker prompt contracts. These summaries stay advisory; task_contract still owns execution authority.
            </div>
          )}
        </div>
      ) : null}
      <div className="mono">Manifest artifacts:</div>
      <div className="mono muted">{artifactList.length} artifact{artifactList.length === 1 ? "" : "s"}</div>
      {lifecycleArtifactLabels.length > 0 ? (
        <div className="mono">Lifecycle artifacts: {lifecycleArtifactLabels.join(" / ")}</div>
      ) : null}
      <details>
        <summary className="mono">Expand artifact list</summary>
        <pre className="mono">{JSON.stringify(artifactList, null, 2)}</pre>
      </details>
      <ContractViewer contract={(run.contract ?? {}) as RunContract} schemaVersion={schemaVersion} />
    </Card>
  );
}
