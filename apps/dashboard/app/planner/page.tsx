import { cookies } from "next/headers";
import type { Metadata } from "next";
import Link from "next/link";
import { normalizeUiLocale, UI_LOCALE_STORAGE_KEY } from "@cortexpilot/frontend-shared/uiLocale";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { fetchArtifact, fetchReports, fetchRun, fetchRuns } from "../../lib/api";
import { safeLoad } from "../../lib/serverPageData";
import type { JsonValue, ReportRecord, RunDetailPayload, RunSummary } from "../../lib/types";

export const metadata: Metadata = {
  title: "Planner desk | OpenVibeCoding",
  description:
    "Review wave plans, worker prompt contracts, wake-policy posture, and continuation governance from one planner-facing desk.",
};

type PlannerRow = {
  run: RunDetailPayload;
  wavePlan: Record<string, JsonValue> | null;
  workerContracts: Record<string, JsonValue>[];
  unblockTasks: Record<string, JsonValue>[];
  completionGovernance: Record<string, JsonValue> | null;
};

function asRecord(value: JsonValue | null | undefined): Record<string, JsonValue> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, JsonValue>) : null;
}

function asRecordArray(value: JsonValue | null | undefined): Record<string, JsonValue>[] {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, JsonValue> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    : [];
}

function artifactNames(run: RunDetailPayload): string[] {
  const artifacts = Array.isArray(run.manifest?.artifacts) ? run.manifest?.artifacts : [];
  return artifacts
    .map((item) => {
      const record = asRecord(item as JsonValue);
      const name = typeof record?.name === "string" ? record.name : typeof record?.path === "string" ? record.path : "";
      return String(name || "").trim();
    })
    .filter(Boolean);
}

async function resolveDashboardLocale() {
  try {
    const cookieStore = await cookies();
    return normalizeUiLocale(cookieStore.get(UI_LOCALE_STORAGE_KEY)?.value);
  } catch {
    return normalizeUiLocale(undefined);
  }
}

function plannerText(locale: "en" | "zh-CN") {
  if (locale === "zh-CN") {
    return {
      title: "规划桌",
      subtitle: "把 wave plan、worker prompt contracts、wake policy 和 continuation governance 摆到同一张桌上，不用再来回翻 Run 详情。",
      actions: {
        pm: "打开 PM 入口",
        workflows: "打开工作流案例",
        proof: "打开 Proof & Replay",
      },
      metrics: {
        runs: "带规划产物的 runs",
        workers: "可见 worker contracts",
        unblock: "可见 unblock tasks",
        wake: "挂了 wake policy 的 runs",
      },
      table: {
        run: "Run",
        objective: "Wave objective",
        workers: "Workers",
        continuation: "Continuation",
        next: "下一步",
      },
      empty: "当前还没有可见的规划产物。",
      note: "这张桌子仍然是 read-only planner surface，但它已经把规划对象从 PM 侧栏和 run 细节里拎出来，变成了一等入口。",
      openRun: "打开证明室",
      openWorkflow: "打开工作流案例",
      wakeLabel: "Wake policy",
      governanceLabel: "Governance verdict",
      unblockLabel: "Unblock tasks",
      contractsLabel: "Worker contracts",
    };
  }
  return {
    title: "Planner desk",
    subtitle:
      "Bring wave plans, worker prompt contracts, wake-policy posture, and continuation governance into one planner-facing desk instead of hiding them inside PM sidebars and run detail.",
    actions: {
      pm: "Open PM intake",
      workflows: "Open Workflow Cases",
      proof: "Open Proof & Replay",
    },
    metrics: {
      runs: "Runs with planning artifacts",
      workers: "Visible worker contracts",
      unblock: "Visible unblock tasks",
      wake: "Runs anchored to wake policy",
    },
    table: {
      run: "Run",
      objective: "Wave objective",
      workers: "Workers",
      continuation: "Continuation",
      next: "Next read",
    },
    empty: "No planning artifacts are visible yet.",
    note: "This is still a read-only planner surface, but it turns planning objects into a first-class desk instead of leaving them trapped in PM sidebars and run detail.",
    openRun: "Open run detail",
    openWorkflow: "Open Workflow Cases",
    wakeLabel: "Wake policy",
    governanceLabel: "Governance verdict",
    unblockLabel: "Unblock tasks",
    contractsLabel: "Worker contracts",
  };
}

async function loadPlannerRows(runs: RunSummary[]): Promise<PlannerRow[]> {
  const candidateRuns = runs.slice(0, 8);
  const rows = await Promise.all(
    candidateRuns.map(async (run) => {
      const runId = String(run.run_id || "").trim();
      if (!runId) {
        return null;
      }
      const runDetailResult = await safeLoad(
        () => fetchRun(runId),
        { run_id: runId, task_id: run.task_id, status: run.status } as RunDetailPayload,
        `Run detail ${runId}`,
      );
      const detailedRun = runDetailResult.data;
      const names = artifactNames(detailedRun);
      const hasWavePlan =
        names.includes("planning_wave_plan") || names.includes("artifacts/planning_wave_plan.json");
      const hasWorkerContracts =
        names.includes("planning_worker_prompt_contracts") ||
        names.includes("artifacts/planning_worker_prompt_contracts.json");
      const hasUnblockTasks =
        names.includes("planning_unblock_tasks") || names.includes("artifacts/planning_unblock_tasks.json");
      if (!(hasWavePlan || hasWorkerContracts || hasUnblockTasks)) {
        return null;
      }
      const [wavePlanResult, workerContractsResult, unblockTasksResult, reportsResult] = await Promise.all([
        hasWavePlan
          ? safeLoad(() => fetchArtifact(runId, "planning_wave_plan.json"), null, `Wave plan ${runId}`)
          : Promise.resolve({ data: null, warning: null }),
        hasWorkerContracts
          ? safeLoad(
              () => fetchArtifact(runId, "planning_worker_prompt_contracts.json"),
              null,
              `Worker contracts ${runId}`,
            )
          : Promise.resolve({ data: null, warning: null }),
        hasUnblockTasks
          ? safeLoad(() => fetchArtifact(runId, "planning_unblock_tasks.json"), null, `Unblock tasks ${runId}`)
          : Promise.resolve({ data: null, warning: null }),
        safeLoad(() => fetchReports(runId), [] as ReportRecord[], `Reports ${runId}`),
      ]);
      const completionGovernanceRecord = (reportsResult.data as ReportRecord[]).find(
        (report) => report.name === "completion_governance_report.json",
      );
      return {
        run: detailedRun,
        wavePlan: asRecord((wavePlanResult.data as { data?: JsonValue } | null)?.data),
        workerContracts: asRecordArray((workerContractsResult.data as { data?: JsonValue } | null)?.data),
        unblockTasks: asRecordArray((unblockTasksResult.data as { data?: JsonValue } | null)?.data),
        completionGovernance: asRecord(completionGovernanceRecord?.data as JsonValue | undefined),
      } satisfies PlannerRow;
    }),
  );
  return rows.filter((row): row is PlannerRow => row !== null);
}

export default async function PlannerPage() {
  const locale = await resolveDashboardLocale();
  const text = plannerText(locale);
  const { data: runs, warning } = await safeLoad(fetchRuns, [] as RunSummary[], "Run list");
  const rows = await loadPlannerRows(Array.isArray(runs) ? runs : []);
  const totalWorkerContracts = rows.reduce((sum, row) => sum + row.workerContracts.length, 0);
  const totalUnblockTasks = rows.reduce((sum, row) => sum + row.unblockTasks.length, 0);
  const wakeAnchoredRuns = rows.filter((row) => Boolean(row.wavePlan?.wake_policy_ref)).length;

  return (
    <main className="grid" aria-labelledby="planner-page-title">
      <header className="app-section">
        <div className="section-header">
          <div>
            <p className="cell-sub mono muted">OpenVibeCoding / planner desk</p>
            <h1 id="planner-page-title" className="page-title">{text.title}</h1>
            <p className="page-subtitle">{text.subtitle}</p>
          </div>
          <Badge>{rows.length} rows</Badge>
        </div>
        <div className="toolbar">
          <Button asChild>
            <Link href="/pm">{text.actions.pm}</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/workflows">{text.actions.workflows}</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/runs">{text.actions.proof}</Link>
          </Button>
        </div>
      </header>

      <section className="stats-grid" aria-label="Planner desk summary">
        <article className="metric-card">
          <p className="metric-label">{text.metrics.runs}</p>
          <p className="metric-value">{rows.length}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">{text.metrics.workers}</p>
          <p className="metric-value">{totalWorkerContracts}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">{text.metrics.unblock}</p>
          <p className="metric-value">{totalUnblockTasks}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">{text.metrics.wake}</p>
          <p className="metric-value">{wakeAnchoredRuns}</p>
        </article>
      </section>

      {warning ? (
        <Card variant="compact">
          <p className="mono muted">{warning}</p>
        </Card>
      ) : null}

      {rows.length === 0 ? (
        <Card>
          <div className="empty-state-stack">
            <span className="muted">{text.empty}</span>
            <span className="mono muted">{text.note}</span>
          </div>
        </Card>
      ) : (
        <Card variant="table">
          <table className="run-table">
            <thead>
              <tr>
                <th scope="col">{text.table.run}</th>
                <th scope="col">{text.table.objective}</th>
                <th scope="col">{text.table.workers}</th>
                <th scope="col">{text.table.continuation}</th>
                <th scope="col">{text.table.next}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const runId = String(row.run.run_id || "-");
                const objective = String(row.wavePlan?.objective || row.run.task_id || "-").trim() || "-";
                const workerCount = Number(row.wavePlan?.worker_count || row.workerContracts.length || 0);
                const continuationSummary = String(
                  row.completionGovernance?.continuation_decision &&
                    typeof row.completionGovernance.continuation_decision === "object" &&
                    !Array.isArray(row.completionGovernance.continuation_decision)
                    ? (row.completionGovernance.continuation_decision as Record<string, JsonValue>).selected_action || "-"
                    : "-",
                );
                return (
                  <tr key={runId}>
                    <th scope="row">
                      <div className="stack-gap-2">
                        <Link href={`/runs/${encodeURIComponent(runId)}`}>{runId}</Link>
                        <span className="mono muted">{String(row.run.workflow_status || row.run.status || "-")}</span>
                      </div>
                    </th>
                    <td>
                      <div className="stack-gap-2">
                        <span>{objective}</span>
                        <span className="mono muted">
                          {text.wakeLabel}: {String(row.wavePlan?.wake_policy_ref || "-")}
                        </span>
                        <span className="mono muted">
                          {text.governanceLabel}: {String(row.completionGovernance?.overall_verdict || "-")}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="stack-gap-2">
                        <Badge>{workerCount}</Badge>
                        <span className="mono muted">
                          {text.contractsLabel}: {row.workerContracts.length}
                        </span>
                        <span className="mono muted">
                          {text.unblockLabel}: {row.unblockTasks.length}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="mono muted">{continuationSummary}</span>
                    </td>
                    <td>
                      <div className="toolbar">
                        <Button asChild>
                          <Link href={`/runs/${encodeURIComponent(runId)}`}>{text.openRun}</Link>
                        </Button>
                        <Button asChild variant="secondary">
                          <Link href="/workflows">{text.openWorkflow}</Link>
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mono muted mt-4">{text.note}</p>
        </Card>
      )}
    </main>
  );
}
