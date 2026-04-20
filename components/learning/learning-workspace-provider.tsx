import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, usePathname, useRouter } from 'expo-router';
import React from 'react';
import { toast } from 'sonner-native';

import { useAppSession } from '@/hooks/use-app-session';
import { useLearningSessionMessagesQuery } from '@/hooks/use-library-app-data';
import {
  resolveLearningWorkspaceSourceSummary,
  resolveLearningWorkspaceStatusDescription,
  useLearningWorkspace,
  type LearningWorkspaceGate,
} from '@/hooks/use-learning-workspace';
import { getLibraryErrorMessage, LibraryApiError } from '@/lib/api/client';
import { resumeLearningSessionReply, streamLearningSessionReply } from '@/lib/api/learning';
import type { LearningSessionMessage, LearningStepEvaluation } from '@/lib/api/types';
import {
  buildSyntheticCompletedSteps,
  buildLearningSessionTransitionLabel,
  buildLearningWorkspaceHighlights,
  buildLearningWorkspaceSources,
  createLearningRenderedMessages,
  resolveLearningRedirectStatusSignal,
  resolveLearningStreamStatusSignal,
  type LearningWorkspaceInsightCard,
  type LearningWorkspaceRenderedMessage,
  type LearningWorkspaceSessionSignal,
  type LearningWorkspaceSourceCard,
  type LearningWorkspaceStatusSignal,
} from '@/lib/learning/workspace';
import { useLearningConversationStore } from '@/stores/learning-conversation-store';

export type LearningWorkspaceTab = 'study' | 'graph' | 'review';
export type LearningStudyMode = 'guide' | 'explore';
export type LearningWorkspaceInfoPanel = 'highlights' | 'path' | 'sources';
type LearningSendOptions = {
  mode?: LearningStudyMode;
  session?: NonNullable<ReturnType<typeof useLearningWorkspace>['workspaceSession']>;
};

type LearningWorkspaceContextValue = {
  activeTab: LearningWorkspaceTab;
  closeWorkspace: () => void;
  draft: string;
  footerInset: number;
  handleSend: (nextDraft?: string, options?: LearningSendOptions) => Promise<void>;
  highlightCards: LearningWorkspaceInsightCard[];
  latestEvaluation: LearningStepEvaluation | null;
  latestSessionSignal: LearningWorkspaceSessionSignal | null;
  latestStatus: LearningWorkspaceStatusSignal | null;
  navigateToStudyMode: (mode: LearningStudyMode) => void;
  navigateToTab: (tab: LearningWorkspaceTab) => void;
  openInfoSheet: (panel?: LearningWorkspaceInfoPanel) => void;
  openOverview: () => void;
  profile: ReturnType<typeof useLearningWorkspace>['profile'];
  renderedMessages: LearningWorkspaceRenderedMessage[];
  replaceWorkspaceSession: (session: NonNullable<ReturnType<typeof useLearningWorkspace>['workspaceSession']>) => void;
  retryGenerate: (profileId?: number) => Promise<void>;
  setDraft: React.Dispatch<React.SetStateAction<string>>;
  sourceCount: number;
  sourceCards: LearningWorkspaceSourceCard[];
  sourceSummary: string;
  starterPrompts: string[];
  studyMode: LearningStudyMode;
  workspaceGate: LearningWorkspaceGate;
  workspaceSession: ReturnType<typeof useLearningWorkspace>['workspaceSession'];
  isRetryPending: boolean;
};

const LearningWorkspaceContext = React.createContext<LearningWorkspaceContextValue | null>(null);

function getLearningReplyFailureFallback(mode: LearningStudyMode) {
  return '模型请求错误';
}

function hasVisibleAssistantDraftContent() {
  const { assistantMessageId, messages } = useLearningConversationStore.getState();
  if (!assistantMessageId) {
    return false;
  }

  const assistantDraft = messages.find((message) => message.id === assistantMessageId);
  if (!assistantDraft) {
    return false;
  }

  if (assistantDraft.text.trim()) {
    return true;
  }

  const presentation = assistantDraft.presentation;
  if (!presentation) {
    return false;
  }

  if (presentation.kind === 'explore') {
    return Boolean(presentation.reasoningContent?.trim()) || presentation.bridgeActions.length > 0;
  }

  return assistantDraft.cards.length > 0;
}

export function buildOptimisticUserHistoryMessage(
  sessionId: number,
  userMessage: Pick<LearningWorkspaceRenderedMessage, 'text'>,
  assistantMessage?: Pick<LearningSessionMessage, 'createdAt'>
): LearningSessionMessage {
  const assistantTimestamp = assistantMessage?.createdAt
    ? new Date(assistantMessage.createdAt).getTime()
    : Number.NaN;
  const userTimestamp = Number.isFinite(assistantTimestamp)
    ? Math.max(0, assistantTimestamp - 1)
    : Date.now();

  return {
    content: userMessage.text,
    createdAt: new Date(userTimestamp).toISOString(),
    id: -userTimestamp,
    learningSessionId: sessionId,
    role: 'user',
  };
}

export function resolveLearningWorkspaceNavigationState(
  pathname: string,
  modeParam?: string | string[]
) {
  if (pathname.endsWith('/graph')) {
    return {
      activeTab: 'graph' as const,
      studyMode: 'explore' as const,
    };
  }

  if (pathname.endsWith('/review')) {
    return {
      activeTab: 'review' as const,
      studyMode: 'explore' as const,
    };
  }

  const normalizedMode = Array.isArray(modeParam) ? modeParam[0] : modeParam;

  return {
    activeTab: 'study' as const,
    studyMode:
      normalizedMode === 'guide'
        ? ('guide' as const)
        : normalizedMode === 'explore' || pathname.endsWith('/explore')
          ? ('explore' as const)
          : ('explore' as const),
  };
}

function resolveLearningWorkspaceFooterInset(_tab: LearningWorkspaceTab) {
  return 24;
}

function mergeLearningSessionWithProfile(
  profile: NonNullable<ReturnType<typeof useLearningWorkspace>['profile']>,
  session: NonNullable<ReturnType<typeof useLearningWorkspace>['workspaceSession']>
) {
  const totalSteps = profile.curriculum.length;

  return {
    ...session,
    completedSteps:
      session.completedSteps.length > 0
        ? session.completedSteps
        : buildSyntheticCompletedSteps(session.completedStepsCount),
    progressLabel: `${session.completedStepsCount} / ${Math.max(totalSteps, 1)} 步`,
  };
}

function buildStarterPrompts(
  profile: NonNullable<ReturnType<typeof useLearningWorkspace>['profile']>,
  workspaceSession: NonNullable<ReturnType<typeof useLearningWorkspace>['workspaceSession']>
) {
  const currentStep = profile.curriculum[workspaceSession.currentStepIndex] ?? null;
  return [
    currentStep?.guidingQuestion ?? '先用一句话说说你理解到哪里了',
    profile.sourceType === 'upload'
      ? '指出这份资料里最值得先看的一部分'
      : '用一句话说出这本书真正要解决的问题',
    '说说你现在最不确定的一个概念或步骤',
  ];
}

export function LearningWorkspaceProvider({
  children,
  profileId,
}: {
  children: React.ReactNode;
  profileId: number;
}) {
  const pathname = usePathname();
  const { mode } = useLocalSearchParams<{ mode?: string | string[] }>();
  const { activeTab, studyMode } = React.useMemo(
    () => resolveLearningWorkspaceNavigationState(pathname, mode),
    [mode, pathname]
  );
  const router = useRouter();
  const queryClient = useQueryClient();
  const { token } = useAppSession();
  const {
    isRetryPending,
    profile,
    retryGenerate,
    sessionsQuery,
    setWorkspaceSession,
    workspaceGate,
    workspaceSession,
  } = useLearningWorkspace(profileId, studyMode);
  const sessionMessagesQuery = useLearningSessionMessagesQuery(workspaceSession?.id ?? Number.NaN);
  const [draft, setDraft] = React.useState('');
  const [isSending, setIsSending] = React.useState(false);
  const renderedMessages = useLearningConversationStore((state) => state.messages);
  const latestEvaluation = useLearningConversationStore((state) => state.latestEvaluation);
  const latestStatus = useLearningConversationStore((state) => state.latestStatus);
  const latestSessionSignal = useLearningConversationStore((state) => state.latestSessionSignal);
  const hydrateConversationHistory = useLearningConversationStore((state) => state.hydrateHistory);
  const startConversationDraft = useLearningConversationStore((state) => state.startDraft);
  const applyConversationEvent = useLearningConversationStore((state) => state.applyEvent);
  const discardAssistantDraft = useLearningConversationStore((state) => state.discardAssistantDraft);
  const ensureResumeConversationDraft = useLearningConversationStore((state) => state.ensureResumeDraft);
  const clearConversationDraft = useLearningConversationStore((state) => state.clearDraft);
  const commitConversationDraft = useLearningConversationStore((state) => state.commitDraft);
  const setConversationLatestStatus = useLearningConversationStore((state) => state.setLatestStatus);
  const setConversationLatestSessionSignal = useLearningConversationStore(
    (state) => state.setLatestSessionSignal
  );
  const setConversationLatestEvaluation = useLearningConversationStore(
    (state) => state.setLatestEvaluation
  );
  const pendingRedirectReplayRef = React.useRef<{
    content: string;
    session: NonNullable<ReturnType<typeof useLearningWorkspace>['workspaceSession']>;
  } | null>(null);
  const lastResumeAttemptKeyRef = React.useRef<string | null>(null);

  const baseRenderedMessages = React.useMemo(
    () => createLearningRenderedMessages(sessionMessagesQuery.data ?? []),
    [sessionMessagesQuery.data]
  );

  React.useEffect(() => {
    if (!workspaceSession?.id) {
      return;
    }

    hydrateConversationHistory(baseRenderedMessages, workspaceSession.id);
  }, [baseRenderedMessages, hydrateConversationHistory, workspaceSession?.id]);

  const sourceCards = React.useMemo(
    () => (profile ? buildLearningWorkspaceSources(profile) : []),
    [profile]
  );
  const highlightCards = React.useMemo(
    () => (profile && workspaceSession ? buildLearningWorkspaceHighlights(profile, workspaceSession) : []),
    [profile, workspaceSession]
  );

  const starterPrompts = React.useMemo(() => {
    if ((sessionMessagesQuery.data?.length ?? 0) > 0 || renderedMessages.length > 0) {
      return [];
    }

    if (!profile || !workspaceSession) {
      return [];
    }

    return buildStarterPrompts(profile, workspaceSession);
  }, [profile, renderedMessages.length, sessionMessagesQuery.data, workspaceSession]);

  const updateMessagesCache = React.useCallback(
    (
      sessionId: number,
      userMessage: LearningWorkspaceRenderedMessage,
      assistantMessage: LearningSessionMessage
    ) => {
      queryClient.setQueryData(
        ['learning', 'sessions', 'messages', sessionId, token],
        (previous: unknown) => {
          const items = Array.isArray(previous) ? previous : [];
          const nextItems = [...items];

          const hasUser = nextItems.some(
            (message: any) => message.role === 'user' && message.content === userMessage.text
          );
          const hasAssistant = nextItems.some(
            (message: any) =>
              message.role === 'assistant' && message.content === assistantMessage.content
          );

          if (!hasUser) {
            nextItems.push(buildOptimisticUserHistoryMessage(sessionId, userMessage, assistantMessage));
          }
          if (!hasAssistant) {
            nextItems.push({
              citations: assistantMessage.citations ?? [],
              content: assistantMessage.content,
              createdAt: assistantMessage.createdAt ?? new Date().toISOString(),
              id: assistantMessage.id,
              role: 'assistant',
              learningSessionId: sessionId,
              presentation: assistantMessage.presentation ?? null,
            });
          }

          return nextItems;
        }
      );
    },
    [queryClient, token]
  );

  const updateSessionCaches = React.useCallback(
    (nextSession: NonNullable<ReturnType<typeof useLearningWorkspace>['workspaceSession']>) => {
      queryClient.setQueryData(['learning', 'sessions', 'detail', nextSession.id, token], nextSession);
      queryClient.setQueryData(['learning', 'sessions', token], (previous: unknown) => {
        const items = Array.isArray(previous) ? previous : [];
        const hasExisting = items.some((item: any) => item?.id === nextSession.id);

        if (!hasExisting) {
          return [nextSession, ...items];
        }

        return items.map((item: any) => (item?.id === nextSession.id ? nextSession : item));
      });
    },
    [queryClient, token]
  );

  const handleSend = React.useCallback(async (nextDraft?: string, options?: LearningSendOptions) => {
    const normalized = (nextDraft ?? draft).trim();
    const activeSession = options?.session ?? workspaceSession;
    const activeMode = options?.mode ?? studyMode;
    if (!normalized || !profile || !activeSession || !token || isSending) {
      return;
    }

    const previousLatestMessageId = Math.max(
      0,
      ...(sessionMessagesQuery.data ?? []).map((message) => Number(message.id) || 0)
    );

    const userMessageId = `local-user-${Date.now()}`;
    const assistantMessageId = `local-assistant-${Date.now()}`;
    const optimisticUserMessage: LearningWorkspaceRenderedMessage = {
      cards: [],
      id: userMessageId,
      presentation: null,
      role: 'user',
      streaming: false,
      text: normalized,
    };

    setDraft('');
    setConversationLatestEvaluation(null);
    setConversationLatestSessionSignal(null);
    setConversationLatestStatus(resolveLearningStreamStatusSignal());
    startConversationDraft({
      assistantMessageId,
      mode: activeMode,
      sessionId: activeSession.id,
      userMessageId,
      userText: normalized,
    });
    setIsSending(true);

    let currentStreamSession = activeSession;
    let finalAssistantMessage: LearningSessionMessage | null = null;
    let redirected = false;

    try {
      for await (const event of streamLearningSessionReply(activeSession.id, { content: normalized }, token)) {
        if (event.type === 'status') {
          setConversationLatestStatus(resolveLearningStreamStatusSignal(event.phase));
          continue;
        }

        if (
          event.type === 'assistant.delta' ||
          event.type === 'teacher.delta' ||
          event.type === 'peer.delta' ||
          event.type === 'explore.answer.delta' ||
          event.type === 'explore.reasoning.delta' ||
          event.type === 'evaluation' ||
          event.type === 'evidence.items' ||
          event.type === 'followups.items' ||
          event.type === 'bridge.actions' ||
          event.type === 'explore.related_concepts' ||
          event.type === 'assistant.final'
        ) {
          applyConversationEvent(event);
          if (event.type === 'assistant.final') {
            finalAssistantMessage = event.message;
            updateMessagesCache(activeSession.id, optimisticUserMessage, event.message);
          }
          continue;
        }

        if (event.type === 'session.redirect') {
          const nextSession = profile ? mergeLearningSessionWithProfile(profile, event.session) : event.session;
          pendingRedirectReplayRef.current = {
            content: normalized,
            session: nextSession,
          };
          redirected = true;
          clearConversationDraft();
          setConversationLatestStatus(resolveLearningRedirectStatusSignal());
          setWorkspaceSession(nextSession);
          updateSessionCaches(nextSession);
          router.replace(`/learning/${profileId}/study?mode=explore`);
          break;
        }

        if (event.type === 'session.updated') {
          const nextSession = profile ? mergeLearningSessionWithProfile(profile, event.session) : event.session;
          const nextSignal = {
            completedStepsCount: nextSession.completedStepsCount,
            currentStepIndex: nextSession.currentStepIndex,
            currentStepTitle: nextSession.currentStepTitle,
            progressLabel: nextSession.progressLabel,
            status: nextSession.status,
            transitionLabel: buildLearningSessionTransitionLabel(currentStreamSession, nextSession),
          };
          currentStreamSession = nextSession;
          setConversationLatestSessionSignal(nextSignal);
          setWorkspaceSession(nextSession);
          updateSessionCaches(nextSession);
          continue;
        }

        if (event.type === 'error') {
          throw new LibraryApiError(event.message, {
            code: event.code ?? 'learning_model_request_error',
            status: 503,
          });
        }
      }

      if (!finalAssistantMessage && !redirected) {
        throw new LibraryApiError('模型请求错误', {
          code: 'learning_model_request_error',
          status: 503,
        });
      }
    } catch (error) {
      const [messagesResult] = await Promise.allSettled([sessionMessagesQuery.refetch(), sessionsQuery.refetch()]);
      const syncedMessages =
        messagesResult.status === 'fulfilled' && Array.isArray(messagesResult.value.data)
          ? (messagesResult.value.data as LearningSessionMessage[])
          : (sessionMessagesQuery.data ?? []);
      const recoveredAssistantReply =
        !finalAssistantMessage &&
        syncedMessages.some(
          (message) => message.role === 'assistant' && (Number(message.id) || 0) > previousLatestMessageId
        );
      const hasVisibleDraftReply = !finalAssistantMessage && hasVisibleAssistantDraftContent();

      if (recoveredAssistantReply) {
        discardAssistantDraft();
        setConversationLatestStatus(null);
      } else if (hasVisibleDraftReply) {
        commitConversationDraft();
        setConversationLatestStatus({
          label: '这一轮回复连接中断，已保留当前内容并继续和后端同步。',
          tone: 'warning',
        });
      } else if (!finalAssistantMessage) {
        discardAssistantDraft();
        setConversationLatestStatus({
          label: '模型请求错误',
          tone: 'warning',
        });
        toast.error(getLibraryErrorMessage(error, getLearningReplyFailureFallback(activeMode)));
      }
    } finally {
      setIsSending(false);
    }
  }, [
    applyConversationEvent,
    discardAssistantDraft,
    clearConversationDraft,
    commitConversationDraft,
    draft,
    isSending,
    profile,
    profileId,
    router,
    sessionMessagesQuery,
    sessionsQuery,
    setConversationLatestEvaluation,
    setConversationLatestSessionSignal,
    setConversationLatestStatus,
    setWorkspaceSession,
    startConversationDraft,
    studyMode,
    token,
    updateMessagesCache,
    updateSessionCaches,
    workspaceSession,
  ]);

  React.useEffect(() => {
    const pendingReplay = pendingRedirectReplayRef.current;
    if (
      !pendingReplay ||
      isSending ||
      studyMode !== 'explore' ||
      workspaceSession?.id !== pendingReplay.session.id
    ) {
      return;
    }

    pendingRedirectReplayRef.current = null;
    void handleSend(pendingReplay.content, {
      mode: 'explore',
      session: pendingReplay.session,
    });
  }, [handleSend, isSending, studyMode, workspaceSession]);

  React.useEffect(() => {
    if (studyMode !== 'explore' || !workspaceSession?.id || !token || isSending) {
      return;
    }

    const resumeAttemptKey = `${studyMode}:${workspaceSession.id}`;
    if (lastResumeAttemptKeyRef.current === resumeAttemptKey) {
      return;
    }
    lastResumeAttemptKeyRef.current = resumeAttemptKey;

    let cancelled = false;

    const resumeStream = async () => {
      let finalAssistantMessage: LearningSessionMessage | null = null;
      let resumeUserText: string | null = null;

      setIsSending(true);
      try {
        for await (const event of resumeLearningSessionReply(workspaceSession.id, token)) {
          if (cancelled) {
            return;
          }

          if (event.type === 'resume.user_message') {
            resumeUserText = event.text;
            ensureResumeConversationDraft({
              assistantMessageId: `resume-assistant-${workspaceSession.id}`,
              mode: 'explore',
              sessionId: workspaceSession.id,
              userMessageId: event.messageId ?? `resume-user-${workspaceSession.id}`,
              userText: event.text,
            });
            continue;
          }

          if (event.type === 'status') {
            setConversationLatestStatus(resolveLearningStreamStatusSignal(event.phase));
            continue;
          }

          if (
            event.type === 'assistant.delta' ||
            event.type === 'teacher.delta' ||
            event.type === 'peer.delta' ||
            event.type === 'explore.answer.delta' ||
            event.type === 'explore.reasoning.delta' ||
            event.type === 'evaluation' ||
            event.type === 'evidence.items' ||
            event.type === 'followups.items' ||
            event.type === 'bridge.actions' ||
            event.type === 'explore.related_concepts' ||
            event.type === 'assistant.final'
          ) {
            applyConversationEvent(event);
            if (event.type === 'assistant.final') {
              finalAssistantMessage = event.message;
              if (resumeUserText) {
                updateMessagesCache(
                  workspaceSession.id,
                  {
                    cards: [],
                    id: `resume-user-${workspaceSession.id}`,
                    presentation: null,
                    role: 'user',
                    streaming: false,
                    text: resumeUserText,
                  },
                  event.message
                );
              }
            }
            continue;
          }

          if (event.type === 'error') {
            throw new LibraryApiError(event.message, {
              code: event.code ?? 'learning_model_request_error',
              status: 503,
            });
          }
        }

        if (finalAssistantMessage) {
          setConversationLatestStatus(null);
        }
      } catch (error) {
        if (cancelled) {
          return;
        }

        if (hasVisibleAssistantDraftContent()) {
          commitConversationDraft();
          setConversationLatestStatus({
            label: '这一轮回复连接中断，已保留当前内容并继续和后端同步。',
            tone: 'warning',
          });
        } else {
          discardAssistantDraft();
          setConversationLatestStatus({
            label: '模型请求错误',
            tone: 'warning',
          });
          toast.error(getLibraryErrorMessage(error, getLearningReplyFailureFallback('explore')));
        }
      } finally {
        if (!cancelled) {
          setIsSending(false);
        }
      }
    };

    void resumeStream();

    return () => {
      cancelled = true;
    };
  }, [
    applyConversationEvent,
    commitConversationDraft,
    discardAssistantDraft,
    ensureResumeConversationDraft,
    setConversationLatestStatus,
    token,
    updateMessagesCache,
    workspaceSession,
    studyMode,
  ]);

  const navigateToTab = React.useCallback(
    (tab: LearningWorkspaceTab) => {
      if (!Number.isFinite(profileId) || profileId <= 0) {
        return;
      }

      if (tab === 'study') {
        router.replace(`/learning/${profileId}/study?mode=${studyMode}`);
        return;
      }

      if (tab === activeTab) {
        return;
      }

      router.replace(`/learning/${profileId}/${tab}`);
    },
    [activeTab, profileId, router, studyMode]
  );
  const navigateToStudyMode = React.useCallback(
    (nextMode: LearningStudyMode) => {
      if (!Number.isFinite(profileId) || profileId <= 0) {
        return;
      }

      if (activeTab === 'study' && studyMode === nextMode) {
        return;
      }

      router.replace(`/learning/${profileId}/study?mode=${nextMode}`);
    },
    [activeTab, profileId, router, studyMode]
  );
  const closeWorkspace = React.useCallback(() => {
    if (router.canDismiss()) {
      router.dismiss();
    } else {
      router.replace('/learning');
    }
  }, [router]);
  const openOverview = React.useCallback(() => {
    if (!Number.isFinite(profileId) || profileId <= 0) {
      return;
    }

    router.push(`/learning/${profileId}/overview`);
  }, [profileId, router]);
  const openInfoSheet = React.useCallback(
    (panel: LearningWorkspaceInfoPanel = 'highlights') => {
      if (!Number.isFinite(profileId) || profileId <= 0) {
        return;
      }

      router.push(`/learning/${profileId}/info-sheet?panel=${panel}`);
    },
    [profileId, router]
  );

  const value = React.useMemo<LearningWorkspaceContextValue>(
    () => ({
      activeTab,
      closeWorkspace,
      draft,
      footerInset: resolveLearningWorkspaceFooterInset(activeTab),
      handleSend,
      highlightCards,
      latestEvaluation,
      latestSessionSignal,
      latestStatus,
      navigateToStudyMode,
      navigateToTab,
      openInfoSheet,
      openOverview,
      profile,
      renderedMessages,
      replaceWorkspaceSession: setWorkspaceSession,
      retryGenerate,
      setDraft,
      sourceCount: sourceCards.length,
      sourceCards,
      sourceSummary: profile ? resolveLearningWorkspaceSourceSummary(profile) : '',
      starterPrompts,
      studyMode,
      workspaceGate,
      workspaceSession,
      isRetryPending,
    }),
    [
      activeTab,
      closeWorkspace,
      draft,
      handleSend,
      isRetryPending,
      highlightCards,
      latestEvaluation,
      latestSessionSignal,
      latestStatus,
      navigateToStudyMode,
      navigateToTab,
      openInfoSheet,
      openOverview,
      profile,
      renderedMessages,
      setWorkspaceSession,
      retryGenerate,
      sourceCards,
      starterPrompts,
      studyMode,
      workspaceGate,
      workspaceSession,
    ]
  );

  return <LearningWorkspaceContext.Provider value={value}>{children}</LearningWorkspaceContext.Provider>;
}

export function useLearningWorkspaceScreen() {
  const context = React.useContext(LearningWorkspaceContext);

  if (!context) {
    throw new Error('useLearningWorkspaceScreen must be used within LearningWorkspaceProvider');
  }

  return context;
}

export { resolveLearningWorkspaceStatusDescription };
