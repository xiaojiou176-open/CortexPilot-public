import type { RefObject } from "react";
import PmStageContextPanel from "../../../components/pm/PmStageContextPanel";
import { statusVariant } from "../../../lib/statusPresentation";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Input, Select, Textarea } from "../../../components/ui/input";
import type { BrowserPreset, ChainNode, NewsDigestTimeRange, PMTaskTemplate } from "./PMIntakeFeature.shared";

type PmJourneyContext = Parameters<typeof PmStageContextPanel>[0]["context"];

type Props = {
  pmJourneyContext: PmJourneyContext;
  runId: string;
  intakeId: string;
  liveRole: string;
  currentSessionStatus: string;
  chainNodes: ChainNode[];
  hoveredChainRole: ChainNode["role"] | null;
  onHoveredChainRoleChange: (role: ChainNode["role"] | null) => void;
  progressFeed: string[];
  questions: string[];
  taskTemplate?: PMTaskTemplate;
  onTaskTemplateChange?: (value: PMTaskTemplate) => void;
  newsDigestTopic?: string;
  onNewsDigestTopicChange?: (value: string) => void;
  newsDigestSources?: string;
  onNewsDigestSourcesChange?: (value: string) => void;
  newsDigestTimeRange?: NewsDigestTimeRange;
  onNewsDigestTimeRangeChange?: (value: NewsDigestTimeRange) => void;
  newsDigestMaxResults?: string;
  onNewsDigestMaxResultsChange?: (value: string) => void;
  pageBriefUrl?: string;
  onPageBriefUrlChange?: (value: string) => void;
  pageBriefFocus?: string;
  onPageBriefFocusChange?: (value: string) => void;
  requesterRole: string;
  onRequesterRoleChange: (value: string) => void;
  browserPreset: BrowserPreset;
  onBrowserPresetChange: (value: BrowserPreset) => void;
  canUseCustomPreset: boolean;
  customBrowserPolicy: string;
  onCustomBrowserPolicyChange: (value: string) => void;
  error: string;
  objective: string;
  onObjectiveChange: (value: string) => void;
  allowedPaths: string;
  onAllowedPathsChange: (value: string) => void;
  constraints: string;
  onConstraintsChange: (value: string) => void;
  searchQueries: string;
  onSearchQueriesChange: (value: string) => void;
  chatFlowBusy: boolean;
  onCreate: () => void;
  onAnswer: () => void;
  onRun: () => void;
  hasIntakeId: boolean;
  plan: unknown;
  taskChain: unknown;
  chainPanelRef: RefObject<HTMLElement | null>;
};

export default function PMIntakeRightSidebar(props: Props) {
  const {
    pmJourneyContext,
    runId,
    intakeId,
    liveRole,
    currentSessionStatus,
    chainNodes,
    hoveredChainRole,
    onHoveredChainRoleChange,
    progressFeed,
    questions,
    taskTemplate = "general",
    onTaskTemplateChange = () => {},
    newsDigestTopic = "",
    onNewsDigestTopicChange = () => {},
    newsDigestSources = "",
    onNewsDigestSourcesChange = () => {},
    newsDigestTimeRange = "24h",
    onNewsDigestTimeRangeChange = () => {},
    newsDigestMaxResults = "5",
    onNewsDigestMaxResultsChange = () => {},
    pageBriefUrl = "",
    onPageBriefUrlChange = () => {},
    pageBriefFocus = "",
    onPageBriefFocusChange = () => {},
    requesterRole,
    onRequesterRoleChange,
    browserPreset,
    onBrowserPresetChange,
    canUseCustomPreset,
    customBrowserPolicy,
    onCustomBrowserPolicyChange,
    error,
    objective,
    onObjectiveChange,
    allowedPaths,
    onAllowedPathsChange,
    constraints,
    onConstraintsChange,
    searchQueries,
    onSearchQueriesChange,
    chatFlowBusy,
    onCreate,
    onAnswer,
    onRun,
    hasIntakeId,
    plan,
    taskChain,
    chainPanelRef,
  } = props;

  return (
    <aside className="pm-claude-right" aria-label="Context sidebar">
      <PmStageContextPanel
        context={pmJourneyContext}
        runId={runId}
        intakeId={intakeId}
        liveRole={liveRole}
        sessionStatus={currentSessionStatus}
      />

      <section className="pm-chain-card" ref={chainPanelRef} tabIndex={-1} aria-label="Command Chain panel">
        <h2 className="pm-section-title">Command Chain</h2>
        <div className="pm-chain-flow" role="list" aria-label="Agent workflow">
          {chainNodes.map((node, index) => {
            const next = chainNodes[index + 1];
            const edgeState =
              node.state === "done" && (next?.state === "done" || next?.state === "active")
                ? "done"
                : node.state === "active"
                  ? "active"
                  : "idle";
            return (
              <div key={node.role} className="pm-chain-step" role="listitem">
                <Button
                  variant="unstyled"
                  className={`pm-chain-node is-${node.state}${hoveredChainRole === node.role ? " is-linked" : ""}${hoveredChainRole && hoveredChainRole !== node.role ? " is-dimmed" : ""}`}
                  aria-pressed={hoveredChainRole === node.role}
                  onMouseEnter={() => onHoveredChainRoleChange(node.role)}
                  onMouseLeave={() => onHoveredChainRoleChange(null)}
                  onFocus={() => onHoveredChainRoleChange(node.role)}
                  onBlur={() => onHoveredChainRoleChange(null)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onHoveredChainRoleChange(node.role);
                    }
                    if (event.key === "Escape") {
                      onHoveredChainRoleChange(null);
                    }
                  }}
                >
                  <div className="pm-chain-node-head">
                    <strong>{node.label}</strong>
                    <span>{node.state === "active" ? "Running" : node.state === "done" ? "Done" : "Idle"}</span>
                  </div>
                  <p>{node.hint}</p>
                </Button>
                {index < chainNodes.length - 1 && <div className={`pm-chain-edge is-${edgeState}`} aria-hidden="true" />}
              </div>
            );
          })}
        </div>

        {progressFeed.length > 0 && (
          <div className="pm-progress-feed" aria-label="Progress feed">
            <h3>Progress</h3>
            <ul className="pm-question-list">
              {progressFeed.map((line, index) => (
                <li key={`${line}-${index}`}>{line}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="pm-chain-card pm-runtime-card">
        <h2 className="pm-section-title">Runtime</h2>
        <div className="pm-runtime-grid">
          <div className="pm-runtime-row">
            <span className="pm-runtime-key">session</span>
            <code className="pm-runtime-val">{intakeId || "-"}</code>
          </div>
          <div className="pm-runtime-row">
            <span className="pm-runtime-key">run_id</span>
            <code className="pm-runtime-val">{runId || "-"}</code>
          </div>
          <div className="pm-runtime-row">
            <span className="pm-runtime-key">active</span>
            <code className="pm-runtime-val">{liveRole || "-"}</code>
          </div>
          <div className="pm-runtime-row">
            <span className="pm-runtime-key">status</span>
            <Badge variant={statusVariant(currentSessionStatus)}>
              {currentSessionStatus || "-"}
            </Badge>
          </div>
        </div>
      </section>

      {questions.length > 0 && (
        <section className="pm-chain-card">
          <h2 className="pm-section-title">Clarifiers</h2>
          <ul className="pm-question-list">
            {questions.map((q, i) => <li key={`${q}-${i}`}>{q}</li>)}
          </ul>
        </section>
      )}

      <section className="pm-chain-card">
        <h2 className="pm-section-title">Public task templates</h2>
        <div className="pm-settings-grid">
          <label className="pm-field">
            <span className="pm-field-label">Template</span>
            <Select
              value={taskTemplate}
              onChange={(event) => onTaskTemplateChange(event.target.value as PMTaskTemplate)}
              className="pm-input"
              aria-label="Public task template"
            >
              <option value="news_digest">news_digest</option>
              <option value="topic_brief">topic_brief</option>
              <option value="page_brief">page_brief</option>
              <option value="general">general</option>
            </Select>
          </label>
          {taskTemplate === "news_digest" || taskTemplate === "topic_brief" ? (
            <>
              <label className="pm-field">
                <span className="pm-field-label">Topic</span>
                <Input
                  variant="unstyled"
                  value={newsDigestTopic}
                  onChange={(event) => onNewsDigestTopicChange(event.target.value)}
                  className="pm-input"
                  aria-label="news digest topic"
                  placeholder="e.g. Seattle tech and AI"
                />
              </label>
              <label className="pm-field">
                <span className="pm-field-label">Time Range</span>
                <Select
                  value={newsDigestTimeRange}
                  onChange={(event) => onNewsDigestTimeRangeChange(event.target.value as NewsDigestTimeRange)}
                  className="pm-input"
                  aria-label="news digest time range"
                >
                  <option value="24h">24h</option>
                  <option value="7d">7d</option>
                  <option value="30d">30d</option>
                </Select>
              </label>
              <label className="pm-field">
                <span className="pm-field-label">Max Results</span>
                <Input
                  variant="unstyled"
                  type="number"
                  min={1}
                  max={10}
                  value={newsDigestMaxResults}
                  onChange={(event) => onNewsDigestMaxResultsChange(event.target.value)}
                  className="pm-input"
                  aria-label="news digest max results"
                />
              </label>
              {taskTemplate === "news_digest" ? (
                <label className="pm-field">
                  <span className="pm-field-label">Sources</span>
                  <Textarea
                    variant="unstyled"
                    value={newsDigestSources}
                    onChange={(event) => onNewsDigestSourcesChange(event.target.value)}
                    rows={4}
                    className="pm-input pm-input-multiline"
                    aria-label="news digest sources"
                    placeholder={"One source per line, e.g.\ntheverge.com\ntechcrunch.com"}
                  />
                </label>
              ) : null}
            </>
          ) : null}
          {taskTemplate === "page_brief" ? (
            <>
              <label className="pm-field">
                <span className="pm-field-label">URL</span>
                <Input
                  variant="unstyled"
                  value={pageBriefUrl}
                  onChange={(event) => onPageBriefUrlChange(event.target.value)}
                  className="pm-input"
                  aria-label="page brief url"
                  placeholder="https://example.com"
                />
              </label>
              <label className="pm-field">
                <span className="pm-field-label">Focus</span>
                <Textarea
                  variant="unstyled"
                  value={pageBriefFocus}
                  onChange={(event) => onPageBriefFocusChange(event.target.value)}
                  rows={3}
                  className="pm-input pm-input-multiline"
                  aria-label="page brief focus"
                  placeholder="Summarize the page for a first-time reader."
                />
              </label>
            </>
          ) : null}
        </div>
        <p className="muted">
          Public paths default to public, read-only, no-login sources. Advanced browser policy stays in the operator area instead of the default entrypoint.
        </p>
      </section>

      <details className="pm-chain-card">
        <summary className="pm-details-summary">Advanced / Operator parameters</summary>
        <div className="pm-settings-grid">
          <label className="pm-field">
            <span className="pm-field-label">Requester role</span>
            <Select value={requesterRole} onChange={(event) => onRequesterRoleChange(event.target.value)} className="pm-input" aria-label="Requester role">
              <option value="PM">PM</option>
              <option value="TECH_LEAD">TECH_LEAD</option>
              <option value="WORKER">WORKER</option>
              <option value="REVIEWER">REVIEWER</option>
              <option value="TESTER">TESTER</option>
              <option value="OPS">OPS</option>
              <option value="OWNER">OWNER</option>
              <option value="ARCHITECT">ARCHITECT</option>
            </Select>
          </label>
          <label className="pm-field">
            <span className="pm-field-label">Browser preset</span>
            <Select
              value={browserPreset}
              onChange={(event) => onBrowserPresetChange(event.target.value as BrowserPreset)}
              className="pm-input"
              aria-label="Browser preset"
            >
              <option value="safe">safe</option>
              <option value="balanced">balanced</option>
              <option value="aggressive">aggressive</option>
              <option value="custom" disabled={!canUseCustomPreset}>custom</option>
            </Select>
          </label>
        </div>
        {browserPreset === "custom" && (
          <Textarea
            variant="unstyled"
            value={customBrowserPolicy}
            onChange={(event) => onCustomBrowserPolicyChange(event.target.value)}
            rows={5}
            className="pm-input pm-input-multiline pm-code-input"
            aria-label="Custom browser policy JSON"
          />
        )}
      </details>

      <details className="pm-chain-card">
        <summary className="pm-details-summary">Advanced parameters</summary>
        {error && <p className="alert alert-danger" role="alert">{error}</p>}
        <div className="pm-settings-grid">
          <label className="pm-field">
            <span className="pm-field-label">Objective</span>
            <Textarea variant="unstyled" value={objective} onChange={(event) => onObjectiveChange(event.target.value)} rows={2} className="pm-input pm-input-multiline" />
          </label>
          <label className="pm-field">
            <span className="pm-field-label">Allowed paths</span>
            <Textarea variant="unstyled" value={allowedPaths} onChange={(event) => onAllowedPathsChange(event.target.value)} rows={2} className="pm-input pm-input-multiline" />
          </label>
          <label className="pm-field">
            <span className="pm-field-label">Constraints / preferences</span>
            <Textarea variant="unstyled" value={constraints} onChange={(event) => onConstraintsChange(event.target.value)} rows={2} className="pm-input pm-input-multiline" />
          </label>
          <label className="pm-field">
            <span className="pm-field-label">Search queries</span>
            <Textarea variant="unstyled" value={searchQueries} onChange={(event) => onSearchQueriesChange(event.target.value)} rows={2} className="pm-input pm-input-multiline" />
          </label>
        </div>
        <div className="pm-actions">
          <Button variant="ghost" disabled={chatFlowBusy} onClick={() => onCreate()}>
            Generate questions
          </Button>
          <Button variant="ghost" disabled={chatFlowBusy || !hasIntakeId} onClick={() => onAnswer()}>
            Generate plan
          </Button>
          <Button variant="default" disabled={chatFlowBusy || !hasIntakeId} onClick={() => onRun()}>
            Start execution
          </Button>
        </div>
        {plan && <pre className="mono pm-code-block">{JSON.stringify(plan, null, 2)}</pre>}
        {taskChain && <pre className="mono pm-code-block">{JSON.stringify(taskChain, null, 2)}</pre>}
      </details>
    </aside>
  );
}
