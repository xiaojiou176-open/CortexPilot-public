"use client";

import dynamic from "next/dynamic";

import type { CommandTowerOverviewPayload, PmSessionSummary } from "../../lib/types";

const CommandTowerHomeLive = dynamic(() => import("../../components/command-tower/CommandTowerHomeLive"), {
  ssr: false,
  loading: () => (
    <div className="compact-status-card" role="status" aria-live="polite">
      <p className="mono">Loading live console...</p>
    </div>
  ),
});

type CommandTowerHomeLiveClientProps = {
  initialOverview: CommandTowerOverviewPayload;
  initialSessions: PmSessionSummary[];
};

export default function CommandTowerHomeLiveClient({
  initialOverview,
  initialSessions,
}: CommandTowerHomeLiveClientProps) {
  return <CommandTowerHomeLive initialOverview={initialOverview} initialSessions={initialSessions} />;
}
