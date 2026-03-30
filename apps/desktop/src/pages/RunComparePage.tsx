import { useCallback, useEffect, useState } from "react";
import { fetchReports, fetchRun } from "../lib/api";
import type { JsonValue, ReportRecord, RunDetailPayload } from "../lib/types";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/Card";

type Props = { runId: string; onBack: () => void };

function asRecord(value: unknown): Record<string, JsonValue> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, JsonValue>) : {};
}

export function RunComparePage({ runId, onBack }: Props) {
  const [run, setRun] = useState<RunDetailPayload | null>(null);
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [runPayload, reportPayload] = await Promise.all([fetchRun(runId), fetchReports(runId)]);
      setRun(runPayload);
      setReports(Array.isArray(reportPayload) ? reportPayload : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [runId]);

  useEffect(() => {
    void load();
  }, [load]);

  const replayReport = asRecord(reports.find((item) => item.name === "replay_report.json")?.data);
  const runCompareReport = asRecord(reports.find((item) => item.name === "run_compare_report.json")?.data);
  const compareSummary = asRecord(runCompareReport.compare_summary);

  if (loading) {
    return <div className="content"><div className="skeleton-stack-lg"><div className="skeleton skeleton-row" /></div></div>;
  }
  if (error) {
    return <div className="content"><div className="alert alert-danger">{error}</div><Button onClick={onBack}>Back</Button></div>;
  }

  return (
    <div className="content">
      <Button variant="ghost" className="mb-2" onClick={onBack}>Back to run detail</Button>
      <div className="section-header">
        <div><h1 className="page-title">Run Compare</h1><p className="page-subtitle">Structured replay comparison for one run and its selected baseline.</p></div>
        <Badge>{runId}</Badge>
      </div>
      <div className="grid-2">
        <Card>
          <CardHeader><CardTitle>Compare summary</CardTitle></CardHeader>
          <CardBody><pre>{JSON.stringify(compareSummary, null, 2)}</pre></CardBody>
        </Card>
        <Card>
          <CardHeader><CardTitle>Run compare report</CardTitle></CardHeader>
          <CardBody><pre>{JSON.stringify(runCompareReport, null, 2)}</pre></CardBody>
        </Card>
        <Card>
          <CardHeader><CardTitle>Replay report</CardTitle></CardHeader>
          <CardBody><pre>{JSON.stringify(replayReport, null, 2)}</pre></CardBody>
        </Card>
        <Card>
          <CardHeader><CardTitle>Run snapshot</CardTitle></CardHeader>
          <CardBody><pre>{JSON.stringify(run, null, 2)}</pre></CardBody>
        </Card>
      </div>
    </div>
  );
}
