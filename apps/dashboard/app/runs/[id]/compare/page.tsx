import Link from "next/link";
import { Badge } from "../../../../components/ui/badge";
import { Card } from "../../../../components/ui/card";
import { fetchReports, fetchRun } from "../../../../lib/api";
import { safeLoad } from "../../../../lib/serverPageData";

type RunComparePageParams = {
  id: string;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export default async function RunComparePage({
  params,
}: {
  params: Promise<RunComparePageParams>;
}) {
  const { id } = await params;
  const { data: run } = await safeLoad(() => fetchRun(id), { run_id: id, status: "UNKNOWN" } as any, "Run detail");
  const { data: reports } = await safeLoad(() => fetchReports(id), [] as any[], "Run reports");
  const reportList = Array.isArray(reports) ? reports : [];
  const replayReport = asRecord(reportList.find((item) => item?.name === "replay_report.json")?.data);
  const runCompareReport = asRecord(reportList.find((item) => item?.name === "run_compare_report.json")?.data);
  const compareSummary = asRecord(runCompareReport.compare_summary);

  return (
    <main className="grid" aria-labelledby="run-compare-page-title">
      <section className="app-section">
        <div className="section-header">
          <div>
            <h1 id="run-compare-page-title">Run compare</h1>
            <p>Review the structured replay comparison without digging through the full Run Detail report stack.</p>
          </div>
          <div className="toolbar">
            <Badge className="mono">{id}</Badge>
            <Link href={`/runs/${encodeURIComponent(id)}`}>Back to run detail</Link>
          </div>
        </div>
        <div className="grid grid-2">
          <Card>
            <h3>Run compare report</h3>
            <pre className="mono">{JSON.stringify(runCompareReport, null, 2)}</pre>
          </Card>
          <Card>
            <h3>Compare summary</h3>
            <pre className="mono">{JSON.stringify(compareSummary, null, 2)}</pre>
          </Card>
          <Card>
            <h3>Replay report</h3>
            <pre className="mono">{JSON.stringify(replayReport, null, 2)}</pre>
          </Card>
          <Card>
            <h3>Run snapshot</h3>
            <pre className="mono">{JSON.stringify(run, null, 2)}</pre>
          </Card>
        </div>
      </section>
    </main>
  );
}
