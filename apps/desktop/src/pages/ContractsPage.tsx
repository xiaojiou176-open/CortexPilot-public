import { useCallback, useEffect, useState } from "react";
import type { ContractRecord } from "../lib/types";
import { fetchContracts } from "../lib/api";
import { Button } from "../components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/Card";

export function ContractsPage() {
  const [contracts, setContracts] = useState<ContractRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const data = await fetchContracts(); setContracts(Array.isArray(data) ? data : []); }
    catch (err) { setError(err instanceof Error ? err.message : String(err)); } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  return (
    <div className="content">
      <div className="section-header"><div><h1 className="page-title">Contracts</h1><p className="page-subtitle">Run contract settings: path constraints, acceptance tests, and tool permissions</p></div><Button onClick={load}>Refresh</Button></div>
      {error && <div className="alert alert-danger">{error}</div>}
      {loading ? <div className="skeleton-stack-lg"><div className="skeleton skeleton-row" /><div className="skeleton skeleton-row" /></div> : contracts.length === 0 ? <div className="empty-state-stack"><p className="muted">No contracts yet</p></div> : (
        <div className="grid-2">
          {contracts.map((c, i) => {
            const contract = c.payload || c;
            return (
              <Card key={`${contract.task_id || ""}-${i}`}>
                <CardHeader>
                  <CardTitle className="mono">{contract.task_id || "Unknown task"}</CardTitle>
                </CardHeader>
                <CardBody>
                  <div className="data-list">
                    {contract.run_id && <div className="data-list-row"><span className="data-list-label">Run ID</span><span className="data-list-value mono">{String(contract.run_id)}</span></div>}
                    {contract.allowed_paths && (
                      <div className="data-list-row"><span className="data-list-label">Allowed paths</span><span className="data-list-value"><div className="chip-list">{contract.allowed_paths.map((p) => <span key={p} className="chip">{p}</span>)}</div></span></div>
                    )}
                    {contract.acceptance_tests && (
                      <div className="data-list-row"><span className="data-list-label">Acceptance tests</span><span className="data-list-value"><div className="chip-list">{contract.acceptance_tests.map((t) => <span key={t} className="chip">{t}</span>)}</div></span></div>
                    )}
                    {contract.tool_permissions && (
                      <div className="data-list-row"><span className="data-list-label">Tool permissions</span><span className="data-list-value"><pre className="pre-reset">{JSON.stringify(contract.tool_permissions, null, 2)}</pre></span></div>
                    )}
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
