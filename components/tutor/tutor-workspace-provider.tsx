import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { fetch as expoFetch } from 'expo/fetch';
import { usePathname } from 'expo-router';
import React from 'react';
import { toast } from 'sonner-native';

import { useTutorSessionMessagesQuery } from '@/hooks/use-library-app-data';
import {
  resolveTutorWorkspaceSourceSummary,
  resolveTutorWorkspaceStatusDescription,
  useTutorWorkspace,
} from '@/hooks/use-tutor-workspace';
import { generateAPIUrl } from '@/lib/generate-api-url';
import {
  buildTutorBookSummaryMarkdown,
  buildTutorWorkspaceHighlights,
  buildTutorWorkspaceSources,
  isTutorOneTimeDemoPrompt,
  createInitialTutorChatMessages,
  extractTextFromUIMessage,
  type TutorChatEvaluationPart,
  type TutorChatSessionPart,
  type TutorChatStatusPart,
  type TutorUIMessage,
} from '@/lib/tutor/mock-chat';

export type TutorWorkspaceTab = 'guide' | 'more' | 'sources';
export type TutorWorkspaceDraftSource = {
  addedAt: string;
  id: string;
  kind: 'document' | 'image' | 'pdf';
  name: string;
  status: 'indexed' | 'preparing';
};

type DemoTypingStep = {
  chunk: string;
  delayMs: number;
};

type TutorWorkspaceContextValue = {
  addDraftSource: () => void;
  draft: string;
  footerInset: number;
  handleSend: (nextDraft?: string) => Promise<void>;
  highlightCards: ReturnType<typeof buildTutorWorkspaceHighlights>;
  latestEvaluation: TutorChatEvaluationPart | null;
  latestSessionSignal: TutorChatSessionPart | null;
  latestStatus: TutorChatStatusPart | null;
  profile: ReturnType<typeof useTutorWorkspace>['profile'];
  renderedMessages: {
    id: string;
    role: string;
    thinking?: boolean;
    thinkingLabel?: string;
    streaming: boolean;
    text: string;
  }[];
  setDraft: React.Dispatch<React.SetStateAction<string>>;
  sourceCount: number;
  sourceCards: ReturnType<typeof buildTutorWorkspaceSources>;
  sourceDrafts: TutorWorkspaceDraftSource[];
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

function resolveTutorWorkspaceFooterInset(tab: TutorWorkspaceTab) {
  switch (tab) {
    case 'sources':
      return 24;
    case 'more':
      return 24;
    case 'guide':
    default:
      return 24;
  }
}

function buildDemoTypingSteps(text: string) {
  const segments = text.match(/[\s\S]{1,4}/g) ?? [text];

  return segments.reduce<DemoTypingStep[]>((steps, chunk) => {
    const trimmed = chunk.trim();
    let delayMs = 96;

    if (!trimmed) {
      delayMs = 70;
    } else if (/\n\n/.test(chunk)) {
      delayMs = 420;
    } else if (/\n/.test(chunk)) {
      delayMs = 240;
    } else if (/[。！？.!?]$/.test(trimmed)) {
      delayMs = 320;
    } else if (/[，、】【；：,;:]$/.test(trimmed)) {
      delayMs = 180;
    } else if (/^#{1,6}/.test(trimmed)) {
      delayMs = 280;
    } else if (/^- /.test(trimmed)) {
      delayMs = 220;
    }

    steps.push({ chunk, delayMs });
    return steps;
  }, []);
}

export function TutorWorkspaceProvider({
  children,
  profileId,
}: {
  children: React.ReactNode;
  profileId: number;
}) {
  const pathname = usePathname();
  const { profile, setWorkspaceSession, workspaceSession } = useTutorWorkspace(profileId);
  const sessionMessagesQuery = useTutorSessionMessagesQuery(workspaceSession?.id ?? Number.NaN);
  const [draft, setDraft] = React.useState('');
  const [demoMessages, setDemoMessages] = React.useState<TutorWorkspaceContextValue['renderedMessages']>([]);
  const [sourceDrafts, setSourceDrafts] = React.useState<TutorWorkspaceDraftSource[]>([]);
  const [latestEvaluation, setLatestEvaluation] = React.useState<TutorChatEvaluationPart | null>(
    null
  );
  const [latestStatus, setLatestStatus] = React.useState<TutorChatStatusPart | null>(null);
  const [latestSessionSignal, setLatestSessionSignal] =
    React.useState<TutorChatSessionPart | null>(null);
  const demoTimersRef = React.useRef<ReturnType<typeof setTimeout>[]>([]);
  const transport = React.useMemo(
    () =>
      new DefaultChatTransport({
        api: generateAPIUrl('/api/tutor-chat'),
        fetch: expoFetch as typeof globalThis.fetch,
      }),
    []
  );

  const initialMessages = React.useMemo(
    () =>
      profile && workspaceSession
        ? createInitialTutorChatMessages(profile, workspaceSession, sessionMessagesQuery.data ?? [])
        : [],
    [profile, sessionMessagesQuery.data, workspaceSession]
  );
  const sourceCards = React.useMemo(
    () => (profile && workspaceSession ? buildTutorWorkspaceSources(profile, workspaceSession) : []),
    [profile, workspaceSession]
  );
  const highlightCards = React.useMemo(
    () =>
      profile && workspaceSession ? buildTutorWorkspaceHighlights(profile, workspaceSession) : [],
    [profile, workspaceSession]
  );

  const { messages, sendMessage, status } = useChat<TutorUIMessage>({
    id:
      profile && workspaceSession
        ? `tutor-workspace-${profile.id}-${workspaceSession.id}-${sessionMessagesQuery.data?.length ?? 0}`
        : 'tutor-workspace-pending',
    messages: initialMessages,
    onData: (part) => {
      if (part.type === 'data-tutorStatus') {
        setLatestStatus(part.data);
      }

      if (part.type === 'data-tutorEvaluation') {
        setLatestEvaluation(part.data);
      }

      if (part.type === 'data-tutorSession') {
        setLatestSessionSignal(part.data);
        setWorkspaceSession((current) =>
          current
            ? {
                ...current,
                completedStepsCount: part.data.completedStepsCount,
                currentStepIndex: part.data.currentStepIndex,
                currentStepTitle: part.data.currentStepTitle,
                progressLabel: part.data.progressLabel,
                status: part.data.status,
              }
            : current
        );
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
    transport,
  });

  const baseRenderedMessages = React.useMemo(
    () =>
      messages
        .map((message, index) => ({
          id: message.id,
          role: message.role,
          streaming:
            status === 'streaming' && index === messages.length - 1 && message.role === 'assistant',
          text: extractTextFromUIMessage(message),
        }))
        .filter((message) => message.text.length > 0),
    [messages, status]
  );

  const renderedMessages = React.useMemo(
    () => [...baseRenderedMessages, ...demoMessages],
    [baseRenderedMessages, demoMessages]
  );

  const clearDemoTimers = React.useCallback(() => {
    demoTimersRef.current.forEach((timerId) => clearTimeout(timerId));
    demoTimersRef.current = [];
  }, []);

  React.useEffect(() => clearDemoTimers, [clearDemoTimers]);

  const starterPrompts = React.useMemo(() => {
    if ((sessionMessagesQuery.data?.length ?? 0) > 0) {
      return [];
    }

    if (!profile || !workspaceSession) {
      return [];
    }

    return [
      '试着用一句话总结这份资料要解决什么问题',
      '把当前这一步讲给一个刚入门的同学听',
      profile.sourceType === 'upload' ? '指出这份资料里最容易忽略的一处细节' : '结合这本书举一个最典型的应用场景',
    ];
  }, [profile, sessionMessagesQuery.data, workspaceSession]);

  const addDraftSource = React.useCallback(() => {
    setSourceDrafts((current) => {
      const nextIndex = current.length + 1;
      const kinds: TutorWorkspaceDraftSource['kind'][] = ['pdf', 'document', 'image'];
      const nextKind = kinds[(nextIndex - 1) % kinds.length];

      return [
        ...current,
        {
          addedAt: `刚刚添加`,
          id: `draft-source-${nextIndex}`,
          kind: nextKind,
          name: `附加文件 ${nextIndex}`,
          status: 'preparing',
        },
      ];
    });
  }, []);

  const handleSend = React.useCallback(async (nextDraft?: string) => {
    const normalized = (nextDraft ?? draft).trim();
    if (!normalized || !profile || !workspaceSession) {
      return;
    }

    const shouldRunDemo = isTutorOneTimeDemoPrompt(normalized);

    setLatestEvaluation(null);
    setLatestSessionSignal(null);
    setLatestStatus(
      shouldRunDemo
        ? null
        : {
            label: '导师正在组织新的追问…',
            tone: 'info',
          }
    );
    setDraft('');

    if (shouldRunDemo) {
      clearDemoTimers();

      const userMessageId = `demo-user-${Date.now()}`;
      const assistantMessageId = `demo-assistant-${Date.now()}`;
      const markdownReply = buildTutorBookSummaryMarkdown(profile, workspaceSession);
      const typingSteps = buildDemoTypingSteps(markdownReply);

      setDemoMessages([
        {
          id: userMessageId,
          role: 'user',
          streaming: false,
          text: normalized,
        },
        {
          id: assistantMessageId,
          role: 'assistant',
          thinking: true,
          thinkingLabel: '思考 5s',
          streaming: false,
          text: '',
        },
      ]);

      const revealStartTimer = setTimeout(() => {
        setDemoMessages((current) =>
          current.map((message) =>
            message.id === assistantMessageId
              ? {
                  ...message,
                  thinking: false,
                  thinkingLabel: '思考 5s',
                  streaming: true,
                  text: '',
                }
              : message
          )
        );

        let accumulatedDelay = 0;

        typingSteps.forEach((step, index) => {
          accumulatedDelay += step.delayMs;

          const chunkTimer = setTimeout(() => {
            setDemoMessages((current) =>
              current.map((message) =>
                message.id === assistantMessageId
                  ? {
                      ...message,
                      streaming: index < typingSteps.length - 1,
                      text: `${message.text}${step.chunk}`,
                    }
                  : message
              )
            );
          }, accumulatedDelay);

          demoTimersRef.current.push(chunkTimer);
        });
      }, 5000);

      demoTimersRef.current.push(revealStartTimer);
      return;
    }

    await sendMessage(
      { text: normalized },
      {
        body: {
          profile,
          session: workspaceSession,
        },
      }
    );
  }, [clearDemoTimers, draft, profile, sendMessage, workspaceSession]);

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
      addDraftSource,
      setDraft,
      sourceCount: 1 + sourceDrafts.length,
      sourceCards,
      sourceDrafts,
      sourceSummary: profile ? resolveTutorWorkspaceSourceSummary(profile) : '',
      starterPrompts,
      workspaceSession,
    }),
    [
      activeTab,
      addDraftSource,
      draft,
      handleSend,
      highlightCards,
      latestEvaluation,
      latestSessionSignal,
      latestStatus,
      profile,
      renderedMessages,
      sourceCards,
      sourceDrafts,
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
