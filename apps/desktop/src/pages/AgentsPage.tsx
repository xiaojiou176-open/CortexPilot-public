import { useCallback, useEffect, useState } from "react";
import type { JsonValue } from "../lib/types";
import { fetchAgents, fetchAgentStatus } from "../lib/api";
import { statusLabelZh, badgeClass } from "../lib/statusPresentation";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";

export function AgentsPage() {
  const [agents, setAgents] = useState<Record<string, JsonValue>>({});
  const [agentStatus, setAgentStatus] = useState<Record<string, JsonValue>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [a, s] = await Promise.all([fetchAgents(), fetchAgentStatus()]);
      setAgents(a || {}); setAgentStatus(s || {});
    } catch (err) { setError(err instanceof Error ? err.message : String(err)); } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const registry = Array.isArray(agents.agents) ? agents.agents as Array<Record<string, JsonValue>> : [];
  const machines = Array.isArray(agentStatus.machines) ? agentStatus.machines as Array<Record<string, JsonValue>> : [];

  return (
    <div className="content">
      <div className="section-header"><div><h1 className="page-title">Agents</h1><p className="page-subtitle">Registered agents, active state machines, and runtime information</p></div><Button onClick={load} disabled={loading}>{loading ? "Refreshing..." : "Refresh"}</Button></div>
      {error && <div className="alert alert-danger" role="alert" aria-live="assertive">{error}</div>}
      {loading ? <div className="skeleton-stack-lg"><div className="skeleton skeleton-card-tall" /><div className="skeleton skeleton-card-tall" /></div> : (
        <div className="grid">
          {machines.length > 0 && (
            <div className="app-section"><h2 className="section-title">Active State Machines</h2>
              <Card className="table-card"><table className="run-table"><thead><tr><th>Agent ID</th><th>Role</th><th>Status</th><th>Run ID</th></tr></thead>
                <tbody>{machines.map((m, i) => (
                  <tr key={i}><td className="mono">{String(m.agent_id || "-")}</td><td>{String(m.role || "-")}</td><td><Badge className={badgeClass(String(m.status || ""))}>{statusLabelZh(String(m.status || ""))}</Badge></td><td className="mono">{String(m.run_id || "-").slice(0, 12)}</td></tr>
                ))}</tbody></table></Card>
            </div>
          )}
          <div className="app-section"><h2 className="section-title">Registered Agents ({registry.length})</h2>
            {registry.length === 0 ? <div className="empty-state-stack"><p className="muted">No agents are registered yet</p></div> : (
              <Card className="table-card"><table className="run-table"><thead><tr><th>Agent ID</th><th>Role</th><th>Type</th></tr></thead>
                <tbody>{registry.map((a, i) => (
                  <tr key={i}><td className="mono">{String(a.agent_id || "-")}</td><td>{String(a.role || "-")}</td><td className="muted">{String(a.type || "-")}</td></tr>
                ))}</tbody></table></Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
