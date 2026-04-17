import { useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter } from 'expo-router';
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
import type { LearningStepEvaluation } from '@/lib/api/types';
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

export type LearningWorkspaceMode = 'guide' | 'explore' | 'graph' | 'review';
export type LearningWorkspaceInfoPanel = 'highlights' | 'path' | 'sources';

type LearningWorkspaceContextValue = {
  activeMode: LearningWorkspaceMode;
  closeWorkspace: () => void;
  draft: string;
  footerInset: number;
  handleSend: (nextDraft?: string) => Promise<void>;
  highlightCards: LearningWorkspaceInsightCard[];
  latestEvaluation: LearningStepEvaluation | null;
  latestSessionSignal: LearningWorkspaceSessionSignal | null;
  latestStatus: LearningWorkspaceStatusSignal | null;
  navigateToMode: (mode: LearningWorkspaceMode) => void;
  openInfoSheet: (panel?: LearningWorkspaceInfoPanel) => void;
  profile: ReturnType<typeof useLearningWorkspace>['profile'];
  renderedMessages: LearningWorkspaceRenderedMessage[];
  retryGenerate: (profileId?: number) => Promise<void>;
  setDraft: React.Dispatch<React.SetStateAction<string>>;
  sourceCount: number;
  sourceCards: LearningWorkspaceSourceCard[];
  sourceSummary: string;
  starterPrompts: string[];
  workspaceGate: LearningWorkspaceGate;
  workspaceSession: ReturnType<typeof useLearningWorkspace>['workspaceSession'];
  isRetryPending: boolean;
};

const LearningWorkspaceContext = React.createContext<LearningWorkspaceContextValue | null>(null);

export function resolveLearningWorkspaceActiveMode(pathname: string): LearningWorkspaceMode {
  if (pathname.endsWith('/explore')) {
    return 'explore';
  }

  if (pathname.endsWith('/graph')) {
    return 'graph';
  }

  if (pathname.endsWith('/review')) {
    return 'review';
  }

  return 'guide';
}

function resolveLearningWorkspaceFooterInset(_mode: LearningWorkspaceMode) {
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
  const [localMessages, setLocalMessages] = React.useState<LearningWorkspaceRenderedMessage[]>([]);
  const [latestEvaluation, setLatestEvaluation] = React.useState<LearningStepEvaluation | null>(null);
  const [latestStatus, setLatestStatus] = React.useState<LearningWorkspaceStatusSignal | null>(null);
  const [latestSessionSignal, setLatestSessionSignal] =
    React.useState<LearningWorkspaceSessionSignal | null>(null);
  const [isSending, setIsSending] = React.useState(false);

  const baseRenderedMessages = React.useMemo(
    () => createLearningRenderedMessages(sessionMessagesQuery.data ?? []),
    [sessionMessagesQuery.data]
  );

  React.useEffect(() => {
    if (localMessages.length === 0) {
      return;
    }

    const localAssistant = localMessages.findLast((message) => message.role === 'assistant');
    const historyContainsAssistant = baseRenderedMessages.some(
      (message) => message.role === 'assistant' && message.text === localAssistant?.text && !message.streaming
    );

    if (historyContainsAssistant) {
      setLocalMessages([]);
    }
  }, [baseRenderedMessages, localMessages]);

  const renderedMessages = React.useMemo(
    () => [...baseRenderedMessages, ...localMessages],
    [baseRenderedMessages, localMessages]
  );

  const sourceCards = React.useMemo(
    () => (profile ? buildLearningWorkspaceSources(profile) : []),
    [profile]
  );
  const highlightCards = React.useMemo(
    () => (profile && workspaceSession ? buildLearningWorkspaceHighlights(profile, workspaceSession) : []),
    [profile, workspaceSession]
  );

  const starterPrompts = React.useMemo(() => {
    if ((sessionMessagesQuery.data?.length ?? 0) > 0 || localMessages.length > 0) {
      return [];
    }

    if (!profile || !workspaceSession) {
      return [];
    }

    return buildStarterPrompts(profile, workspaceSession);
  }, [localMessages.length, profile, sessionMessagesQuery.data, workspaceSession]);

  const updateMessagesCache = React.useCallback(
    (sessionId: number, userMessage: LearningWorkspaceRenderedMessage, assistantMessage: LearningWorkspaceRenderedMessage) => {
      queryClient.setQueryData(
        ['learning', 'sessions', 'messages', sessionId, token],
        (previous: unknown) => {
          const items = Array.isArray(previous) ? previous : [];
          const nextItems = [...items];

          const hasUser = nextItems.some(
            (message: any) => message.role === 'user' && message.content === userMessage.text
          );
          const hasAssistant = nextItems.some(
            (message: any) => message.role === 'assistant' && message.content === assistantMessage.text
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
              content: assistantMessage.text,
              createdAt: new Date().toISOString(),
              id: -Date.now() - 1,
              role: 'assistant',
              learningSessionId: sessionId,
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

  const handleSend = React.useCallback(async (nextDraft?: string) => {
    const normalized = (nextDraft ?? draft).trim();
    if (!normalized || !profile || !workspaceSession || !token || isSending) {
      return;
    }

    const userMessageId = `local-user-${Date.now()}`;
    const assistantMessageId = `local-assistant-${Date.now()}`;
    const optimisticUserMessage: LearningWorkspaceRenderedMessage = {
      id: userMessageId,
      role: 'user',
      streaming: false,
      text: normalized,
    };

    setDraft('');
    setLatestEvaluation(null);
    setLatestSessionSignal(null);
    setLatestStatus(resolveLearningStreamStatusSignal());
    setLocalMessages([
      optimisticUserMessage,
      {
        id: assistantMessageId,
        role: 'assistant',
        streaming: true,
        text: '',
      },
    ]);
    setIsSending(true);

    try {
      let finalAssistantMessage: LearningWorkspaceRenderedMessage | null = null;

      for await (const event of streamLearningSessionReply(
        workspaceSession.id,
        { content: normalized },
        token
      )) {
        if (event.type === 'status') {
          setLatestStatus(resolveLearningStreamStatusSignal(event.phase));
          continue;
        }

        if (event.type === 'assistant.delta') {
          setLocalMessages((current) =>
            current.map((message) =>
              message.id === assistantMessageId
                ? {
                    ...message,
                    text: `${message.text}${event.delta}`,
                  }
                : message
            )
          );
          continue;
        }

        if (event.type === 'evaluation') {
          setLatestEvaluation(event.evaluation);
          continue;
        }

        if (event.type === 'session.updated') {
          const nextSession = profile ? mergeLearningSessionWithProfile(profile, event.session) : event.session;
          setLatestSessionSignal({
            completedStepsCount: nextSession.completedStepsCount,
            currentStepIndex: nextSession.currentStepIndex,
            currentStepTitle: nextSession.currentStepTitle,
            progressLabel: nextSession.progressLabel,
            status: nextSession.status,
            transitionLabel: buildLearningSessionTransitionLabel(workspaceSession, nextSession),
          });
          setWorkspaceSession(nextSession);
          updateSessionCaches(nextSession);
          continue;
        }

        if (event.type === 'assistant.final') {
          finalAssistantMessage = {
            id: `message-${event.message.id}`,
            role: 'assistant',
            streaming: false,
            text: event.message.content,
          };
          setLocalMessages([
            optimisticUserMessage,
            finalAssistantMessage,
          ]);
          updateMessagesCache(workspaceSession.id, optimisticUserMessage, finalAssistantMessage);
          continue;
        }

        if (event.type === 'error') {
          throw new Error(event.message);
        }
      }

      if (!finalAssistantMessage) {
        setLocalMessages([]);
      }
    } catch (error) {
      setLocalMessages([]);
      setLatestStatus({
        label: '这一轮导学没有成功返回，正在和后端重新同步。',
        tone: 'warning',
      });
      toast.error(getLibraryErrorMessage(error, '导学回复失败，请稍后再试。'));
      await Promise.allSettled([sessionMessagesQuery.refetch(), sessionsQuery.refetch()]);
    } finally {
      setIsSending(false);
    }
  }, [
    draft,
    isSending,
    profile,
    queryClient,
    sessionMessagesQuery,
    sessionsQuery,
    setWorkspaceSession,
    token,
    updateMessagesCache,
    updateSessionCaches,
    workspaceSession,
  ]);

  const activeMode = resolveLearningWorkspaceActiveMode(pathname);
  const navigateToMode = React.useCallback(
    (mode: LearningWorkspaceMode) => {
      if (mode === activeMode || !Number.isFinite(profileId) || profileId <= 0) {
        return;
      }

      router.replace(`/learning/${profileId}/${mode}`);
    },
    [activeMode, profileId, router]
  );
  const closeWorkspace = React.useCallback(() => {
    router.replace('/learning');
  }, [router]);
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
      activeMode,
      closeWorkspace,
      draft,
      footerInset: resolveLearningWorkspaceFooterInset(activeMode),
      handleSend,
      highlightCards,
      latestEvaluation,
      latestSessionSignal,
      latestStatus,
      navigateToMode,
      openInfoSheet,
      profile,
      renderedMessages,
      retryGenerate,
      setDraft,
      sourceCount: sourceCards.length,
      sourceCards,
      sourceSummary: profile ? resolveLearningWorkspaceSourceSummary(profile) : '',
      starterPrompts,
      workspaceGate,
      workspaceSession,
      isRetryPending,
    }),
    [
      activeMode,
      closeWorkspace,
      draft,
      handleSend,
      isRetryPending,
      highlightCards,
      latestEvaluation,
      latestSessionSignal,
      latestStatus,
      navigateToMode,
      openInfoSheet,
      profile,
      renderedMessages,
      retryGenerate,
      sourceCards,
      starterPrompts,
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
