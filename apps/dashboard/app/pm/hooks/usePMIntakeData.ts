"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { resolveDashboardPmCopyVariantEnv } from "../../../lib/env";
import type { PmSessionSummary } from "../../../lib/types";
import {
  DRAFT_SESSION_ID,
  mergeChatTimeline,
  PRIVILEGED_CUSTOM_ROLES,
  resolvePmCopyVariant,
  type BrowserPreset,
  type ChainRole,
  type ChatCardPayload,
  type ChatItem,
  type ChatItemKind,
  type ChatRole,
  type NewsDigestTimeRange,
  type PMLayoutMode,
  type PMTaskTemplate,
} from "../components/PMIntakeFeature.shared";

export function usePMIntakeData() {
  const copyVariant = resolvePmCopyVariant(resolveDashboardPmCopyVariantEnv());
  const [layoutMode, setLayoutMode] = useState<PMLayoutMode>("dialog");
  const [taskTemplate, setTaskTemplate] = useState<PMTaskTemplate>("news_digest");
  const [objective, setObjective] = useState("");
  const [allowedPaths, setAllowedPaths] = useState("");
  const [constraints, setConstraints] = useState("");
  const [searchQueries, setSearchQueries] = useState("");
  const [newsDigestTopic, setNewsDigestTopic] = useState("Seattle tech and AI");
  const [newsDigestSources, setNewsDigestSources] = useState("theverge.com\ntechcrunch.com\nopenai.com/blog");
  const [newsDigestTimeRange, setNewsDigestTimeRange] = useState<NewsDigestTimeRange>("24h");
  const [newsDigestMaxResults, setNewsDigestMaxResults] = useState("5");
  const [pageBriefUrl, setPageBriefUrl] = useState("https://example.com");
  const [pageBriefFocus, setPageBriefFocus] = useState("Summarize the page for a first-time reader.");
  const [answers, setAnswers] = useState("");
  const [intakeId, setIntakeId] = useState("");
  const [questions, setQuestions] = useState<string[]>([]);
  const [plan, setPlan] = useState<unknown>(null);
  const [taskChain, setTaskChain] = useState<unknown>(null);
  const [runId, setRunId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [browserPreset, setBrowserPreset] = useState<BrowserPreset>("safe");
  const [requesterRole, setRequesterRole] = useState("PM");
  const [customBrowserPolicy, setCustomBrowserPolicy] = useState(
    '{\n  "profile_mode": "allow_profile",\n  "stealth_mode": "plugin",\n  "human_behavior": {\n    "enabled": true,\n    "level": "medium"\n  }\n}',
  );
  const [effectiveBrowserPolicy, setEffectiveBrowserPolicy] = useState<unknown>(null);
  const [workspacePath, setWorkspacePath] = useState("apps/dashboard");
  const [repoName, setRepoName] = useState("cortexpilot");
  const [chatInput, setChatInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [chatError, setChatError] = useState("");
  const [chatNotice, setChatNotice] = useState("");
  const [chatLogBySession, setChatLogBySession] = useState<Record<string, ChatItem[]>>({});
  const [chatHistoryBusy, setChatHistoryBusy] = useState(false);
  const [sessionHistoryError, setSessionHistoryError] = useState("");
  const [sessionHistory, setSessionHistory] = useState<PmSessionSummary[]>([]);
  const [historyBusy, setHistoryBusy] = useState(false);
  const [newConversationBusy, setNewConversationBusy] = useState(false);
  const [newConversationError, setNewConversationError] = useState("");
  const [newConversationNotice, setNewConversationNotice] = useState("");
  const [liveRole, setLiveRole] = useState("");
  const [progressFeed, setProgressFeed] = useState<string[]>([]);
  const [chatStickToBottom, setChatStickToBottom] = useState(true);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [hoveredChainRole, setHoveredChainRole] = useState<ChainRole | null>(null);

  const chatLogRef = useRef<HTMLDivElement | null>(null);
  const chatInputRef = useRef<HTMLTextAreaElement | null>(null);
  const chainPanelRef = useRef<HTMLElement | null>(null);
  const chatAbortRef = useRef<AbortController | null>(null);
  const activeSessionRef = useRef("");
  const liveSyncTokenRef = useRef(0);
  const historySyncTokenRef = useRef(0);
  const newConversationTxnRef = useRef(0);
  const newConversationInFlightRef = useRef(false);
  const lastChatLengthRef = useRef(0);

  const normalizedRequesterRole = requesterRole.trim().toUpperCase();
  const canUseCustomPreset = PRIVILEGED_CUSTOM_ROLES.has(normalizedRequesterRole);
  const activeChatSessionId = intakeId || DRAFT_SESSION_ID;
  const chatLog = chatLogBySession[activeChatSessionId] || [];
  const chatFlowBusy = busy || chatBusy;
  const workspaceBound = workspacePath.trim().length > 0 && repoName.trim().length > 0;

  const rotateSessionRequestGuard = useCallback((nextSessionId: string) => {
    activeSessionRef.current = nextSessionId;
    historySyncTokenRef.current += 1;
    liveSyncTokenRef.current += 1;
  }, []);

  const appendChat = useCallback(
    (
      role: ChatRole,
      text: string,
      sessionId = activeChatSessionId,
      options?: { kind?: ChatItemKind; card?: ChatCardPayload; createdAt?: string; origin?: "local" | "remote" },
    ) => {
      setChatLogBySession((previous) => {
        const nextSessionLog = previous[sessionId] || [];
        return {
          ...previous,
          [sessionId]: [
            ...nextSessionLog,
            {
              id: `${sessionId}-${nextSessionLog.length + 1}-${Date.now()}`,
              role,
              text,
              createdAt: options?.createdAt || new Date().toISOString(),
              kind: options?.kind || "message",
              origin: options?.origin || "local",
              card: options?.card,
            },
          ],
        };
      });
    },
    [activeChatSessionId],
  );

  const moveDraftChatToSession = useCallback((nextSessionId: string) => {
    setChatLogBySession((previous) => {
      const draftLog = previous[DRAFT_SESSION_ID] || [];
      if (draftLog.length === 0) {
        return previous;
      }
      const next = { ...previous };
      const existing = next[nextSessionId] || [];
      next[nextSessionId] = [...existing, ...draftLog];
      delete next[DRAFT_SESSION_ID];
      return next;
    });
  }, []);

  const mergeSessionChat = useCallback((sessionId: string, remoteChatItems: ChatItem[]) => {
    setChatLogBySession((previous) => {
      const localSessionChat = previous[sessionId] || [];
      const mergedChat = mergeChatTimeline(localSessionChat, remoteChatItems);
      if (mergedChat === localSessionChat) {
        return previous;
      }
      return {
        ...previous,
        [sessionId]: mergedChat,
      };
    });
  }, []);

  const resetConversation = useCallback(() => {
    rotateSessionRequestGuard("");
    setIntakeId("");
    setRunId("");
    setQuestions([]);
    setChatInput("");
    setChatError("");
    setChatNotice("");
    setChatLogBySession((previous) => {
      const next = { ...previous };
      delete next[DRAFT_SESSION_ID];
      return next;
    });
    setPlan(null);
    setTaskChain(null);
    setEffectiveBrowserPolicy(null);
    setLiveRole("");
    setProgressFeed([]);
    setHoveredChainRole(null);
  }, [rotateSessionRequestGuard]);

  return {
    copyVariant,
    layoutMode,
    setLayoutMode,
    taskTemplate,
    setTaskTemplate,
    objective,
    setObjective,
    allowedPaths,
    setAllowedPaths,
    constraints,
    setConstraints,
    searchQueries,
    setSearchQueries,
    newsDigestTopic,
    setNewsDigestTopic,
    newsDigestSources,
    setNewsDigestSources,
    newsDigestTimeRange,
    setNewsDigestTimeRange,
    newsDigestMaxResults,
    setNewsDigestMaxResults,
    pageBriefUrl,
    setPageBriefUrl,
    pageBriefFocus,
    setPageBriefFocus,
    answers,
    setAnswers,
    intakeId,
    setIntakeId,
    questions,
    setQuestions,
    plan,
    setPlan,
    taskChain,
    setTaskChain,
    runId,
    setRunId,
    error,
    setError,
    busy,
    setBusy,
    browserPreset,
    setBrowserPreset,
    requesterRole,
    setRequesterRole,
    customBrowserPolicy,
    setCustomBrowserPolicy,
    effectiveBrowserPolicy,
    setEffectiveBrowserPolicy,
    workspacePath,
    setWorkspacePath,
    repoName,
    setRepoName,
    chatInput,
    setChatInput,
    chatBusy,
    setChatBusy,
    chatError,
    setChatError,
    chatNotice,
    setChatNotice,
    chatLogBySession,
    setChatLogBySession,
    chatHistoryBusy,
    setChatHistoryBusy,
    sessionHistoryError,
    setSessionHistoryError,
    sessionHistory,
    setSessionHistory,
    historyBusy,
    setHistoryBusy,
    newConversationBusy,
    setNewConversationBusy,
    newConversationError,
    setNewConversationError,
    newConversationNotice,
    setNewConversationNotice,
    liveRole,
    setLiveRole,
    progressFeed,
    setProgressFeed,
    chatStickToBottom,
    setChatStickToBottom,
    chatUnreadCount,
    setChatUnreadCount,
    hoveredChainRole,
    setHoveredChainRole,
    chatLogRef,
    chatInputRef,
    chainPanelRef,
    chatAbortRef,
    activeSessionRef,
    liveSyncTokenRef,
    historySyncTokenRef,
    newConversationTxnRef,
    newConversationInFlightRef,
    lastChatLengthRef,
    canUseCustomPreset,
    activeChatSessionId,
    chatLog,
    chatFlowBusy,
    workspaceBound,
    rotateSessionRequestGuard,
    appendChat,
    moveDraftChatToSession,
    mergeSessionChat,
    resetConversation,
  };
}
