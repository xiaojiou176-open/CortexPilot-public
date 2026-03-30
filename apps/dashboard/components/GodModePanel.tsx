"use client";

import { useEffect, useRef, useState } from "react";
import { approveGodMode, fetchPendingApprovals, mutationExecutionCapability } from "../lib/api";
import { sanitizeUiError, uiErrorDetail } from "../lib/uiError";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import Link from "next/link";

type QueueUiState = "loading" | "error" | "pending" | "idle";

function formatLocalTime(iso: string | null): string {
  if (!iso) {
    return "--";
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "--";
  }
  return date.toLocaleTimeString("zh-CN", { hour12: false });
}

function inferQueueUiState(pendingLoading: boolean, pendingError: string | null, pendingCount: number): QueueUiState {
  if (pendingLoading) return "loading";
  if (pendingError) return "error";
  if (pendingCount > 0) return "pending";
  return "idle";
}

function queueBadgeMeta(state: QueueUiState, pendingCount: number): { variant: "running" | "failed" | "warning" | "success"; text: string } {
  switch (state) {
    case "loading":
      return { variant: "running", text: "Refreshing" };
    case "error":
      return { variant: "failed", text: "Load failed" };
    case "pending":
      return { variant: "warning", text: `${pendingCount} pending approvals` };
    default:
      return { variant: "success", text: "No pending items" };
  }
}

function isAuthRelatedError(errorText: string): boolean {
  const normalized = errorText.toLowerCase();
  return normalized.includes("401") || normalized.includes("403") || normalized.includes("auth") || normalized.includes("token");
}

export default function GodModePanel() {
  const [runId, setRunId] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<"success" | "error" | "info">("info");
  const [pending, setPending] = useState<Array<Record<string, unknown>>>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingError, setPendingError] = useState<string | null>(null);
  const [pendingLastAttemptAt, setPendingLastAttemptAt] = useState<string | null>(null);
  const [pendingLastSuccessAt, setPendingLastSuccessAt] = useState<string | null>(null);
  const [approvingRunId, setApprovingRunId] = useState<string | null>(null);
  const [manualApproving, setManualApproving] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<string | null>(null);
  const confirmDialogRef = useRef<HTMLDivElement | null>(null);
  const confirmCancelButtonRef = useRef<HTMLButtonElement | null>(null);
  const confirmTriggerRef = useRef<HTMLElement | null>(null);

  const mutationCapability = mutationExecutionCapability();
  const normalizedRole = mutationCapability.operatorRole || "";
  const hasMutationRole = mutationCapability.executable;
  const roleGateReason = hasMutationRole ? "" : "NEXT_PUBLIC_CORTEXPILOT_OPERATOR_ROLE is not configured. Approval actions are disabled.";
  const queueState = inferQueueUiState(pendingLoading, pendingError, pending.length);
  const queueBadge = queueBadgeMeta(queueState, pending.length);
  const hasPendingLoadError = Boolean(pendingError);
  const pendingErrorIsAuth = pendingError ? isAuthRelatedError(pendingError) : false;

  async function loadPending(options?: { preserveStatus?: boolean; trigger?: "initial" | "refresh" | "retry" }) {
    const preserveStatus = options?.preserveStatus ?? false;
    const trigger = options?.trigger ?? "refresh";
    const attemptAt = new Date().toISOString();
    setPendingLoading(true);
    setPendingLastAttemptAt(attemptAt);
    if (!preserveStatus) {
      setStatusTone("info");
      setStatus(trigger === "retry" ? "Retrying pending approvals queue..." : "Refreshing pending approvals queue...");
    }
    try {
      const items = await fetchPendingApprovals();
      setPending(Array.isArray(items) ? items : []);
      setPendingError(null);
      setPendingLastSuccessAt(new Date().toISOString());
      if (!preserveStatus) {
        setStatusTone("success");
        setStatus(`Pending approvals queue refreshed. ${Array.isArray(items) ? items.length : 0} item(s).`);
      }
    } catch (err: unknown) {
      console.error(`[god-mode] load-pending failed: ${uiErrorDetail(err)}`);
      const normalizedError = sanitizeUiError(err, "Pending approvals queue fetch failed");
      const isAuthError = isAuthRelatedError(normalizedError);
      setPendingError(normalizedError);
      setPending([]);
      if (!preserveStatus) {
        setStatusTone("error");
        if (trigger === "retry") {
          setStatus(
            isAuthError
              ? `Retry failed: ${normalizedError}. Confirm permissions or sign in again before retrying.`
              : `Retry failed: ${normalizedError}.`,
          );
        } else {
          setStatus(
            isAuthError
              ? `Pending approvals queue refresh failed: ${normalizedError}. Confirm permissions or sign in again before retrying.`
              : "Pending approvals queue refresh failed. Resolve the error and retry.",
          );
        }
      }
    } finally {
      setPendingLoading(false);
    }
  }

  useEffect(() => {
    void loadPending({ trigger: "initial" });
  }, []);

  async function handleApprove() {
    if (!hasMutationRole) {
      setStatusTone("error");
      setStatus(roleGateReason);
      return;
    }
    const targetRunId = runId.trim();
    if (!targetRunId) {
      setStatusTone("error");
      setStatus("Enter run_id before approving.");
      return;
    }
    setManualApproving(true);
    setStatusTone("info");
    setStatus("Submitting approval...");
    try {
      await approveGodMode(targetRunId);
      setStatusTone("success");
      setStatus("Approved.");
      await loadPending({ preserveStatus: true });
    } catch (err: unknown) {
      console.error(`[god-mode] approve failed: ${uiErrorDetail(err)}`);
      setStatusTone("error");
      setStatus(`Failed: ${sanitizeUiError(err, "Approval failed")}`);
    } finally {
      setManualApproving(false);
    }
  }

  function requestApproveItem(id: string, triggerElement?: HTMLElement | null) {
    if (!hasMutationRole) {
      setStatusTone("error");
      setStatus(roleGateReason);
      return;
    }
    if (triggerElement) {
      confirmTriggerRef.current = triggerElement;
    } else {
      const activeElement = document.activeElement;
      if (activeElement instanceof HTMLElement) {
        confirmTriggerRef.current = activeElement;
      }
    }
    setConfirmTarget(id);
  }

  function cancelConfirm() {
    setConfirmTarget(null);
  }

  useEffect(() => {
    if (!confirmTarget) {
      const trigger = confirmTriggerRef.current;
      if (trigger && trigger.isConnected) {
        trigger.focus();
      }
      confirmTriggerRef.current = null;
      return;
    }

    const dialog = confirmDialogRef.current;
    if (!dialog) return;

    const focusableSelector = [
      "button:not([disabled])",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      "[href]",
      "[tabindex]:not([tabindex='-1'])",
    ].join(", ");

    const getFocusableElements = () =>
      Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector)).filter(
        (element) => !element.hasAttribute("disabled") && element.getAttribute("aria-hidden") !== "true",
      );

    const initialFocusTarget = confirmCancelButtonRef.current ?? getFocusableElements()[0] ?? dialog;
    initialFocusTarget.focus();
    const focusSyncFrame = window.requestAnimationFrame(() => {
      const first = confirmCancelButtonRef.current ?? getFocusableElements()[0] ?? dialog;
      if (!dialog.contains(document.activeElement)) {
        first.focus();
      }
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setConfirmTarget(null);
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = getFocusableElements();
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey) {
        if (active === first || !dialog.contains(active)) {
          event.preventDefault();
          last.focus();
        }
        return;
      }

      if (active === last || !dialog.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    };

    const onFocusIn = (event: FocusEvent) => {
      const target = event.target as Node | null;
      if (!target || !dialog.contains(target)) {
        const first = confirmCancelButtonRef.current ?? getFocusableElements()[0] ?? dialog;
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("focusin", onFocusIn);
    return () => {
      window.cancelAnimationFrame(focusSyncFrame);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("focusin", onFocusIn);
    };
  }, [confirmTarget]);

  async function confirmApproveItem() {
    if (!confirmTarget) return;
    if (!hasMutationRole) {
      setStatusTone("error");
      setStatus(roleGateReason);
      setConfirmTarget(null);
      return;
    }
    const targetRunId = confirmTarget;
    setConfirmTarget(null);
    setRunId(targetRunId);
    setApprovingRunId(targetRunId);
    setStatusTone("info");
    setStatus("Submitting approval...");
    try {
      await approveGodMode(targetRunId);
      setStatusTone("success");
      setStatus("Approved.");
      await loadPending({ preserveStatus: true });
    } catch (err: unknown) {
      console.error(`[god-mode] approve-item failed: ${uiErrorDetail(err)}`);
      setStatusTone("error");
      setStatus(`Failed: ${sanitizeUiError(err, "Approval failed")}`);
    } finally {
      setApprovingRunId(null);
    }
  }

  return (
    <section className="god-mode-panel" aria-labelledby="god-mode-title">
      <header className="god-mode-header">
        <h2 id="god-mode-title">God Mode</h2>
        <Badge variant={queueBadge.variant} data-testid="god-mode-queue-badge">
          {queueBadge.text}
        </Badge>
      </header>
      <div className="god-mode-detail" role="group" aria-label="Approval role configuration">
        <span className="god-mode-detail-label">Operator role</span>
        <div className="god-mode-input-row">
          <Input
            value={normalizedRole || "Not configured"}
            aria-label="Operator role"
            data-testid="god-mode-role-select"
            readOnly
          />
          <Button
            variant="ghost"
            onClick={() => void loadPending({ trigger: "refresh" })}
            disabled={pendingLoading}
            data-testid="god-mode-refresh-pending"
          >
            {pendingLoading ? "Refreshing..." : "Refresh pending approvals"}
          </Button>
        </div>
        <span className="mono muted" data-testid="god-mode-last-success-at">
          Last successful refresh: {formatLocalTime(pendingLastSuccessAt)}
        </span>
        {!hasMutationRole ? (
          <span className="mono muted" data-testid="god-mode-role-tip">{roleGateReason}</span>
        ) : null}
      </div>

      {hasPendingLoadError && (
        <div className="god-mode-detail" role="alert" aria-live="assertive">
          <div className="grid">
            <span className="god-mode-detail-label">{pendingError}</span>
            <span className="mono muted">
              Recovery tip: confirm the login state and approval role before retrying.
            </span>
            <span className="mono muted" data-testid="god-mode-last-attempt-at">
              Last attempt: {formatLocalTime(pendingLastAttemptAt)}
            </span>
          </div>
          <div className="toolbar mt-2">
            <Button
              variant="ghost"
              onClick={() => void loadPending({ trigger: "retry" })}
              disabled={pendingLoading}
              data-testid="god-mode-retry-pending"
            >
              {pendingLoading ? "Retrying..." : "Retry fetch"}
            </Button>
            <Button asChild variant="secondary">
              <Link href="/pm">Open PM session to inspect connection</Link>
            </Button>
            {pendingErrorIsAuth ? (
              <Button asChild variant="ghost">
                <Link href="/command-tower">Open Command Tower to verify auth state</Link>
              </Button>
            ) : null}
          </div>
        </div>
      )}

      {pendingLoading ? (
        <div className="mono muted" role="status" aria-live="polite" data-testid="god-mode-loading-state">
          Loading pending approvals...
        </div>
      ) : null}

      {pending.length > 0 && (
        <div className="god-mode-queue" role="list" aria-label="Pending approvals queue">
          {pending.map((item) => (
            <article key={String(item.run_id || "")} className="god-mode-item" role="listitem">
              <div className="god-mode-item-header">
                <code className="mono">{String(item.run_id || "-")}</code>
                <Badge variant="warning">{String(item.status || "-")}</Badge>
              </div>
              {item.approval_pack && typeof item.approval_pack === "object" ? (
                <p className="mono muted">{String((item.approval_pack as Record<string, unknown>).summary || "")}</p>
              ) : null}
              {Array.isArray(item.reason) && item.reason.length > 0 && (
                <div className="god-mode-detail">
                  <span className="god-mode-detail-label">Reason</span>
                  <ul className="god-mode-detail-list">
                    {item.reason.map((r, i) => <li key={i}>{String(r)}</li>)}
                  </ul>
                </div>
              )}
              {Array.isArray(item.actions) && item.actions.length > 0 && (
                <div className="god-mode-detail">
                  <span className="god-mode-detail-label">Required action</span>
                  <ul className="god-mode-detail-list">
                    {item.actions.map((a, i) => <li key={i}>{String(a)}</li>)}
                  </ul>
                </div>
              )}
              {item.resume_step && (
                <p className="god-mode-resume">
                  Resume at: <code>{String(item.resume_step)}</code>
                </p>
              )}
              <Button
                variant="default"
                className="god-mode-approve-btn"
                onClick={(event) => requestApproveItem(String(item.run_id), event.currentTarget)}
                disabled={!hasMutationRole || pendingLoading || approvingRunId === String(item.run_id)}
              >
                {approvingRunId === String(item.run_id) ? "Approving..." : "I am done, continue"}
              </Button>
            </article>
          ))}
        </div>
      )}

      <div className="god-mode-manual">
        <p className="god-mode-hint">
          When the event stream shows HUMAN_APPROVAL_REQUIRED, paste the run_id and approve it. The action will be written to the event log.
        </p>
        <label className="sr-only" htmlFor="god-mode-run-id">
          Run ID
        </label>
        <div className="god-mode-input-row">
          <Input
            id="god-mode-run-id"
            name="run_id"
            placeholder="Paste run_id..."
            value={runId}
            onChange={(e) => setRunId(e.target.value)}
            aria-label="Run ID"
          />
          <Button variant="default" onClick={handleApprove} disabled={!runId.trim() || !hasMutationRole || manualApproving}>
            {manualApproving ? "Approving..." : "Approve"}
          </Button>
        </div>
      </div>
      {status && (
        <div
          className={`god-mode-status ${statusTone === "error" ? "is-error" : statusTone === "info" ? "is-info" : ""}`}
          role="status"
          aria-live="polite"
          data-testid="god-mode-status"
        >
          {status}
        </div>
      )}

      {confirmTarget && (
        <div className="god-mode-confirm-overlay" role="dialog" aria-modal="true" aria-labelledby="god-mode-confirm-title">
          <div className="god-mode-confirm-card" ref={confirmDialogRef} tabIndex={-1}>
            <h3 id="god-mode-confirm-title">Confirm approval</h3>
            <p>
              Approve <code className="mono">{confirmTarget}</code> to continue execution? This action writes to the event log and cannot be undone.
            </p>
            <div className="god-mode-confirm-actions">
              <Button variant="ghost" ref={confirmCancelButtonRef} onClick={cancelConfirm}>Cancel</Button>
              <Button variant="default" onClick={confirmApproveItem}>Confirm approval</Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
