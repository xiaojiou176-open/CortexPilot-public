export type UiLocale = "en" | "zh-CN";

export const DEFAULT_UI_LOCALE: UiLocale = "en";

type DashboardNavLabels = {
  overview: string;
  pmIntake: string;
  commandTower: string;
  runs: string;
  quickApproval: string;
  search: string;
  agents: string;
  workflowCases: string;
  events: string;
  reviews: string;
  diffGate: string;
  tests: string;
  contracts: string;
  policies: string;
  locks: string;
  worktrees: string;
};

type DesktopLabels = {
  overview: string;
  pmIntake: string;
  commandTower: string;
  runs: string;
  runDetail: string;
  runCompare: string;
  workflowCases: string;
  workflowCaseDetail: string;
  quickApproval: string;
  search: string;
  events: string;
  contracts: string;
  reviews: string;
  tests: string;
  policies: string;
  agents: string;
  locks: string;
  worktrees: string;
  diffGate: string;
  sessionView: string;
};

type HomeCardCopy = {
  badge?: string;
  title: string;
  desc: string;
};

export type UiCopy = {
  brandTitle: string;
  brandSubtitle: string;
  dashboard: {
    homePhase2: {
      heroTitle: string;
      heroSubtitle: string;
      ecosystemTitle: string;
      ecosystemDescription: string;
      ecosystemAction: string;
      ecosystemCards: HomeCardCopy[];
      aiSurfacesTitle: string;
      aiSurfacesDescription: string;
      aiSurfaceCards: HomeCardCopy[];
      builderTitle: string;
      builderDescription: string;
      builderCards: HomeCardCopy[];
    };
    skipToMainContent: string;
    navigationAriaLabel: string;
    topbarTitle: string;
    platformStatusAriaLabel: string;
    lowFrequencyToolsLabel: string;
    localeToggleAriaLabel: string;
    localeToggleButtonLabel: string;
    badges: {
      governanceView: string;
      liveVerificationRequired: string;
      pageLevelStatus: string;
    };
    approval: {
      pageTitle: string;
      pageSubtitle: string;
      panelTitle: string;
      panelIntro: string;
      roleConfigurationAriaLabel: string;
      operatorRoleLabel: string;
      operatorRoleUnconfigured: string;
      refreshPending: string;
      refreshingPending: string;
      lastSuccessfulRefreshPrefix: string;
      actionsDisabledTitle: string;
      queueLoadingBadge: string;
      queueLoadFailedBadge: string;
      queueIdleBadge: string;
      queuePendingBadge: (count: number) => string;
      pendingTruthUnavailable: (error: string) => string;
      recoveryTip: string;
      lastAttemptPrefix: string;
      retryFetch: string;
      retryingFetch: string;
      inspectConnection: string;
      verifyAuthState: string;
      loadingPending: string;
      pendingQueueAriaLabel: string;
      reasonLabel: string;
      requiredActionLabel: string;
      resumeAtLabel: string;
      continueButton: string;
      continuingButton: string;
      manualHint: string;
      runIdLabel: string;
      runIdPlaceholder: string;
      approveButton: string;
      approvingButton: string;
      confirmTitle: string;
      confirmDescription: (runId: string) => string;
      cancel: string;
      confirmApproval: string;
      statusRefreshingQueue: string;
      statusRetryingQueue: string;
      statusQueueRefreshed: (count: number) => string;
      statusRefreshFailed: (message: string, authError: boolean) => string;
      statusRetryFailed: (message: string, authError: boolean) => string;
      statusEnterRunId: string;
      statusSubmittingApproval: string;
      statusApproved: string;
      statusFailed: (message: string) => string;
    };
    sectionPrimary: string;
    sectionAdvanced: string;
    labels: DashboardNavLabels;
  };
  desktop: {
    sectionPrimary: string;
    sectionAdvanced: string;
    sectionGovernance: string;
    shellAriaLabel: string;
    skipToMainContent: string;
    workspacePickerLabel: string;
    selectWorkspace: string;
    loadingPageStyles: string;
    loadingPage: string;
    localeToggleAriaLabel: string;
    localeToggleButtonLabel: string;
    commandTower: {
      title: string;
      subtitle: string;
      currentModePrefix: string;
      badges: {
        liveRefresh: string;
        paused: string;
        backoff: string;
        sloPrefix: string;
      };
      actions: {
        refreshProgress: string;
        refreshing: string;
        pauseAutoRefresh: string;
        resumeAutoRefresh: string;
        resumeWork: string;
        openWebDeepAnalysis: string;
        showAdvancedDetail: string;
        hideAdvancedDetail: string;
      };
      collapsedHint: string;
      webHandoffIntro: string;
      webAnalysisView: string;
      metrics: {
        totalSessions: string;
        active: string;
        failed: string;
        blocked: string;
      };
      filterTitle: string;
      filterHint: string;
      statusLegend: string;
      projectKey: string;
      sort: string;
      apply: string;
      reset: string;
      draftNotApplied: string;
      focusLabels: {
        all: string;
        highRisk: string;
        blocked: string;
        running: string;
      };
      refreshHealth: {
        fullSuccess: string;
        fullFailure: string;
        partialSuccess: (okCount: number) => string;
      };
      sectionLabels: {
        overview: string;
        sessions: string;
        alerts: string;
        healthy: string;
        issue: string;
      };
      errorIssueBadge: string;
      errorRecommendedAction: string;
      retryRefresh: string;
      retrying: string;
      pauseLiveTriage: string;
      noSessionsForFilters: string;
      noSessionsForFocus: string;
      viewAll: string;
      sessionBoardTitle: string;
      sessionBoardCount: (visible: number, total: number) => string;
      noSessionsYet: string;
      refreshNow: string;
      viewAllSessions: string;
      blockingHotspots: string;
      drawer: {
        ariaLabel: string;
        title: string;
        close: string;
        quickActions: string;
        health: string;
        inspectionPrompts: string;
        alerts: string;
        export: string;
        copy: string;
        running: string;
        paused: string;
        focusHits: string;
        filterState: string;
        allFilters: string;
        noAlerts: string;
        reviewAlertState: string;
        records: (count: number) => string;
        criticalCount: (count: number) => string;
      };
    };
    runDetail: {
      backToList: string;
      loadErrorPrefix: string;
      loadErrorNextStep: string;
      retryLoad: string;
      noDetailPayload: string;
      noDetailNextStep: string;
      pendingApprovalWithCount: (count: number) => string;
      pendingApprovalWithoutCount: string;
      operatorCopilotTitle: string;
      operatorCopilotIntro: string;
      operatorCopilotButton: string;
    };
    overview: {
      title: string;
      subtitle: string;
      refreshData: string;
      metricsAriaLabel: string;
      metricLabels: {
        totalSessions: string;
        activeNow: string;
        failureRatio: string;
        blockedQueue: string;
      };
      primaryActionsTitle: string;
      optionalStepLabel: string;
      approvalCheckpoint: string;
      approvalCheckpointDesc: string;
      currentProgressTitle: string;
      progressCards: {
        runningNow: string;
        runningNowHint: string;
        runningNowEmpty: string;
        needsAttention: string;
        needsAttentionHint: string;
        needsAttentionEmpty: string;
        riskEvents: string;
        riskEventsHint: string;
        riskEventsEmpty: string;
      };
      recentRunsTitle: string;
      recentRunsHint: string;
      noRunsYet: string;
      viewAllRuns: string;
      recentEventsTitle: string;
      viewAllExceptions: string;
      noExceptionsYet: string;
      openEventStream: string;
      viewRun: string;
      tableHeaders: {
        runId: string;
        taskId: string;
        status: string;
        createdAt: string;
        time: string;
        exception: string;
        details: string;
        action: string;
      };
      quickActions: {
        step1Label: string;
        step1Desc: string;
        step2Label: string;
        step2Desc: string;
        step3Label: string;
        step3Desc: string;
        step4Label: string;
        step4Desc: string;
      };
    };
    approval: {
      pageTitle: string;
      pageSubtitle: string;
      refresh: string;
      warningBanner: string;
      queueTitle: string;
      pendingBadge: (count: number) => string;
      criticalBadge: string;
      noPendingText: string;
      summaryLabel: string;
      taskIdLabel: string;
      failureReasonLabel: string;
      approveExecution: string;
      manualInputTitle: string;
      manualInputHint: string;
      runIdLabel: string;
      runIdPlaceholder: string;
      approve: string;
      confirmDialogAriaLabel: string;
      closeConfirmDialogAriaLabel: string;
      confirmTitle: string;
      confirmDescription: (runId: string) => string;
      cancel: string;
      confirmApproval: string;
      approvedToast: (runId: string) => string;
    };
    labels: DesktopLabels;
  };
};

const UI_COPY: Record<UiLocale, UiCopy> = {
  en: {
    brandTitle: "CortexPilot",
    brandSubtitle: "Command Tower · Workflow Cases · Proof & Replay",
    dashboard: {
      homePhase2: {
        heroTitle: "Command Tower for Codex and Claude Code workflows",
        heroSubtitle:
          "Start one workflow case, watch Command Tower, then inspect Proof & Replay. CortexPilot keeps Codex and Claude Code work, MCP tools, evidence, and replay on one governed operator path.",
        ecosystemTitle: "Works with today's coding-agent ecosystem",
        ecosystemDescription:
          "Keep the front door anchored on Codex, Claude Code, and read-only MCP. Mention OpenHands and comparison-only tools in the ecosystem layer, not in the hero.",
        ecosystemAction: "Open ecosystem map",
        ecosystemCards: [
          {
            badge: "Primary workflow binding",
            title: "Codex workflows",
            desc: "Use CortexPilot when Codex-driven work needs one command tower, one case record, and one replayable proof path.",
          },
          {
            badge: "Primary workflow binding",
            title: "Claude Code workflows",
            desc: "The same operator surface works for Claude Code-style coding loops that need governed visibility, approvals, and evidence before promotion.",
          },
          {
            badge: "Protocol surface",
            title: "Read-only MCP",
            desc: "MCP is a real protocol surface here, but the current boundary is read-only. External tools can inspect truth without mutating it.",
          },
          {
            badge: "Adjacent ecosystem",
            title: "OpenHands and comparison layer",
            desc: "OpenHands belongs in the broader ecosystem layer, while OpenCode stays comparison-only and OpenClaw stays out of the main front door.",
          },
        ],
        aiSurfacesTitle: "AI surfaces in the real workflow",
        aiSurfacesDescription:
          "AI in CortexPilot is not a floating chat box. It already shows up as a pre-run advisor, a workflow-level explainer, and a run/compare operator brief.",
        aiSurfaceCards: [
          {
            badge: "Pre-run advisory",
            title: "Flight Plan copilot",
            desc: "PM intake can preview one bounded pre-run brief before execution starts, so approval and evidence expectations are visible early.",
          },
          {
            badge: "Workflow-level AI",
            title: "Workflow copilot",
            desc: "Workflow Cases already expose a workflow-scoped brief that explains queue posture, latest run context, and next operator action.",
          },
          {
            badge: "Run-time AI",
            title: "Run and compare operator brief",
            desc: "Run Detail and compare surfaces can already explain deltas, proof, incident context, and the next action without pretending to execute recovery.",
          },
        ],
        builderTitle: "Builder entrypoints",
        builderDescription:
          "This is not a full SDK platform, but the client, contract, and shared presentation layers are now documented as real builder surfaces.",
        builderCards: [
          {
            badge: "Thin client surface",
            title: "@cortexpilot/frontend-api-client",
            desc: "Use the dashboard, desktop, and web client entry points when you want runs, Workflow Cases, approvals, and Command Tower reads from one import boundary.",
          },
          {
            badge: "Contract-facing",
            title: "@cortexpilot/frontend-api-contract",
            desc: "Use the generated contract-facing types and route/query names when you need stable API imports without backend modules.",
          },
          {
            badge: "Presentation substrate",
            title: "@cortexpilot/frontend-shared",
            desc: "Use the shared brand copy, locale helpers, status presentation, and frontend-only types instead of rebuilding those surfaces per app.",
          },
        ],
      },
      skipToMainContent: "Skip to dashboard content",
      navigationAriaLabel: "Dashboard navigation",
      topbarTitle: "Operator control plane",
      platformStatusAriaLabel: "Platform status overview",
      lowFrequencyToolsLabel: "Low-frequency tools",
      localeToggleAriaLabel: "Switch to Chinese",
      localeToggleButtonLabel: "中文",
      badges: {
        governanceView: "Governance view",
        liveVerificationRequired: "Live verification required",
        pageLevelStatus: "Page-level status",
      },
      approval: {
        pageTitle: "Manual approvals",
        pageSubtitle: "Review every HUMAN_APPROVAL_REQUIRED item in one place before resuming execution.",
        panelTitle: "God Mode",
        panelIntro:
          "God Mode separates pending approvals, read-only role gaps, and queue load failures. A quiet queue is not proof that approvals are globally unnecessary.",
        roleConfigurationAriaLabel: "Approval role configuration",
        operatorRoleLabel: "Operator role",
        operatorRoleUnconfigured: "Not configured",
        refreshPending: "Refresh pending approvals",
        refreshingPending: "Refreshing...",
        lastSuccessfulRefreshPrefix: "Last successful refresh:",
        actionsDisabledTitle: "Approval actions are read-only right now.",
        queueLoadingBadge: "Refreshing",
        queueLoadFailedBadge: "Load failed",
        queueIdleBadge: "No pending items",
        queuePendingBadge: (count: number) => `${count} pending approvals`,
        pendingTruthUnavailable: (error: string) => `Pending approval truth is unavailable: ${error}`,
        recoveryTip: "Recovery tip: confirm the login state and approval role before retrying.",
        lastAttemptPrefix: "Last attempt:",
        retryFetch: "Retry fetch",
        retryingFetch: "Retrying...",
        inspectConnection: "Open PM session to inspect connection",
        verifyAuthState: "Open Command Tower to verify auth state",
        loadingPending: "Loading pending approvals...",
        pendingQueueAriaLabel: "Pending approvals queue",
        reasonLabel: "Reason",
        requiredActionLabel: "Required action",
        resumeAtLabel: "Resume at",
        continueButton: "I am done, continue",
        continuingButton: "Approving...",
        manualHint:
          "When the event stream shows HUMAN_APPROVAL_REQUIRED, paste the run_id and approve it. The action will be written to the event log.",
        runIdLabel: "Run ID",
        runIdPlaceholder: "Paste run_id...",
        approveButton: "Approve",
        approvingButton: "Approving...",
        confirmTitle: "Confirm approval",
        confirmDescription: (runId: string) =>
          `Approve ${runId} to continue execution? This action writes to the event log and cannot be undone.`,
        cancel: "Cancel",
        confirmApproval: "Confirm approval",
        statusRefreshingQueue: "Refreshing pending approvals queue...",
        statusRetryingQueue: "Retrying pending approvals queue...",
        statusQueueRefreshed: (count: number) => `Pending approvals queue refreshed. ${count} item(s).`,
        statusRefreshFailed: (message: string, authError: boolean) =>
          authError
            ? `Pending approvals queue refresh failed: ${message}. Confirm permissions or sign in again before retrying.`
            : "Pending approvals queue refresh failed. Resolve the error and retry.",
        statusRetryFailed: (message: string, authError: boolean) =>
          authError
            ? `Retry failed: ${message}. Confirm permissions or sign in again before retrying.`
            : `Retry failed: ${message}.`,
        statusEnterRunId: "Enter run_id before approving.",
        statusSubmittingApproval: "Submitting approval...",
        statusApproved: "Approved.",
        statusFailed: (message: string) => `Failed: ${message}`,
      },
      sectionPrimary: "Primary",
      sectionAdvanced: "Advanced",
      labels: {
        overview: "Overview",
        pmIntake: "PM intake",
        commandTower: "Command Tower",
        runs: "Runs",
        quickApproval: "Quick approval",
        search: "Search",
        agents: "Agents",
        workflowCases: "Workflow Cases",
        events: "Events",
        reviews: "Reviews",
        diffGate: "Diff gate",
        tests: "Tests",
        contracts: "Contracts",
        policies: "Policies",
        locks: "Locks",
        worktrees: "Worktrees",
      },
    },
    desktop: {
      sectionPrimary: "Primary",
      sectionAdvanced: "Advanced",
      sectionGovernance: "Governance",
      shellAriaLabel: "CortexPilot Command Tower desktop shell",
      skipToMainContent: "Skip to main content",
      workspacePickerLabel: "Workspace picker",
      selectWorkspace: "Select workspace",
      loadingPageStyles: "Loading page styles...",
      loadingPage: "Loading page...",
      localeToggleAriaLabel: "Switch to Chinese",
      localeToggleButtonLabel: "中文",
      commandTower: {
        title: "Command Tower",
        subtitle: "Desktop stays focused on execution and operator decisions; deeper governance analysis moves to the web view.",
        currentModePrefix: "Current mode:",
        badges: {
          liveRefresh: "Live refresh",
          paused: "Paused",
          backoff: "Backoff",
          sloPrefix: "SLO: ",
        },
        actions: {
          refreshProgress: "Refresh progress",
          refreshing: "Refreshing...",
          pauseAutoRefresh: "Pause auto-refresh",
          resumeAutoRefresh: "Resume auto-refresh",
          resumeWork: "Resume work",
          openWebDeepAnalysis: "Open web deep analysis",
          showAdvancedDetail: "Show advanced detail",
          hideAdvancedDetail: "Hide advanced detail",
        },
        collapsedHint: "Advanced operator detail stays collapsed by default so the first screen remains action-focused.",
        webHandoffIntro: "Desktop owns the execution loop: refresh, pause, enter a session, and make operator decisions. For long-list analysis or complex filtering, use the",
        webAnalysisView: "web analysis view",
        metrics: {
          totalSessions: "Total sessions",
          active: "Active",
          failed: "Failed",
          blocked: "Blocked",
        },
        filterTitle: "Filters",
        filterHint: "Filters only affect the session list and can be combined with focus mode.",
        statusLegend: "Status",
        projectKey: "Project key",
        sort: "Sort",
        apply: "Apply",
        reset: "Reset",
        draftNotApplied: "Draft not applied",
        focusLabels: {
          all: "All",
          highRisk: "High risk",
          blocked: "Blocked",
          running: "Running",
        },
        refreshHealth: {
          fullSuccess: "Full refresh succeeded",
          fullFailure: "Full pipeline refresh failed",
          partialSuccess: (okCount: number) => `Partial refresh succeeded (${okCount}/3)`,
        },
        sectionLabels: {
          overview: "Overview",
          sessions: "Sessions",
          alerts: "Alerts",
          healthy: "Healthy",
          issue: "Issue",
        },
        errorIssueBadge: "Issue",
        errorRecommendedAction: "Recommended action: retry the refresh first. If it keeps failing, inspect network reachability and backend availability.",
        retryRefresh: "Retry refresh",
        retrying: "Retrying...",
        pauseLiveTriage: "Pause live triage",
        noSessionsForFilters: "No sessions match the current filters.",
        noSessionsForFocus: "No sessions match the current focus mode.",
        viewAll: "View all",
        sessionBoardTitle: "Session board",
        sessionBoardCount: (visible: number, total: number) => `Showing ${visible} / ${total} sessions`,
        noSessionsYet: "No sessions yet.",
        refreshNow: "Refresh now",
        viewAllSessions: "View all sessions",
        blockingHotspots: "Blocking hotspots",
        drawer: {
          ariaLabel: "Command Tower context drawer",
          title: "Context",
          close: "Close drawer",
          quickActions: "Quick actions",
          health: "Health",
          inspectionPrompts: "Inspection prompts",
          alerts: "Alerts",
          export: "Export",
          copy: "Copy",
          running: "RUNNING",
          paused: "PAUSED",
          focusHits: "Focus hits",
          filterState: "Filter state",
          allFilters: "ALL",
          noAlerts: "System healthy. No alerts right now.",
          reviewAlertState: "Review alert state",
          records: (count: number) => `${count} records`,
          criticalCount: (count: number) => `${count} critical`,
        },
      },
      runDetail: {
        backToList: "Back to list",
        loadErrorPrefix: "Run detail failed to load:",
        loadErrorNextStep: "Next step: retry loading first. If it still fails, return to the list and open the run again.",
        retryLoad: "Retry load",
        noDetailPayload: "No detail payload is available for this run yet.",
        noDetailNextStep: "Next step: retry loading first. If it still fails, return to the list and select the run again.",
        pendingApprovalWithCount: (count: number) =>
          `This run is waiting for human approval (${count} item(s)). Next step: complete the approval before continuing.`,
        pendingApprovalWithoutCount:
          "This run is marked as awaiting human approval. Next step: complete the approval before continuing.",
        operatorCopilotTitle: "AI operator copilot",
        operatorCopilotIntro:
          "Generate one bounded operator brief grounded in current run, compare, proof, incident, workflow, queue, and approval truth.",
        operatorCopilotButton: "Generate operator brief",
      },
      overview: {
        title: "Operator overview",
        subtitle:
          "Follow the primary path: start one workflow case, watch Command Tower, confirm the Workflow Case, then verify Proof & Replay. Only open approvals when the flow asks for one.",
        refreshData: "Refresh data",
        metricsAriaLabel: "Overview metrics",
        metricLabels: {
          totalSessions: "Total sessions",
          activeNow: "Active now",
          failureRatio: "Failure ratio",
          blockedQueue: "Blocked queue",
        },
        primaryActionsTitle: "Primary actions",
        optionalStepLabel: "Optional step",
        approvalCheckpoint: "Approval checkpoint",
        approvalCheckpointDesc:
          "Use the approval workspace only when the flow pauses for human confirmation.",
        currentProgressTitle: "Current progress",
        progressCards: {
          runningNow: "Running now",
          runningNowHint: 'Open "Runs" to follow the active work.',
          runningNowEmpty: "No tasks are running right now. Start a new one from the PM entrypoint.",
          needsAttention: "Needs attention",
          needsAttentionHint:
            "Prioritize the affected Run detail and decide whether to rollback, reject, or replay.",
          needsAttentionEmpty: "No failed tasks are currently visible.",
          riskEvents: "Risk events",
          riskEventsHint: "Inspect the event stream to locate the blocking root cause.",
          riskEventsEmpty: "Recent events do not show warning signals.",
        },
        recentRunsTitle: "Recent runs",
        recentRunsHint: "Open Run detail from here to review evidence and resolve outcomes.",
        noRunsYet: "No runs yet. Start your first request from the PM entrypoint.",
        viewAllRuns: "View all runs",
        recentEventsTitle: "Recent exceptions",
        viewAllExceptions: "View all exceptions",
        noExceptionsYet:
          "No exception signals yet. Failed runs and risk events will appear here after tasks start running.",
        openEventStream: "Open event stream",
        viewRun: "View Run",
        tableHeaders: {
          runId: "Run ID",
          taskId: "Task ID",
          status: "Status",
          createdAt: "Created at",
          time: "Time",
          exception: "Exception",
          details: "Details",
          action: "Action",
        },
        quickActions: {
          step1Label: "Step 1 · Brief PM",
          step1Desc:
            "Start at the PM entrypoint, state the goal and acceptance criteria, and let the system open the session.",
          step2Label: "Step 2 · Watch progress",
          step2Desc: "Use Command Tower to monitor session state, alerts, and pipeline health.",
          step3Label: "Step 3 · Review Workflow Cases",
          step3Desc:
            "Open Workflow Cases to confirm queue posture, operating verdict, and the current case record.",
          step4Label: "Step 4 · Verify Proof & Replay",
          step4Desc: "Open runs to inspect status, evidence chain, compare state, and replay results.",
        },
      },
      approval: {
        pageTitle: "Quick approval",
        pageSubtitle: "Manual approval queue for critical runs that are blocked pending human confirmation.",
        refresh: "Refresh",
        warningBanner:
          "This surface separates pending approvals, queue load failure, and manual approval input. A quiet queue is not proof that approval is globally unnecessary.",
        queueTitle: "Approval Queue",
        pendingBadge: (count: number) => `${count} pending`,
        criticalBadge: "CRITICAL",
        noPendingText:
          "No runs are waiting for approval in the current queue. This is not evidence that approval is disabled or unnecessary everywhere.",
        summaryLabel: "Summary",
        taskIdLabel: "Task ID",
        failureReasonLabel: "Failure reason",
        approveExecution: "Approve execution",
        manualInputTitle: "Manual Approval Input",
        manualInputHint: "Enter a Run ID to approve a task that is not currently listed in the queue",
        runIdLabel: "Run ID",
        runIdPlaceholder: "Enter Run ID",
        approve: "Approve",
        confirmDialogAriaLabel: "Approval confirmation dialog",
        closeConfirmDialogAriaLabel: "Close approval confirmation dialog",
        confirmTitle: "Confirm approval",
        confirmDescription: (runId: string) => `Approve run ${runId}? This action cannot be undone.`,
        cancel: "Cancel",
        confirmApproval: "Confirm approval",
        approvedToast: (runId: string) => `Approved ${runId}`,
      },
      labels: {
        overview: "Overview",
        pmIntake: "PM intake",
        commandTower: "Command Tower",
        runs: "Runs",
        runDetail: "Run Detail",
        runCompare: "Run Compare",
        workflowCases: "Workflow Cases",
        workflowCaseDetail: "Workflow Case Detail",
        quickApproval: "Quick approval",
        search: "Search",
        events: "Events",
        contracts: "Contracts",
        reviews: "Reviews",
        tests: "Tests",
        policies: "Policies",
        agents: "Agents",
        locks: "Locks",
        worktrees: "Worktrees",
        diffGate: "Diff gate",
        sessionView: "Session View",
      },
    },
  },
  "zh-CN": {
    brandTitle: "CortexPilot",
    brandSubtitle: "指挥塔 · 工作流案例 · 证明与回放",
    dashboard: {
      homePhase2: {
        heroTitle: "面向 Codex 和 Claude Code 工作流的指挥塔",
        heroSubtitle:
          "先启动一个工作流案例，再观察指挥塔，最后核对证明与回放。CortexPilot 把 Codex / Claude Code 工作、MCP 工具、证据和回放放进同一条受治理的操作路径。",
        ecosystemTitle: "与当前 coding-agent 生态的关系",
        ecosystemDescription:
          "前门继续以 Codex、Claude Code 和只读 MCP 为主轴。OpenHands 和 comparison-only 工具只放在生态层，不放进 hero。",
        ecosystemAction: "打开生态地图",
        ecosystemCards: [
          {
            badge: "主工作流绑定",
            title: "Codex 工作流",
            desc: "当 Codex 驱动的工作需要统一指挥塔、案例记录和可回放证明路径时，就该由 CortexPilot 承接。",
          },
          {
            badge: "主工作流绑定",
            title: "Claude Code 工作流",
            desc: "同一套操作面也适用于 Claude Code 风格的编码循环，重点在于治理可见性、审批和证据。",
          },
          {
            badge: "协议层",
            title: "只读 MCP",
            desc: "这里的 MCP 是真实协议面，但当前边界仍然是只读。外部工具可以读取真相，不能修改真相。",
          },
          {
            badge: "相邻生态",
            title: "OpenHands 与 comparison 层",
            desc: "OpenHands 留在更广的生态层；OpenCode 维持 comparison-only，OpenClaw 继续不进主前门。",
          },
        ],
        aiSurfacesTitle: "AI 功能已经进入主工作流",
        aiSurfacesDescription:
          "CortexPilot 里的 AI 不是漂浮聊天框。它已经分别出现在执行前建议、工作流解释，以及运行/对比的操作摘要里。",
        aiSurfaceCards: [
          {
            badge: "执行前建议",
            title: "Flight Plan 副驾驶",
            desc: "PM intake 现在可以在执行前先生成一份有边界的建议摘要，让审批和证据预期更早可见。",
          },
          {
            badge: "工作流级 AI",
            title: "Workflow 副驾驶",
            desc: "Workflow Case 已经能给出工作流级别的解释，覆盖队列姿态、最新 run 上下文和下一步操作。",
          },
          {
            badge: "运行时 AI",
            title: "Run / Compare 操作摘要",
            desc: "Run Detail 和 compare 面已经能解释差异、证明、incident 上下文和下一步动作，而不假装自己在执行恢复。",
          },
        ],
        builderTitle: "Builder 入口",
        builderDescription:
          "这还不是完整 SDK 平台，但 client、contract 和 shared presentation 层已经是可讲、可接入的 builder surface。",
        builderCards: [
          {
            badge: "薄客户端",
            title: "@cortexpilot/frontend-api-client",
            desc: "当你想从一个导入边界里拿到 runs、Workflow Cases、approvals 和 Command Tower 读取能力时，就从这里开始。",
          },
          {
            badge: "契约层",
            title: "@cortexpilot/frontend-api-contract",
            desc: "当你需要稳定的 API 类型和 route/query 名称，而不想直接导入后端模块时，用这个包。",
          },
          {
            badge: "表现层 substrate",
            title: "@cortexpilot/frontend-shared",
            desc: "品牌 copy、locale helper、status presentation 和 frontend-only types 已经集中到这一层，而不是散落在各 app 里。",
          },
        ],
      },
      skipToMainContent: "跳到控制台主内容",
      navigationAriaLabel: "控制台导航",
      topbarTitle: "操作控制平面",
      platformStatusAriaLabel: "平台状态概览",
      lowFrequencyToolsLabel: "低频工具",
      localeToggleAriaLabel: "切换到英文",
      localeToggleButtonLabel: "EN",
      badges: {
        governanceView: "治理视图",
        liveVerificationRequired: "需要实时核验",
        pageLevelStatus: "页面级状态",
      },
      approval: {
        pageTitle: "人工审批",
        pageSubtitle: "在恢复执行前，把所有 HUMAN_APPROVAL_REQUIRED 项集中审阅一遍。",
        panelTitle: "人工裁决",
        panelIntro:
          "人工裁决页会把待审批项、只读权限缺口和队列拉取失败分开显示。队列安静，不代表全局不再需要审批。",
        roleConfigurationAriaLabel: "审批角色配置",
        operatorRoleLabel: "操作角色",
        operatorRoleUnconfigured: "未配置",
        refreshPending: "刷新待审批队列",
        refreshingPending: "刷新中...",
        lastSuccessfulRefreshPrefix: "最近一次成功刷新：",
        actionsDisabledTitle: "当前审批操作为只读。",
        queueLoadingBadge: "刷新中",
        queueLoadFailedBadge: "加载失败",
        queueIdleBadge: "没有待处理项",
        queuePendingBadge: (count: number) => `${count} 条待审批`,
        pendingTruthUnavailable: (error: string) => `待审批真相暂不可用：${error}`,
        recoveryTip: "恢复建议：先确认登录状态和审批角色，再进行重试。",
        lastAttemptPrefix: "最近一次尝试：",
        retryFetch: "重试拉取",
        retryingFetch: "重试中...",
        inspectConnection: "打开 PM 会话检查连接",
        verifyAuthState: "打开指挥塔检查认证状态",
        loadingPending: "正在加载待审批队列...",
        pendingQueueAriaLabel: "待审批队列",
        reasonLabel: "原因",
        requiredActionLabel: "需要动作",
        resumeAtLabel: "恢复位置",
        continueButton: "我已确认，继续执行",
        continuingButton: "审批中...",
        manualHint:
          "当事件流出现 HUMAN_APPROVAL_REQUIRED 时，把 run_id 粘贴到这里后批准。该动作会被写入事件日志。",
        runIdLabel: "运行 ID",
        runIdPlaceholder: "粘贴 run_id...",
        approveButton: "批准",
        approvingButton: "审批中...",
        confirmTitle: "确认批准",
        confirmDescription: (runId: string) =>
          `批准 ${runId} 并继续执行吗？该操作会写入事件日志，且不可撤销。`,
        cancel: "取消",
        confirmApproval: "确认批准",
        statusRefreshingQueue: "正在刷新待审批队列...",
        statusRetryingQueue: "正在重试待审批队列...",
        statusQueueRefreshed: (count: number) => `待审批队列已刷新。当前 ${count} 条。`,
        statusRefreshFailed: (message: string, authError: boolean) =>
          authError
            ? `待审批队列刷新失败：${message}。请先确认权限或重新登录后再试。`
            : "待审批队列刷新失败。请先处理错误再重试。",
        statusRetryFailed: (message: string, authError: boolean) =>
          authError
            ? `重试失败：${message}。请先确认权限或重新登录后再试。`
            : `重试失败：${message}。`,
        statusEnterRunId: "请先输入 run_id 再批准。",
        statusSubmittingApproval: "正在提交审批...",
        statusApproved: "已批准。",
        statusFailed: (message: string) => `失败：${message}`,
      },
      sectionPrimary: "主路径",
      sectionAdvanced: "高级",
      labels: {
        overview: "总览",
        pmIntake: "PM 入口",
        commandTower: "指挥塔",
        runs: "运行记录",
        quickApproval: "快速审批",
        search: "检索",
        agents: "代理",
        workflowCases: "工作流案例",
        events: "事件流",
        reviews: "评审",
        diffGate: "差异门禁",
        tests: "测试",
        contracts: "合约",
        policies: "策略",
        locks: "锁管理",
        worktrees: "工作树",
      },
    },
    desktop: {
      sectionPrimary: "主路径",
      sectionAdvanced: "高级",
      sectionGovernance: "治理",
      shellAriaLabel: "CortexPilot 指挥塔桌面端",
      skipToMainContent: "跳到主内容",
      workspacePickerLabel: "工作区切换器",
      selectWorkspace: "选择工作区",
      loadingPageStyles: "正在加载页面样式...",
      loadingPage: "正在加载页面...",
      localeToggleAriaLabel: "切换到英文",
      localeToggleButtonLabel: "EN",
      commandTower: {
        title: "指挥塔",
        subtitle: "桌面端聚焦执行与操作决策；更深的治理分析留给 Web 视图。",
        currentModePrefix: "当前模式：",
        badges: {
          liveRefresh: "实时刷新",
          paused: "已暂停",
          backoff: "退避中",
          sloPrefix: "SLO：",
        },
        actions: {
          refreshProgress: "更新进展",
          refreshing: "刷新中...",
          pauseAutoRefresh: "暂停自动刷新",
          resumeAutoRefresh: "恢复自动刷新",
          resumeWork: "继续处理",
          openWebDeepAnalysis: "打开 Web 深度分析",
          showAdvancedDetail: "展开专家信息",
          hideAdvancedDetail: "收起专家信息",
        },
        collapsedHint: "默认先收起高级操作细节，让第一屏保持执行优先。",
        webHandoffIntro: "桌面端负责执行主循环：刷新、暂停、进入会话并作出操作决策。若要做长列表分析或复杂筛选，请使用",
        webAnalysisView: "Web 分析视图",
        metrics: {
          totalSessions: "会话总数",
          active: "活跃",
          failed: "失败",
          blocked: "阻塞",
        },
        filterTitle: "筛选器",
        filterHint: "筛选器只影响会话列表，可与 focus mode 组合使用。",
        statusLegend: "状态",
        projectKey: "项目键",
        sort: "排序",
        apply: "应用",
        reset: "重置",
        draftNotApplied: "草稿未应用",
        focusLabels: {
          all: "全部",
          highRisk: "高风险",
          blocked: "阻塞",
          running: "运行中",
        },
        refreshHealth: {
          fullSuccess: "完整刷新成功",
          fullFailure: "整条刷新链路失败",
          partialSuccess: (okCount: number) => `部分刷新成功（${okCount}/3）`,
        },
        sectionLabels: {
          overview: "总览",
          sessions: "会话",
          alerts: "告警",
          healthy: "健康",
          issue: "异常",
        },
        errorIssueBadge: "问题",
        errorRecommendedAction: "建议动作：先重试刷新。如果仍然失败，再检查网络连通性和后端可用性。",
        retryRefresh: "重试刷新",
        retrying: "重试中...",
        pauseLiveTriage: "暂停实时排查",
        noSessionsForFilters: "当前筛选条件下没有匹配的会话。",
        noSessionsForFocus: "当前 focus 模式下没有匹配的会话。",
        viewAll: "查看全部",
        sessionBoardTitle: "会话面板",
        sessionBoardCount: (visible: number, total: number) => `显示 ${visible} / ${total} 个会话`,
        noSessionsYet: "还没有会话。",
        refreshNow: "立即刷新",
        viewAllSessions: "查看全部会话",
        blockingHotspots: "阻塞热点",
        drawer: {
          ariaLabel: "指挥塔上下文抽屉",
          title: "上下文",
          close: "关闭抽屉",
          quickActions: "快捷动作",
          health: "健康状态",
          inspectionPrompts: "排查提示",
          alerts: "告警",
          export: "导出",
          copy: "复制",
          running: "运行中",
          paused: "已暂停",
          focusHits: "焦点命中",
          filterState: "筛选状态",
          allFilters: "全部",
          noAlerts: "系统当前健康，没有告警。",
          reviewAlertState: "查看告警状态",
          records: (count: number) => `${count} 条记录`,
          criticalCount: (count: number) => `${count} 个严重`,
        },
      },
      runDetail: {
        backToList: "返回列表",
        loadErrorPrefix: "Run 详情加载失败：",
        loadErrorNextStep: "下一步：先重试加载。如果仍然失败，就回到列表重新打开这个 Run。",
        retryLoad: "重试加载",
        noDetailPayload: "当前还没有这个 Run 的详情负载。",
        noDetailNextStep: "下一步：先重试加载。如果仍然失败，就回到列表重新选择这个 Run。",
        pendingApprovalWithCount: (count: number) =>
          `这个 Run 正在等待人工审批（${count} 项）。下一步：先完成审批再继续。`,
        pendingApprovalWithoutCount:
          "这个 Run 被标记为等待人工审批。下一步：先完成审批再继续。",
        operatorCopilotTitle: "AI 操作员副驾驶",
        operatorCopilotIntro:
          "生成一份有边界的操作员摘要，基于当前 run、compare、proof、incident、workflow、queue 和 approval 真相。",
        operatorCopilotButton: "生成操作摘要",
      },
      overview: {
        title: "新手起步",
        subtitle:
          "首次使用建议先走一遍单主流程：先创建一个工作流案例，再看 Command Tower，然后确认 Workflow Case，最后核对 Proof & Replay。只有真的出现人工确认时，才进入审批面。",
        refreshData: "刷新数据",
        metricsAriaLabel: "总览指标",
        metricLabels: {
          totalSessions: "会话总数",
          activeNow: "当前活跃",
          failureRatio: "失败占比",
          blockedQueue: "阻塞队列",
        },
        primaryActionsTitle: "主步骤",
        optionalStepLabel: "可选步骤",
        approvalCheckpoint: "审批确认",
        approvalCheckpointDesc: "只有流程暂停并等待人工确认时，才进入审批工作区。",
        currentProgressTitle: "当前进展",
        progressCards: {
          runningNow: "运行中",
          runningNowHint: "打开“运行记录”追踪当前活跃工作。",
          runningNowEmpty: "当前没有正在运行的任务。先从 PM 入口发起一个新的请求。",
          needsAttention: "需要关注",
          needsAttentionHint: "优先打开对应 Run 详情，判断是回滚、拒绝还是重放。",
          needsAttentionEmpty: "当前没有失败任务。",
          riskEvents: "风险事件",
          riskEventsHint: "打开事件流定位阻塞根因。",
          riskEventsEmpty: "最近没有明显的风险信号。",
        },
        recentRunsTitle: "最近运行",
        recentRunsHint: "从这里进入 Run 详情，查看证据并处理结果。",
        noRunsYet: "还没有运行记录。先从 PM 入口发起你的第一个请求。",
        viewAllRuns: "查看全部运行",
        recentEventsTitle: "最近异常",
        viewAllExceptions: "查看全部异常",
        noExceptionsYet: "还没有异常信号。失败任务和风险事件会在任务运行后出现在这里。",
        openEventStream: "打开事件流",
        viewRun: "查看 Run",
        tableHeaders: {
          runId: "Run ID",
          taskId: "Task ID",
          status: "状态",
          createdAt: "创建时间",
          time: "时间",
          exception: "异常",
          details: "详情",
          action: "操作",
        },
        quickActions: {
          step1Label: "主步骤 1 · 发需求",
          step1Desc: "从 PM 入口开始，说明目标和验收标准，让系统先建立会话。",
          step2Label: "主步骤 2 · 看进度",
          step2Desc: "通过 Command Tower 观察会话状态、告警和执行进度。",
          step3Label: "主步骤 3 · 看案例",
          step3Desc: "打开 Workflow Cases，确认队列姿态、运行结论和当前案例记录。",
          step4Label: "主步骤 4 · 核证据",
          step4Desc: "打开运行记录，核对状态、证据链、对比结果和回放信息。",
        },
      },
      approval: {
        pageTitle: "快速审批",
        pageSubtitle: "处理那些因为等待人工确认而阻塞的关键运行。",
        refresh: "刷新",
        warningBanner:
          "这个界面会把待审批队列、队列拉取失败、以及手动批准输入分开显示。队列安静，不代表全局不需要审批。",
        queueTitle: "审批队列",
        pendingBadge: (count: number) => `${count} 条待处理`,
        criticalBadge: "关键",
        noPendingText:
          "当前队列里没有等待审批的运行。这并不代表别的路径上也不再需要审批。",
        summaryLabel: "摘要",
        taskIdLabel: "任务 ID",
        failureReasonLabel: "失败原因",
        approveExecution: "批准执行",
        manualInputTitle: "手动审批输入",
        manualInputHint: "输入一个 Run ID，批准当前不在列表里的任务",
        runIdLabel: "运行 ID",
        runIdPlaceholder: "输入 Run ID",
        approve: "批准",
        confirmDialogAriaLabel: "审批确认弹窗",
        closeConfirmDialogAriaLabel: "关闭审批确认弹窗",
        confirmTitle: "确认批准",
        confirmDescription: (runId: string) => `批准运行 ${runId} 吗？该操作不可撤销。`,
        cancel: "取消",
        confirmApproval: "确认批准",
        approvedToast: (runId: string) => `已批准 ${runId}`,
      },
      labels: {
        overview: "总览",
        pmIntake: "PM 入口",
        commandTower: "指挥塔",
        runs: "运行记录",
        runDetail: "运行详情",
        runCompare: "运行对比",
        workflowCases: "工作流案例",
        workflowCaseDetail: "工作流案例详情",
        quickApproval: "快速审批",
        search: "检索",
        events: "事件流",
        contracts: "合约",
        reviews: "评审",
        tests: "测试",
        policies: "策略",
        agents: "代理",
        locks: "锁管理",
        worktrees: "工作树",
        diffGate: "差异门禁",
        sessionView: "会话视图",
      },
    },
  },
};

function normalizeLocale(locale: string | undefined | null): UiLocale {
  return locale === "zh-CN" ? "zh-CN" : "en";
}

export function getUiCopy(locale: string | undefined | null = DEFAULT_UI_LOCALE): UiCopy {
  return UI_COPY[normalizeLocale(locale)];
}
