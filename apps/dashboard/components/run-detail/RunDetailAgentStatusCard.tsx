"use client";

import { Card } from "../ui/card";
import { toArray, toDisplayText, toStringOr } from "./runDetailHelpers";

type RunDetailAgentStatusCardProps = {
  agentStatusError: string;
  agentStatus: Array<Record<string, unknown>>;
};

export default function RunDetailAgentStatusCard({ agentStatusError, agentStatus }: RunDetailAgentStatusCardProps) {
  const hasError = Boolean(agentStatusError);
  return (
    <Card>
      <h3>Agent status</h3>
      {hasError ? (
        <div className="mono muted" role="status" aria-live="polite" data-testid="run-detail-agent-status-degraded">
          Agent status is temporarily unavailable. Run and timeline views remain available. Error: {agentStatusError}
        </div>
      ) : null}
      {agentStatus.length === 0 ? (
        <div className="mono">No agent status yet</div>
      ) : (
        agentStatus.map((agent) => (
          <Card key={`${toStringOr(agent.run_id, "")}-${toStringOr(agent.agent_id, "")}`} className="run-detail-agent-card">
            {(() => {
              const activeFiles = toArray(agent.current_files as unknown[] | undefined);
              return (
                <>
            <div className="mono">Role: {toDisplayText(agent.role)}</div>
            <div className="mono">Agent ID: {toDisplayText(agent.agent_id)}</div>
            <div className="mono">Stage: {toDisplayText(agent.stage)}</div>
            <div className="mono">Task ID: {toDisplayText(agent.task_id)}</div>
            <div className="mono">Worktree: {toDisplayText(agent.worktree)}</div>
            <div className="mono">Active file count: {activeFiles.length}</div>
            {activeFiles.length > 0 ? (
              <details>
                <summary className="mono">Open active file list</summary>
                <pre className="mono">{JSON.stringify(activeFiles, null, 2)}</pre>
              </details>
            ) : (
              <div className="mono muted">No active files reported.</div>
            )}
                </>
              );
            })()}
          </Card>
        ))
      )}
    </Card>
  );
}
