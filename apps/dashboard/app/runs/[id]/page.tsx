import RunDetail from "../../../components/RunDetail";
import { Badge } from "../../../components/ui/badge";
import { Card } from "../../../components/ui/card";
import ControlPlaneStatusCallout from "../../../components/control-plane/ControlPlaneStatusCallout";
import OperatorCopilotPanel from "../../../components/control-plane/OperatorCopilotPanel";
import { fetchRun, fetchEvents, fetchDiff, fetchReports } from "../../../lib/api";
import { safeLoad } from "../../../lib/serverPageData";
import Link from "next/link";

type RunDetailPageParams = {
  id: string;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export default async function RunDetailPage({
  params,
}: {
  params: Promise<RunDetailPageParams>;
}) {
  const { id } = await params;
  const { data: run, warning: runWarning } = await safeLoad(() => fetchRun(id), { run_id: id, status: "UNKNOWN" } as any, "Run detail");
  const { data: events, warning: eventsWarning } = await safeLoad(() => fetchEvents(id), [] as any[], "Run events");
  const { data: diffResp, warning: diffWarning } = await safeLoad(() => fetchDiff(id), { diff: "" }, "Code diff");
  const { data: reports, warning: reportsWarning } = await safeLoad(() => fetchReports(id), [] as any[], "Run reports");
  const warning = runWarning || eventsWarning || diffWarning || reportsWarning;
  const diff = diffResp?.diff || "";
  const reportList = Array.isArray(reports) ? reports : [];
  const incidentPack = asRecord(reportList.find((item) => item?.name === "incident_pack.json")?.data);
  const proofPack = asRecord(reportList.find((item) => item?.name === "proof_pack.json")?.data);
  const compareSummary = asRecord(asRecord(reportList.find((item) => item?.name === "run_compare_report.json")?.data).compare_summary);
  const hasCompareSummary = Object.keys(compareSummary).length > 0;
  const compareDeltaCount =
    asNumber(compareSummary.mismatched_count) +
    asNumber(compareSummary.missing_count) +
    asNumber(compareSummary.extra_count) +
    asNumber(compareSummary.failed_report_checks_count);
  return (
    <main className="grid" aria-labelledby="run-detail-page-title">
      <section className="app-section">
        <div className="section-header">
          <div>
            <h1 id="run-detail-page-title" data-testid="run-detail-title">Run detail</h1>
            <p>Follow one run across status, event evidence, and replay comparison.</p>
          </div>
          <div className="toolbar">
            <Badge className="mono">{id}</Badge>
            <Link href={`/runs/${encodeURIComponent(id)}/compare`}>Open compare surface</Link>
          </div>
        </div>
        {warning ? (
          <ControlPlaneStatusCallout
            title="Run detail is partially degraded"
            summary={warning}
            nextAction="Retry this page first. If the same source is still unavailable, inspect the surviving Run Detail tabs and then return to the run list."
            tone="warning"
            badgeLabel="Partial data"
            actions={[
              { href: `/runs/${encodeURIComponent(id)}`, label: "Reload run detail" },
              { href: "/runs", label: "Back to run list" },
            ]}
          />
        ) : null}
        {(Object.keys(incidentPack).length > 0 || Object.keys(proofPack).length > 0 || hasCompareSummary) ? (
          <div className="grid grid-3">
            <Card>
              <h3>Compare decision</h3>
              <p className="muted">
                {!hasCompareSummary
                  ? "No structured compare report is attached yet."
                  : compareDeltaCount === 0
                  ? "Current run looks aligned with the selected baseline."
                  : "Compare found deltas that need operator review before you trust this run."}
              </p>
              <p className="mono">
                Next step: {!hasCompareSummary
                  ? "Generate or refresh a compare report for this run."
                  : compareDeltaCount === 0
                  ? "Review proof and finalize the outcome."
                  : "Open compare and decide whether to replay, investigate, or keep the run blocked."}
              </p>
            </Card>
            <Card>
              <h3>Incident action</h3>
              <p className="muted">{String(incidentPack.summary || "No incident pack is attached yet.")}</p>
              <p className="mono">Next step: {String(incidentPack.next_action || "Use reports and timeline to determine the next operator action.")}</p>
            </Card>
            <Card>
              <h3>Proof action</h3>
              <p className="muted">{String(proofPack.summary || "No proof pack is attached yet.")}</p>
              <p className="mono">Next step: {String(proofPack.next_action || "Inspect the run reports before promoting or sharing any result.")}</p>
            </Card>
          </div>
        ) : null}
        <OperatorCopilotPanel runId={id} />
        <RunDetail run={run} events={events} diff={diff} reports={reports} />
      </section>
    </main>
  );
}
