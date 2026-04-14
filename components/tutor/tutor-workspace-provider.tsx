import { useQueryClient } from '@tanstack/react-query';
import { usePathname } from 'expo-router';
import React from 'react';
import { toast } from 'sonner-native';

import { useAppSession } from '@/hooks/use-app-session';
import { useTutorSessionMessagesQuery } from '@/hooks/use-library-app-data';
import {
  resolveTutorWorkspaceSourceSummary,
  resolveTutorWorkspaceStatusDescription,
  useTutorWorkspace,
} from '@/hooks/use-tutor-workspace';
import { getLibraryErrorMessage } from '@/lib/api/client';
import { streamTutorSessionReply } from '@/lib/api/tutor';
import type { TutorStepEvaluation } from '@/lib/api/types';
import {
  buildSyntheticCompletedSteps,
  buildTutorSessionTransitionLabel,
  buildTutorWorkspaceHighlights,
  buildTutorWorkspaceSources,
  createTutorRenderedMessages,
  resolveTutorStreamStatusSignal,
  type TutorWorkspaceInsightCard,
  type TutorWorkspaceRenderedMessage,
  type TutorWorkspaceSessionSignal,
  type TutorWorkspaceSourceCard,
  type TutorWorkspaceStatusSignal,
} from '@/lib/tutor/workspace';

export type TutorWorkspaceTab = 'guide' | 'more' | 'sources';

type TutorWorkspaceContextValue = {
  draft: string;
  footerInset: number;
  handleSend: (nextDraft?: string) => Promise<void>;
  highlightCards: TutorWorkspaceInsightCard[];
  latestEvaluation: TutorStepEvaluation | null;
  latestSessionSignal: TutorWorkspaceSessionSignal | null;
  latestStatus: TutorWorkspaceStatusSignal | null;
  profile: ReturnType<typeof useTutorWorkspace>['profile'];
  renderedMessages: TutorWorkspaceRenderedMessage[];
  setDraft: React.Dispatch<React.SetStateAction<string>>;
  sourceCount: number;
  sourceCards: TutorWorkspaceSourceCard[];
  sourceSummary: string;
  starterPrompts: string[];
  workspaceSession: ReturnType<typeof useTutorWorkspace>['workspaceSession'];
};

const TutorWorkspaceContext = React.createContext<TutorWorkspaceContextValue | null>(null);

export function resolveTutorWorkspaceActiveTab(pathname: string): TutorWorkspaceTab {
  if (pathname.endsWith('/sources')) {
    return 'sources';
  }

  if (pathname.endsWith('/more')) {
    return 'more';
  }

  return 'guide';
}

function resolveTutorWorkspaceFooterInset(_tab: TutorWorkspaceTab) {
  return 24;
}

function mergeTutorSessionWithProfile(
  profile: NonNullable<ReturnType<typeof useTutorWorkspace>['profile']>,
  session: NonNullable<ReturnType<typeof useTutorWorkspace>['workspaceSession']>
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
  profile: NonNullable<ReturnType<typeof useTutorWorkspace>['profile']>,
  workspaceSession: NonNullable<ReturnType<typeof useTutorWorkspace>['workspaceSession']>
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

export function TutorWorkspaceProvider({
  children,
  profileId,
}: {
  children: React.ReactNode;
  profileId: number;
}) {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { token } = useAppSession();
  const { profile, sessionsQuery, setWorkspaceSession, workspaceSession } = useTutorWorkspace(profileId);
  const sessionMessagesQuery = useTutorSessionMessagesQuery(workspaceSession?.id ?? Number.NaN);
  const [draft, setDraft] = React.useState('');
  const [localMessages, setLocalMessages] = React.useState<TutorWorkspaceRenderedMessage[]>([]);
  const [latestEvaluation, setLatestEvaluation] = React.useState<TutorStepEvaluation | null>(null);
  const [latestStatus, setLatestStatus] = React.useState<TutorWorkspaceStatusSignal | null>(null);
  const [latestSessionSignal, setLatestSessionSignal] =
    React.useState<TutorWorkspaceSessionSignal | null>(null);
  const [isSending, setIsSending] = React.useState(false);

  const baseRenderedMessages = React.useMemo(
    () => createTutorRenderedMessages(sessionMessagesQuery.data ?? []),
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
    () => (profile ? buildTutorWorkspaceSources(profile) : []),
    [profile]
  );
  const highlightCards = React.useMemo(
    () => (profile && workspaceSession ? buildTutorWorkspaceHighlights(profile, workspaceSession) : []),
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
    (sessionId: number, userMessage: TutorWorkspaceRenderedMessage, assistantMessage: TutorWorkspaceRenderedMessage) => {
      queryClient.setQueryData(
        ['tutor', 'sessions', 'messages', sessionId, token],
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
              tutorSessionId: sessionId,
            });
          }
          if (!hasAssistant) {
            nextItems.push({
              content: assistantMessage.text,
              createdAt: new Date().toISOString(),
              id: -Date.now() - 1,
              role: 'assistant',
              tutorSessionId: sessionId,
            });
          }

          return nextItems;
        }
      );
    },
    [queryClient, token]
  );

  const updateSessionCaches = React.useCallback(
    (nextSession: NonNullable<ReturnType<typeof useTutorWorkspace>['workspaceSession']>) => {
      queryClient.setQueryData(['tutor', 'sessions', 'detail', nextSession.id, token], nextSession);
      queryClient.setQueryData(['tutor', 'sessions', token], (previous: unknown) => {
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
    const optimisticUserMessage: TutorWorkspaceRenderedMessage = {
      id: userMessageId,
      role: 'user',
      streaming: false,
      text: normalized,
    };

    setDraft('');
    setLatestEvaluation(null);
    setLatestSessionSignal(null);
    setLatestStatus(resolveTutorStreamStatusSignal());
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
      let finalAssistantMessage: TutorWorkspaceRenderedMessage | null = null;

      for await (const event of streamTutorSessionReply(
        workspaceSession.id,
        { content: normalized },
        token
      )) {
        if (event.type === 'status') {
          setLatestStatus(resolveTutorStreamStatusSignal(event.phase));
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
          const nextSession = profile ? mergeTutorSessionWithProfile(profile, event.session) : event.session;
          setLatestSessionSignal({
            completedStepsCount: nextSession.completedStepsCount,
            currentStepIndex: nextSession.currentStepIndex,
            currentStepTitle: nextSession.currentStepTitle,
            progressLabel: nextSession.progressLabel,
            status: nextSession.status,
            transitionLabel: buildTutorSessionTransitionLabel(workspaceSession, nextSession),
          });
          setWorkspaceSession(nextSession);
          updateSessionCaches(nextSession);
          continue;
        }

        if (event.type === 'assistant.done') {
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

  const activeTab = resolveTutorWorkspaceActiveTab(pathname);

  const value = React.useMemo<TutorWorkspaceContextValue>(
    () => ({
      draft,
      footerInset: resolveTutorWorkspaceFooterInset(activeTab),
      handleSend,
      highlightCards,
      latestEvaluation,
      latestSessionSignal,
      latestStatus,
      profile,
      renderedMessages,
      setDraft,
      sourceCount: sourceCards.length,
      sourceCards,
      sourceSummary: profile ? resolveTutorWorkspaceSourceSummary(profile) : '',
      starterPrompts,
      workspaceSession,
    }),
    [
      activeTab,
      draft,
      handleSend,
      highlightCards,
      latestEvaluation,
      latestSessionSignal,
      latestStatus,
      profile,
      renderedMessages,
      sourceCards,
      starterPrompts,
      workspaceSession,
    ]
  );

  return <TutorWorkspaceContext.Provider value={value}>{children}</TutorWorkspaceContext.Provider>;
}

export function useTutorWorkspaceScreen() {
  const context = React.useContext(TutorWorkspaceContext);

  if (!context) {
    throw new Error('useTutorWorkspaceScreen must be used within TutorWorkspaceProvider');
  }

  return context;
}

export { resolveTutorWorkspaceStatusDescription };
