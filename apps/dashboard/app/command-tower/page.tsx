import { Suspense } from "react";
import Link from "next/link";
import CommandTowerHomeLiveClient from "./CommandTowerHomeLiveClient";
import ControlPlaneStatusCallout from "../../components/control-plane/ControlPlaneStatusCallout";
import { fetchCommandTowerOverview, fetchPmSessions } from "../../lib/api";
import { safeLoad } from "../../lib/serverPageData";
import type { CommandTowerOverviewPayload, PmSessionSummary } from "../../lib/types";

async function CommandTowerHomeSection() {
  const fallbackOverview: CommandTowerOverviewPayload = {
    generated_at: new Date().toISOString(),
    total_sessions: 0,
    active_sessions: 0,
    failed_sessions: 0,
    blocked_sessions: 0,
    failed_ratio: 0,
    blocked_ratio: 0,
    failure_trend_30m: 0,
    top_blockers: [],
  };
  const fallbackSessions: PmSessionSummary[] = [];

  const settled = await Promise.allSettled([
    safeLoad(fetchCommandTowerOverview, fallbackOverview, "Command Tower overview"),
    safeLoad(() => fetchPmSessions({ limit: 40 }), fallbackSessions, "PM session list"),
  ]);

  const overviewResult =
    settled[0].status === "fulfilled"
      ? settled[0].value
      : { data: fallbackOverview, warning: "Command Tower overview is unavailable right now. Please try again later." };
  const sessionsResult =
    settled[1].status === "fulfilled"
      ? settled[1].value
      : { data: fallbackSessions, warning: "The PM session list is unavailable right now. Please try again later." };

  const overview = overviewResult.data;
  const sessions = sessionsResult.data;
  const overviewWarning = overviewResult.warning;
  const sessionsWarning = sessionsResult.warning;
  const warning = [overviewWarning, sessionsWarning].filter(Boolean).join(" ");
  const hasLiveData =
    (overview.total_sessions || 0) > 0 ||
    (overview.active_sessions || 0) > 0 ||
    (sessions?.length || 0) > 0;

  return (
    <>
      {warning && !hasLiveData ? (
        <ControlPlaneStatusCallout
          title="Command Tower live overview is unavailable"
          summary={warning}
          nextAction="Reload first. If live data is still missing, inspect runs for the latest verified state or start from PM to rebuild the active path."
          tone="warning"
          badgeLabel="Live data missing"
          actions={[
            { href: "/command-tower", label: "Reload Command Tower" },
            { href: "/runs", label: "View runs" },
            { href: "/pm", label: "Start from PM" },
          ]}
        />
      ) : null}
      {warning && hasLiveData ? (
        <ControlPlaneStatusCallout
          title="Command Tower is running with partial truth"
          summary={warning}
          nextAction="Use the visible overview as a partial snapshot only. Confirm runs or Workflow Cases directly before taking approval, rollback, or release decisions."
          tone="warning"
          badgeLabel="Partial context"
          actions={[
            { href: "/runs", label: "Open runs" },
            { href: "/workflows", label: "Open Workflow Cases" },
          ]}
        />
      ) : null}
      <section aria-label="Command Tower live overview" aria-describedby="command-tower-page-subtitle">
        <CommandTowerHomeLiveClient initialOverview={overview} initialSessions={sessions} />
      </section>
    </>
  );
}

function CommandTowerHomeSectionFallback() {
  return (
    <section aria-label="Command Tower live overview" aria-describedby="command-tower-page-subtitle" aria-busy="true">
      <p className="mono" role="status">Loading Command Tower live overview...</p>
    </section>
  );
}

export default function CommandTowerPage() {
  return (
    <main className="grid" aria-labelledby="command-tower-page-title" aria-describedby="command-tower-page-subtitle">
      <h1 id="command-tower-page-title" className="sr-only">
        Command Tower
      </h1>
      <p id="command-tower-page-subtitle" className="sr-only">
        Review risk and blockers first, then move into session handling.
      </p>
      <Suspense fallback={<CommandTowerHomeSectionFallback />}>
        <CommandTowerHomeSection />
      </Suspense>
    </main>
  );
}
