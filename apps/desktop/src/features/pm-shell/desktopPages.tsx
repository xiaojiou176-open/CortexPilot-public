import { lazy, type ReactElement } from "react";

export type DesktopPageKey =
  | "overview"
  | "pm"
  | "command-tower"
  | "ct-session-detail"
  | "runs"
  | "run-detail"
  | "run-compare"
  | "workflows"
  | "workflow-detail"
  | "events"
  | "contracts"
  | "reviews"
  | "tests"
  | "policies"
  | "agents"
  | "locks"
  | "worktrees"
  | "god-mode"
  | "search"
  | "change-gates";

export const PAGE_TITLES: Partial<Record<DesktopPageKey, string>> = {
  overview: "Task Overview",
  pm: "New Task",
  "command-tower": "Task Progress",
  "ct-session-detail": "Session View",
  runs: "Runs",
  "run-detail": "Run Detail",
  "run-compare": "Run Compare",
  workflows: "Workflow Cases",
  "workflow-detail": "Workflow Case Detail",
  events: "Event Stream",
  contracts: "Contracts",
  reviews: "Reviews",
  tests: "Tests",
  policies: "Policies",
  agents: "Agents",
  locks: "Locks",
  worktrees: "Worktrees",
  "god-mode": "Fast Approval",
  search: "Recent Results",
  "change-gates": "Change Gates",
};

const OverviewPage = lazy(async () => {
  const module = await import("../../pages/OverviewPage");
  return { default: module.OverviewPage };
});
const CommandTowerPage = lazy(async () => {
  const module = await import("../../pages/CommandTowerPage");
  return { default: module.CommandTowerPage };
});
const RunsPage = lazy(async () => {
  const module = await import("../../pages/RunsPage");
  return { default: module.RunsPage };
});
const RunDetailPage = lazy(async () => {
  const module = await import("../../pages/RunDetailPage");
  return { default: module.RunDetailPage };
});
const RunComparePage = lazy(async () => {
  const module = await import("../../pages/RunComparePage");
  return { default: module.RunComparePage };
});
const WorkflowsPage = lazy(async () => {
  const module = await import("../../pages/WorkflowsPage");
  return { default: module.WorkflowsPage };
});
const WorkflowDetailPage = lazy(async () => {
  const module = await import("../../pages/WorkflowDetailPage");
  return { default: module.WorkflowDetailPage };
});
const EventsPage = lazy(async () => {
  const module = await import("../../pages/EventsPage");
  return { default: module.EventsPage };
});
const ContractsPage = lazy(async () => {
  const module = await import("../../pages/ContractsPage");
  return { default: module.ContractsPage };
});
const ReviewsPage = lazy(async () => {
  const module = await import("../../pages/ReviewsPage");
  return { default: module.ReviewsPage };
});
const TestsPage = lazy(async () => {
  const module = await import("../../pages/TestsPage");
  return { default: module.TestsPage };
});
const PoliciesPage = lazy(async () => {
  const module = await import("../../pages/PoliciesPage");
  return { default: module.PoliciesPage };
});
const AgentsPage = lazy(async () => {
  const module = await import("../../pages/AgentsPage");
  return { default: module.AgentsPage };
});
const LocksPage = lazy(async () => {
  const module = await import("../../pages/LocksPage");
  return { default: module.LocksPage };
});
const WorktreesPage = lazy(async () => {
  const module = await import("../../pages/WorktreesPage");
  return { default: module.WorktreesPage };
});
const GodModePage = lazy(async () => {
  const module = await import("../../pages/GodModePage");
  return { default: module.GodModePage };
});
const SearchPage = lazy(async () => {
  const module = await import("../../pages/SearchPage");
  return { default: module.SearchPage };
});
const ChangeGatesPage = lazy(async () => {
  const module = await import("../../pages/ChangeGatesPage");
  return { default: module.ChangeGatesPage };
});
const CTSessionDetailPage = lazy(async () => {
  const module = await import("../../pages/CTSessionDetailPage");
  return { default: module.CTSessionDetailPage };
});

type RenderDesktopPageArgs = {
  activePage: DesktopPageKey;
  pmPageContent: ReactElement;
  detailRunId: string;
  detailWorkflowId: string;
  detailSessionId: string;
  navigate: (page: DesktopPageKey) => void;
  navigateToRun: (runId: string) => void;
  navigateToWorkflow: (workflowId: string) => void;
  navigateToSession: (sessionId: string) => void;
  setActivePage: (page: DesktopPageKey) => void;
};

export function renderDesktopPage({
  activePage,
  pmPageContent,
  detailRunId,
  detailWorkflowId,
  detailSessionId,
  navigate,
  navigateToRun,
  navigateToWorkflow,
  navigateToSession,
  setActivePage,
}: RenderDesktopPageArgs): ReactElement {
  switch (activePage) {
    case "overview":
      return <OverviewPage onNavigate={navigate} onNavigateToRun={navigateToRun} />;
    case "pm":
      return pmPageContent;
    case "command-tower":
      return <CommandTowerPage onNavigateToSession={navigateToSession} />;
    case "ct-session-detail":
      return <CTSessionDetailPage sessionId={detailSessionId} onBack={() => setActivePage("command-tower")} />;
    case "runs":
      return <RunsPage onNavigateToRun={navigateToRun} />;
    case "run-detail":
      return <RunDetailPage runId={detailRunId} onBack={() => setActivePage("runs")} onOpenCompare={() => setActivePage("run-compare")} />;
    case "run-compare":
      return <RunComparePage runId={detailRunId} onBack={() => setActivePage("run-detail")} />;
    case "workflows":
      return <WorkflowsPage onNavigateToWorkflow={navigateToWorkflow} />;
    case "workflow-detail":
      return (
        <WorkflowDetailPage
          workflowId={detailWorkflowId}
          onBack={() => setActivePage("workflows")}
          onNavigateToRun={navigateToRun}
        />
      );
    case "events":
      return <EventsPage />;
    case "contracts":
      return <ContractsPage />;
    case "reviews":
      return <ReviewsPage />;
    case "tests":
      return <TestsPage />;
    case "policies":
      return <PoliciesPage />;
    case "agents":
      return <AgentsPage />;
    case "locks":
      return <LocksPage />;
    case "worktrees":
      return <WorktreesPage />;
    case "god-mode":
      return <GodModePage />;
    case "search":
      return <SearchPage />;
    case "change-gates":
      return <ChangeGatesPage />;
    default:
      return <OverviewPage onNavigate={navigate} onNavigateToRun={navigateToRun} />;
  }
}
