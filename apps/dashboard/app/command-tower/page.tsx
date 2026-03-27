import { Suspense } from "react";
import Link from "next/link";
import CommandTowerHomeLiveClient from "./CommandTowerHomeLiveClient";
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
        <div className="alert alert-warning" role="status" aria-live="polite">
          <p>Live overview is unavailable right now. Reload first; if it still fails, inspect runs or start a new task.</p>
          <div className="toolbar toolbar--mt" role="group" aria-label="Live overview fallback actions">
            <Link className="run-link" href="/command-tower">
              Reload Command Tower
            </Link>
            <Link className="run-link" href="/runs">
              View runs
            </Link>
            <Link className="run-link" href="/pm">
              Start from PM
            </Link>
          </div>
        </div>
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
