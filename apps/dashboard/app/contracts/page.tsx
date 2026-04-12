import { cookies } from "next/headers";
import { getUiCopy } from "@cortexpilot/frontend-shared/uiCopy";
import { normalizeUiLocale, UI_LOCALE_STORAGE_KEY } from "@cortexpilot/frontend-shared/uiLocale";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { fetchContracts } from "../../lib/api";
import { safeLoad } from "../../lib/serverPageData";
import type { ContractRecord } from "../../lib/types";
import {
  formatBindingReadModelLabel,
  formatRoleBindingRuntimeCapabilitySummary,
  formatRoleBindingRuntimeSummary,
} from "../../lib/types";

function summarizeToolPermissions(value: unknown): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [];
  }
  return Object.entries(value as Record<string, unknown>).map(([key, raw]) => `${key}: ${String(raw)}`);
}

const DEFAULT_CONTRACT_LIMIT = 10;

async function resolveDashboardLocale() {
  try {
    const cookieStore = await cookies();
    return normalizeUiLocale(cookieStore.get(UI_LOCALE_STORAGE_KEY)?.value);
  } catch {
    return normalizeUiLocale(undefined);
  }
}

export default async function ContractsPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; limit?: string }>;
}) {
  const locale = await resolveDashboardLocale();
  const contractsPageCopy = getUiCopy(locale).dashboard.contractsPage;
  const { data: contracts, warning } = await safeLoad(fetchContracts, [] as ContractRecord[], "Contract list");
  const resolvedSearchParams = (await searchParams) || {};
  const query = String(resolvedSearchParams.q || "").trim().toLowerCase();
  const limitRaw = Number.parseInt(String(resolvedSearchParams.limit || DEFAULT_CONTRACT_LIMIT), 10);
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : DEFAULT_CONTRACT_LIMIT;
  const filteredContracts = contracts.filter((contract) => {
    if (!query) return true;
    const allowedPaths = Array.isArray(contract.allowed_paths) ? contract.allowed_paths : [];
    return [contract.path, contract.source, contract.task_id, contract.run_id, contract.assigned_role, ...allowedPaths.map((p) => String(p))]
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
            <h1 id="contracts-page-title" className="page-title">{contractsPageCopy.title}</h1>
            <p className="page-subtitle">{contractsPageCopy.subtitle}</p>
          </div>
          <Badge>{contractsPageCopy.countsBadge(contracts.length)}</Badge>
        </div>
      </header>
      <section className="app-section" aria-label="Contract list">
        <Card>
          <form className="toolbar" method="get">
            <label className="diff-gate-filter-field">
              <span className="muted">{contractsPageCopy.searchLabel}</span>
              <Input type="search" name="q" defaultValue={query} placeholder={contractsPageCopy.searchPlaceholder} />
            </label>
            <input type="hidden" name="limit" value={String(limit)} />
            <Button type="submit" variant="secondary" disabled={!canApplyFilter}>{contractsPageCopy.applyFilter}</Button>
          </form>
          <p className="mono muted">
            {contractsPageCopy.filterSummary(visibleContracts.length, filteredContracts.length, DEFAULT_CONTRACT_LIMIT)}
          </p>
        </Card>
        {warning ? (
          <Card asChild variant="unstyled">
            <div className="alert alert-warning" role="status">
              <p>{contractsPageCopy.warningTitle}</p>
              <p className="mono">{contractsPageCopy.warningNextStep}</p>
              <p className="mono">{warning}</p>
            </div>
          </Card>
        ) : null}
        {filteredContracts.length === 0 ? (
          <Card>
            <div className="empty-state-stack">
              <span className="muted">{contractsPageCopy.emptyTitle}</span>
              <span className="mono muted">{contractsPageCopy.emptyHint}</span>
            </div>
          </Card>
        ) : (
          <div className="grid-2">
            {visibleContracts.map((contract) => {
              const payload = contract.payload || {};
              const key = contract.path || contract.task_id || contract.run_id || JSON.stringify(payload).slice(0, 40);
              const allowedPaths = Array.isArray(contract.allowed_paths) ? contract.allowed_paths : [];
              const acceptanceTests = Array.isArray(contract.acceptance_tests) ? contract.acceptance_tests : [];
              const toolPermissions = contract.tool_permissions || {};
              const permissionSummary = summarizeToolPermissions(toolPermissions);
              const roleBinding = contract.role_binding_read_model;
              return (
                <Card key={key} variant="detail">
                  <CardHeader>
                    <span className="card-header-title">
                      {contract.path || contract.task_id || contractsPageCopy.fallbackValues.unknownContract}
                    </span>
                    <Badge>{contract.source || contractsPageCopy.fallbackValues.unknownSource}</Badge>
                  </CardHeader>
                  <CardContent>
                    <div className="data-list">
                      {contract.task_id ? (
                        <div className="data-list-row">
                          <span className="data-list-label">{contractsPageCopy.fieldLabels.taskId}</span>
                          <span className="data-list-value mono">{contract.task_id}</span>
                        </div>
                      ) : null}
                      {contract.run_id ? (
                        <div className="data-list-row">
                          <span className="data-list-label">{contractsPageCopy.fieldLabels.runId}</span>
                          <span className="data-list-value mono">{contract.run_id}</span>
                        </div>
                      ) : null}
                      <div className="data-list-row">
                        <span className="data-list-label">{contractsPageCopy.fieldLabels.assignedRole}</span>
                        <span className="data-list-value">
                          {contract.assigned_role || contractsPageCopy.fallbackValues.notAssigned}
                        </span>
                      </div>
                      <div className="data-list-row">
                        <span className="data-list-label">{contractsPageCopy.fieldLabels.executionAuthority}</span>
                        <span className="data-list-value">
                          {contract.execution_authority ? (
                            <Badge variant="running">{contract.execution_authority}</Badge>
                          ) : (
                            <span className="muted">{contractsPageCopy.fallbackValues.notPublished}</span>
                          )}
                        </span>
                      </div>
                      <div className="data-list-row">
                        <span className="data-list-label">{contractsPageCopy.fieldLabels.skillsBundle}</span>
                        <span className="data-list-value mono muted">
                          {roleBinding
                            ? formatBindingReadModelLabel(roleBinding.skills_bundle_ref)
                            : contractsPageCopy.fallbackValues.notDerived}
                        </span>
                      </div>
                      <div className="data-list-row">
                        <span className="data-list-label">{contractsPageCopy.fieldLabels.mcpBundle}</span>
                        <span className="data-list-value mono muted">
                          {roleBinding
                            ? formatBindingReadModelLabel(roleBinding.mcp_bundle_ref)
                            : contractsPageCopy.fallbackValues.notDerived}
                        </span>
                      </div>
                      <div className="data-list-row">
                        <span className="data-list-label">{contractsPageCopy.fieldLabels.runtimeBinding}</span>
                        <span className="data-list-value mono muted">
                          {roleBinding
                            ? formatRoleBindingRuntimeSummary(roleBinding)
                            : contractsPageCopy.fallbackValues.notDerived}
                        </span>
                      </div>
                      <div className="data-list-row">
                        <span className="data-list-label">{contractsPageCopy.fieldLabels.runtimeCapability}</span>
                        <span className="data-list-value mono muted">
                          {roleBinding?.runtime_binding?.capability?.lane || contractsPageCopy.fallbackValues.notDerived}
                        </span>
                      </div>
                      <div className="data-list-row">
                        <span className="data-list-label">{contractsPageCopy.fieldLabels.toolExecution}</span>
                        <span className="data-list-value mono muted">
                          {roleBinding
                            ? formatRoleBindingRuntimeCapabilitySummary(roleBinding)
                            : contractsPageCopy.fallbackValues.notDerived}
                        </span>
                      </div>
                      <div className="data-list-row">
                        <span className="data-list-label">{contractsPageCopy.fieldLabels.allowedPaths}</span>
                        <span className="data-list-value">
                          {allowedPaths.length > 0 ? (
                            <span className="chip-list">
                              {allowedPaths.map((p) => (
                                <Badge key={String(p)} variant="unstyled" className="chip">{String(p)}</Badge>
                              ))}
                            </span>
                          ) : (
                            <span className="muted">{contractsPageCopy.fallbackValues.unrestricted}</span>
                          )}
                        </span>
                      </div>
                      <div className="data-list-row">
                        <span className="data-list-label">{contractsPageCopy.fieldLabels.acceptanceTests}</span>
                        <span className="data-list-value">
                          {acceptanceTests.length > 0 ? (
                            <span className="chip-list">
                              {acceptanceTests.map((t, i) => (
                                <Badge key={i} variant="unstyled" className="chip">{typeof t === "string" ? t : JSON.stringify(t)}</Badge>
                              ))}
                            </span>
                          ) : (
                            <span className="muted">{contractsPageCopy.fallbackValues.noAcceptanceTests}</span>
                          )}
                        </span>
                      </div>
                      <div className="data-list-row">
                        <span className="data-list-label">{contractsPageCopy.fieldLabels.toolPermissions}</span>
                        <span className="data-list-value">
                          {permissionSummary.length > 0 ? (
                            <span className="chip-list">
                              {permissionSummary.map((entry) => (
                                <Badge key={entry} variant="unstyled" className="chip">{entry}</Badge>
                              ))}
                            </span>
                          ) : (
                            <span className="muted">{contractsPageCopy.fallbackValues.defaultPermissions}</span>
                          )}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                  <details className="collapsible">
                    <summary>{contractsPageCopy.fullJsonSummary}</summary>
                    <div className="collapsible-body">
                      <pre className="mono">{JSON.stringify(payload || { raw_preview: contract.raw_preview }, null, 2)}</pre>
                    </div>
                  </details>
                </Card>
              );
            })}
          </div>
        )}
        {filteredContracts.length > limit ? (
          <Card>
            <p className="mono muted">{contractsPageCopy.moreHidden(filteredContracts.length - limit)}</p>
            <div className="toolbar mt-2">
              <Button asChild variant="secondary">
                <a href={`/contracts?${new URLSearchParams({ q: query, limit: String(filteredContracts.length) }).toString()}`}>
                  {contractsPageCopy.showAll}
                </a>
              </Button>
            </div>
          </Card>
        ) : null}
      </section>
    </main>
  );
}
