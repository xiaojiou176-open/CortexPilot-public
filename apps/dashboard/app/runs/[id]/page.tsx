import RunDetail from "../../../components/RunDetail";
import { Badge } from "../../../components/ui/badge";
import { fetchRun, fetchEvents, fetchDiff, fetchReports } from "../../../lib/api";
import { safeLoad } from "../../../lib/serverPageData";

type RunDetailPageParams = {
  id: string;
};

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
  return (
    <main className="grid" aria-labelledby="run-detail-page-title">
      <section className="app-section">
        <div className="section-header">
          <div>
            <h1 id="run-detail-page-title" data-testid="run-detail-title">Run detail</h1>
            <p>Follow one run across status, event evidence, and replay comparison.</p>
          </div>
          <Badge className="mono">{id}</Badge>
        </div>
        {warning ? <p className="alert alert-warning" role="status">{warning}</p> : null}
        <RunDetail run={run} events={events} diff={diff} reports={reports} />
      </section>
    </main>
  );
}
