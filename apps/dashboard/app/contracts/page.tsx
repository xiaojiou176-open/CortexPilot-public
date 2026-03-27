import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { fetchContracts } from "../../lib/api";
import { safeLoad } from "../../lib/serverPageData";
import type { ContractRecord, RunContract } from "../../lib/types";

function resolveContractPayload(contract: ContractRecord): RunContract {
  const payload = contract.payload;
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    return payload;
  }
  return contract;
}

function summarizeToolPermissions(value: unknown): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [];
  }
  return Object.entries(value as Record<string, unknown>).map(([key, raw]) => `${key}: ${String(raw)}`);
}

const DEFAULT_CONTRACT_LIMIT = 10;

export default async function ContractsPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; limit?: string }>;
}) {
  const { data: contracts, warning } = await safeLoad(fetchContracts, [] as ContractRecord[], "Contract list");
  const resolvedSearchParams = (await searchParams) || {};
  const query = String(resolvedSearchParams.q || "").trim().toLowerCase();
  const limitRaw = Number.parseInt(String(resolvedSearchParams.limit || DEFAULT_CONTRACT_LIMIT), 10);
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : DEFAULT_CONTRACT_LIMIT;
  const filteredContracts = contracts.filter((contract) => {
    if (!query) return true;
    const payload = resolveContractPayload(contract);
    const allowedPaths = Array.isArray(payload.allowed_paths) ? payload.allowed_paths : [];
    return [contract._path, contract._source, payload.task_id, payload.run_id, ...allowedPaths.map((p) => String(p))]
      .map((value) => String(value || "").toLowerCase())
      .some((value) => value.includes(query));
  });
  const visibleContracts = filteredContracts.slice(0, limit);
  const canApplyFilter = Boolean(query);
  return (
    <main className="grid" aria-labelledby="contracts-page-title">
      <header className="app-section">
        <div className="section-header">
          <div>
            <h1 id="contracts-page-title" className="page-title">Contracts</h1>
            <p className="page-subtitle">Review task contracts, allowed paths, and tool-permission envelopes in one place.</p>
          </div>
          <Badge>{contracts.length} contracts</Badge>
        </div>
      </header>
      <section className="app-section" aria-label="Contract list">
        <Card>
          <form className="toolbar" method="get">
            <label className="diff-gate-filter-field">
              <span className="muted">Search</span>
              <Input type="search" name="q" defaultValue={query} placeholder="Filter by task_id / run_id / path" />
            </label>
            <input type="hidden" name="limit" value={String(limit)} />
            <Button type="submit" variant="secondary" disabled={!canApplyFilter}>Apply filter</Button>
          </form>
          <p className="mono muted">Showing {visibleContracts.length} / {filteredContracts.length} contracts. Default first-page limit: {DEFAULT_CONTRACT_LIMIT}.</p>
        </Card>
        {warning ? (
          <Card asChild variant="unstyled">
            <p className="alert alert-warning" role="status">{warning}</p>
          </Card>
        ) : null}
        {filteredContracts.length === 0 ? (
          <Card>
            <div className="empty-state-stack">
              <span className="muted">No contracts yet</span>
              <span className="mono muted">Contracts are generated automatically when work is assigned.</span>
            </div>
          </Card>
        ) : (
          <div className="grid-2">
            {visibleContracts.map((contract) => {
              const payload = resolveContractPayload(contract);
              const key = contract._path || payload.task_id || payload.run_id || JSON.stringify(payload).slice(0, 40);
              const allowedPaths = Array.isArray(payload.allowed_paths) ? payload.allowed_paths : [];
              const acceptanceTests = Array.isArray(payload.acceptance_tests) ? payload.acceptance_tests : [];
              const toolPermissions = payload.tool_permissions || {};
              const permissionSummary = summarizeToolPermissions(toolPermissions);
              return (
                <Card key={key} variant="detail">
                  <CardHeader>
                    <span className="card-header-title">{contract._path || payload.task_id || "Contract"}</span>
                    <Badge>{contract._source || "unknown"}</Badge>
                  </CardHeader>
                  <CardContent>
                    <div className="data-list">
                      {payload.task_id ? (
                        <div className="data-list-row">
                          <span className="data-list-label">Task ID</span>
                          <span className="data-list-value mono">{payload.task_id}</span>
                        </div>
                      ) : null}
                      <div className="data-list-row">
                        <span className="data-list-label">Allowed paths</span>
                        <span className="data-list-value">
                          {allowedPaths.length > 0 ? (
                            <span className="chip-list">
                              {allowedPaths.map((p) => (
                                <Badge key={String(p)} variant="unstyled" className="chip">{String(p)}</Badge>
                              ))}
                            </span>
                          ) : (
                            <span className="muted">Unrestricted</span>
                          )}
                        </span>
                      </div>
                      <div className="data-list-row">
                        <span className="data-list-label">Acceptance tests</span>
                        <span className="data-list-value">
                          {acceptanceTests.length > 0 ? (
                            <span className="chip-list">
                              {acceptanceTests.map((t, i) => (
                                <Badge key={i} variant="unstyled" className="chip">{typeof t === "string" ? t : JSON.stringify(t)}</Badge>
                              ))}
                            </span>
                          ) : (
                            <span className="muted">None</span>
                          )}
                        </span>
                      </div>
                      <div className="data-list-row">
                        <span className="data-list-label">Tool permissions</span>
                        <span className="data-list-value">
                          {permissionSummary.length > 0 ? (
                            <span className="chip-list">
                              {permissionSummary.map((entry) => (
                                <Badge key={entry} variant="unstyled" className="chip">{entry}</Badge>
                              ))}
                            </span>
                          ) : (
                            <span className="muted">Default</span>
                          )}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                  <details className="collapsible">
                    <summary>Full contract JSON</summary>
                    <div className="collapsible-body">
                      <pre className="mono">{JSON.stringify(payload, null, 2)}</pre>
                    </div>
                  </details>
                </Card>
              );
            })}
          </div>
        )}
        {filteredContracts.length > limit ? (
          <Card>
            <p className="mono muted">{filteredContracts.length - limit} more contracts are hidden.</p>
            <div className="toolbar mt-2">
              <Button asChild variant="secondary">
                <a href={`/contracts?${new URLSearchParams({ q: query, limit: String(filteredContracts.length) }).toString()}`}>Show all</a>
              </Button>
            </div>
          </Card>
        ) : null}
      </section>
    </main>
  );
}
