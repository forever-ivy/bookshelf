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
import { getLibraryErrorMessage } from '@/lib/api/client';
import { streamLearningSessionReply } from '@/lib/api/learning';
import type { LearningSessionMessage, LearningStepEvaluation } from '@/lib/api/types';
import {
  buildSyntheticCompletedSteps,
  buildLearningSessionTransitionLabel,
  buildLearningWorkspaceHighlights,
  buildLearningWorkspaceSources,
  createLearningRenderedMessages,
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

type LearningWorkspaceContextValue = {
  activeTab: LearningWorkspaceTab;
  closeWorkspace: () => void;
  draft: string;
  footerInset: number;
  handleSend: (nextDraft?: string) => Promise<void>;
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

export function resolveLearningWorkspaceNavigationState(
  pathname: string,
  modeParam?: string | string[]
) {
  if (pathname.endsWith('/graph')) {
    return {
      activeTab: 'graph' as const,
      studyMode: 'guide' as const,
    };
  }

  if (pathname.endsWith('/review')) {
    return {
      activeTab: 'review' as const,
      studyMode: 'guide' as const,
    };
  }

  const normalizedMode = Array.isArray(modeParam) ? modeParam[0] : modeParam;

  return {
    activeTab: 'study' as const,
    studyMode:
      normalizedMode === 'explore' || pathname.endsWith('/explore') ? ('explore' as const) : ('guide' as const),
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
  } = useLearningWorkspace(profileId);
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
  const clearConversationDraft = useLearningConversationStore((state) => state.clearDraft);
  const resetConversation = useLearningConversationStore((state) => state.reset);
  const setConversationLatestStatus = useLearningConversationStore((state) => state.setLatestStatus);
  const setConversationLatestSessionSignal = useLearningConversationStore(
    (state) => state.setLatestSessionSignal
  );
  const setConversationLatestEvaluation = useLearningConversationStore(
    (state) => state.setLatestEvaluation
  );

  const baseRenderedMessages = React.useMemo(
    () => createLearningRenderedMessages(sessionMessagesQuery.data ?? []),
    [sessionMessagesQuery.data]
  );

  React.useEffect(() => {
    resetConversation();
  }, [resetConversation, workspaceSession?.id]);

  React.useEffect(() => {
    hydrateConversationHistory(baseRenderedMessages);
  }, [baseRenderedMessages, hydrateConversationHistory]);

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
            nextItems.push({
              content: userMessage.text,
              createdAt: new Date().toISOString(),
              id: -Date.now(),
              role: 'user',
              learningSessionId: sessionId,
            });
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

  const { activeTab, studyMode } = React.useMemo(
    () => resolveLearningWorkspaceNavigationState(pathname, mode),
    [mode, pathname]
  );

  const handleSend = React.useCallback(async (nextDraft?: string) => {
    const normalized = (nextDraft ?? draft).trim();
    if (!normalized || !profile || !workspaceSession || !token || isSending) {
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
      mode: studyMode,
      userMessageId,
      userText: normalized,
    });
    setIsSending(true);

    let finalAssistantMessage: LearningSessionMessage | null = null;

    try {
      for await (const event of streamLearningSessionReply(
        workspaceSession.id,
        { content: normalized },
        token
      )) {
        if (event.type === 'status') {
          setConversationLatestStatus(resolveLearningStreamStatusSignal(event.phase));
          continue;
        }

        if (
          event.type === 'assistant.delta' ||
          event.type === 'teacher.delta' ||
          event.type === 'peer.delta' ||
          event.type === 'explore.answer.delta' ||
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
            updateMessagesCache(workspaceSession.id, optimisticUserMessage, event.message);
          }
          continue;
        }

        if (event.type === 'session.updated') {
          const nextSession = profile ? mergeLearningSessionWithProfile(profile, event.session) : event.session;
          const nextSignal = {
            completedStepsCount: nextSession.completedStepsCount,
            currentStepIndex: nextSession.currentStepIndex,
            currentStepTitle: nextSession.currentStepTitle,
            progressLabel: nextSession.progressLabel,
            status: nextSession.status,
            transitionLabel: buildLearningSessionTransitionLabel(workspaceSession, nextSession),
          };
          setConversationLatestSessionSignal(nextSignal);
          setWorkspaceSession(nextSession);
          updateSessionCaches(nextSession);
          continue;
        }

        if (event.type === 'error') {
          throw new Error(event.message);
        }
      }

      if (!finalAssistantMessage) {
        clearConversationDraft();
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

      if (recoveredAssistantReply) {
        clearConversationDraft();
        setConversationLatestStatus(null);
      } else if (!finalAssistantMessage) {
        clearConversationDraft();
        setConversationLatestStatus({
          label: '这一轮导学没有成功返回，正在和后端重新同步。',
          tone: 'warning',
        });
        toast.error(getLibraryErrorMessage(error, '导学回复失败，请稍后再试。'));
      }
    } finally {
      setIsSending(false);
    }
  }, [
    draft,
    isSending,
    profile,
    sessionMessagesQuery,
    sessionsQuery,
    setWorkspaceSession,
    token,
    updateMessagesCache,
    updateSessionCaches,
    workspaceSession,
    studyMode,
    applyConversationEvent,
    clearConversationDraft,
    setConversationLatestEvaluation,
    setConversationLatestSessionSignal,
    setConversationLatestStatus,
    startConversationDraft,
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
    router.replace('/learning');
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
