"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { enqueueRunQueue, mutationExecutionCapability, runNextQueue } from "../../lib/api";

type Props = {
  latestRunId?: string;
  queueCount?: number;
  eligibleCount?: number;
  showQueueLatest?: boolean;
  compact?: boolean;
  disableRunNextWhenEmpty?: boolean;
};

function toUtcIsoOrEmpty(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
}

export default function WorkflowQueueMutationControls({
  latestRunId = "",
  queueCount = 0,
  eligibleCount = 0,
  showQueueLatest,
  compact = false,
  disableRunNextWhenEmpty = false,
}: Props) {
  const router = useRouter();
  const [queuePriority, setQueuePriority] = useState("0");
  const [queueScheduledAt, setQueueScheduledAt] = useState("");
  const [queueDeadlineAt, setQueueDeadlineAt] = useState("");
  const [actionNotice, setActionNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyAction, setBusyAction] = useState<"queue" | "run-next" | "">("");
  const [, startRefresh] = useTransition();

  const mutationCapability = useMemo(() => mutationExecutionCapability(), []);
  const hasMutationRole = mutationCapability.executable;
  const operatorRole = mutationCapability.operatorRole || "";
  const roleGateReason = hasMutationRole
    ? ""
    : "NEXT_PUBLIC_CORTEXPILOT_OPERATOR_ROLE is not configured in this environment, so queue actions stay read-only.";
  const canQueueLatest = typeof showQueueLatest === "boolean" ? showQueueLatest : Boolean(latestRunId);

  async function refreshSurface() {
    startRefresh(() => {
      router.refresh();
    });
  }

  async function handleRunNextQueue() {
    if (!hasMutationRole) {
      setActionError(roleGateReason);
      setActionNotice("");
      return;
    }
    setBusyAction("run-next");
    setActionError("");
    setActionNotice("");
    try {
      const result = await runNextQueue({});
      if (result?.ok) {
        setActionNotice(`Started queued work as run ${String(result.run_id || "-")}. Refreshing the workflow view...`);
        await refreshSurface();
        return;
      }
      setActionError(String(result?.reason || "queue empty"));
    } catch (error) {
      setActionError(error instanceof Error ? error.message : String(error));
    } finally {
      setBusyAction("");
    }
  }

  async function handleQueueLatestRun() {
    if (!latestRunId) {
      setActionError("No run is available to enqueue.");
      setActionNotice("");
      return;
    }
    if (!hasMutationRole) {
      setActionError(roleGateReason);
      setActionNotice("");
      return;
    }
    setBusyAction("queue");
    setActionError("");
    setActionNotice("");
    try {
      const priority = Number.parseInt(queuePriority, 10);
      const payload: Record<string, string | number> = {};
      if (Number.isFinite(priority)) {
        payload.priority = priority;
      }
      const scheduledAtIso = toUtcIsoOrEmpty(queueScheduledAt);
      if (queueScheduledAt && !scheduledAtIso) {
        throw new Error("Queue scheduled at must be a valid local date/time.");
      }
      if (scheduledAtIso) {
        payload.scheduled_at = scheduledAtIso;
      }
      const deadlineAtIso = toUtcIsoOrEmpty(queueDeadlineAt);
      if (queueDeadlineAt && !deadlineAtIso) {
        throw new Error("Queue deadline at must be a valid local date/time.");
      }
      if (deadlineAtIso) {
        payload.deadline_at = deadlineAtIso;
      }
      const result = await enqueueRunQueue(latestRunId, payload);
      setActionNotice(`Queued ${String(result.task_id || latestRunId)}. Refreshing the workflow view...`);
      await refreshSurface();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : String(error));
    } finally {
      setBusyAction("");
    }
  }

  return (
    <div className="row-gap-2">
      {operatorRole ? (
        <p className="cell-sub mono muted">Operator role: {operatorRole}</p>
      ) : (
        <p className="cell-sub mono muted">{roleGateReason}</p>
      )}
      <p className="cell-sub mono muted">Queued items visible: {queueCount}. Ready now: {eligibleCount}.</p>
      {!compact ? (
        <div className="row-gap-2">
          <Input
            type="number"
            aria-label="Queue priority"
            value={queuePriority}
            onChange={(event) => setQueuePriority(event.target.value)}
            placeholder="Priority"
          />
          <Input
            type="datetime-local"
            aria-label="Queue scheduled at"
            value={queueScheduledAt}
            onChange={(event) => setQueueScheduledAt(event.target.value)}
            placeholder="Scheduled at"
          />
          <Input
            type="datetime-local"
            aria-label="Queue deadline at"
            value={queueDeadlineAt}
            onChange={(event) => setQueueDeadlineAt(event.target.value)}
            placeholder="Deadline at"
          />
        </div>
      ) : null}
      <div className="toolbar">
        {canQueueLatest ? (
          <Button
            variant="secondary"
            onClick={() => void handleQueueLatestRun()}
            disabled={busyAction !== "" && busyAction !== "queue"}
          >
            {busyAction === "queue" ? "Queueing..." : "Queue latest run contract"}
          </Button>
        ) : null}
        <Button
          variant={compact ? "default" : "secondary"}
          onClick={() => void handleRunNextQueue()}
          disabled={(busyAction !== "" && busyAction !== "run-next") || (disableRunNextWhenEmpty && queueCount === 0)}
        >
          {busyAction === "run-next" ? "Running..." : "Run next queued task"}
        </Button>
      </div>
      {actionNotice ? <div className="alert alert-warning">{actionNotice}</div> : null}
      {actionError ? <div className="alert alert-danger">{actionError}</div> : null}
    </div>
  );
}
