import { create } from 'zustand';

import type {
  LearningConversationPresentation,
  LearningExplorePresentation,
  LearningGuidePresentation,
  LearningSessionMessage,
  LearningStepEvaluation,
  LearningStreamEvent,
} from '@/lib/api/types';
import {
  buildLearningWorkspaceMessageCards,
  createLearningRenderedMessages,
  type LearningWorkspaceRenderedMessage,
  type LearningWorkspaceSessionSignal,
  type LearningWorkspaceStatusSignal,
} from '@/lib/learning/workspace';

export type LearningConversationMode = 'explore' | 'guide';

export type LearningConversationState = {
  assistantMessageId: string | null;
  latestEvaluation: LearningStepEvaluation | null;
  latestSessionSignal: LearningWorkspaceSessionSignal | null;
  latestStatus: LearningWorkspaceStatusSignal | null;
  messages: LearningWorkspaceRenderedMessage[];
  mode: LearningConversationMode;
  sessionId: number | null;
  userMessageId: string | null;
};

type LearningConversationStore = LearningConversationState & {
  applyEvent: (event: LearningStreamEvent) => void;
  discardAssistantDraft: () => void;
  ensureResumeDraft: (input: {
    assistantMessageId: string;
    mode: LearningConversationMode;
    sessionId: number;
    userMessageId: string;
    userText: string;
  }) => void;
  clearDraft: () => void;
  commitDraft: () => void;
  hydrateHistory: (messages: LearningWorkspaceRenderedMessage[], sessionId?: number | null) => void;
  reset: () => void;
  setLatestEvaluation: (evaluation: LearningStepEvaluation | null) => void;
  setLatestSessionSignal: (signal: LearningWorkspaceSessionSignal | null) => void;
  setLatestStatus: (signal: LearningWorkspaceStatusSignal | null) => void;
  startDraft: (input: {
    assistantMessageId: string;
    mode: LearningConversationMode;
    sessionId?: number;
    userMessageId: string;
    userText: string;
  }) => void;
};

function isLocalUserMessage(message: LearningWorkspaceRenderedMessage) {
  return message.role === 'user' && message.id.startsWith('local-user-');
}

function createDraftMessages(input: {
  assistantMessageId: string;
  mode: LearningConversationMode;
  userMessageId: string;
  userText: string;
}): LearningWorkspaceRenderedMessage[] {
  return [
    {
      cards: [],
      id: input.userMessageId,
      presentation: null,
      role: 'user',
      streaming: false,
      text: input.userText,
    },
    {
      cards: [],
      id: input.assistantMessageId,
      presentation: createDraftPresentation(input.mode),
      role: 'assistant',
      streaming: true,
      text: '',
    },
  ];
}

function createDraftPresentation(mode: LearningConversationMode): LearningConversationPresentation {
  if (mode === 'explore') {
    return {
      answer: { content: '' },
      bridgeActions: [],
      evidence: [],
      focus: null,
      followups: [],
      kind: 'explore',
      reasoningContent: null,
      relatedConcepts: [],
    };
  }

  return {
    bridgeActions: [],
    evidence: [],
    examiner: {
      confidence: 0,
      feedback: null,
      masteryScore: 0,
      missingConcepts: [],
      passed: false,
      reasoning: null,
      stepIndex: 0,
    },
    followups: [],
    kind: 'guide',
    peer: null,
    relatedConcepts: [],
    step: null,
    teacher: { content: '' },
  };
}

function ensureGuidePresentation(
  presentation?: LearningConversationPresentation | null
): LearningGuidePresentation {
  return presentation?.kind === 'guide'
    ? presentation
    : (createDraftPresentation('guide') as LearningGuidePresentation);
}

function ensureExplorePresentation(
  presentation?: LearningConversationPresentation | null
): LearningExplorePresentation {
  return presentation?.kind === 'explore'
    ? presentation
    : (createDraftPresentation('explore') as LearningExplorePresentation);
}

function resolvePresentationText(presentation?: LearningConversationPresentation | null, fallback = '') {
  if (!presentation) {
    return fallback;
  }

  if (presentation.kind === 'guide') {
    const parts = [
      presentation.teacher.content,
      presentation.peer?.content ?? '',
      presentation.examiner.reasoning ?? '',
    ].filter(Boolean);
    return parts.join('\n\n') || fallback;
  }

  return presentation.answer.content || fallback;
}

function buildRenderedDraftMessage(
  message: LearningWorkspaceRenderedMessage,
  presentation?: LearningConversationPresentation | null
): LearningWorkspaceRenderedMessage {
  return {
    ...message,
    cards: buildLearningWorkspaceMessageCards(presentation),
    presentation: presentation ?? null,
    text: resolvePresentationText(presentation, message.text),
  };
}

function updateAssistantDraft(
  state: LearningConversationState,
  updater: (
    message: LearningWorkspaceRenderedMessage,
    presentation: LearningConversationPresentation | null
  ) => LearningWorkspaceRenderedMessage
) {
  if (!state.assistantMessageId) {
    return state;
  }

  return {
    ...state,
    messages: state.messages.map((message) => {
      if (message.id !== state.assistantMessageId) {
        return message;
      }

      return updater(message, message.presentation ?? createDraftPresentation(state.mode));
    }),
  };
}

export function createInitialLearningConversationState(input: {
  assistantMessageId: string;
  mode: LearningConversationMode;
  userMessageId: string;
  userText: string;
}): LearningConversationState {
  return {
    assistantMessageId: input.assistantMessageId,
    latestEvaluation: null,
    latestSessionSignal: null,
    latestStatus: null,
    messages: createDraftMessages(input),
    mode: input.mode,
    sessionId: null,
    userMessageId: input.userMessageId,
  };
}

function findMatchingHistoryIndex(
  message: LearningWorkspaceRenderedMessage,
  historyMessages: LearningWorkspaceRenderedMessage[],
  usedHistoryIndexes: Set<number>
) {
  const exactMatchIndex = historyMessages.findIndex(
    (candidate, index) => !usedHistoryIndexes.has(index) && candidate.id === message.id
  );
  if (exactMatchIndex >= 0) {
    return exactMatchIndex;
  }

  if (!isLocalUserMessage(message)) {
    if (message.role === 'assistant' && !message.streaming) {
      return historyMessages.findIndex(
        (candidate, index) =>
          !usedHistoryIndexes.has(index) &&
          candidate.role === 'assistant' &&
          candidate.text === message.text
      );
    }

    return -1;
  }

  return historyMessages.findIndex(
    (candidate, index) =>
      !usedHistoryIndexes.has(index) &&
      candidate.role === 'user' &&
      candidate.text === message.text
  );
}

function findMessageIndex(messages: LearningWorkspaceRenderedMessage[], id: string) {
  return messages.findIndex((message) => message.id === id);
}

function findLastMessageIndex(messages: LearningWorkspaceRenderedMessage[], id: string) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.id === id) {
      return index;
    }
  }

  return -1;
}

function resolveHistoryInsertIndex(
  nextMessages: LearningWorkspaceRenderedMessage[],
  historyMessages: LearningWorkspaceRenderedMessage[],
  historyIndex: number
) {
  for (let index = historyIndex - 1; index >= 0; index -= 1) {
    const anchorId = historyMessages[index]?.id;
    if (!anchorId) {
      continue;
    }

    const anchorIndex = findLastMessageIndex(nextMessages, anchorId);
    if (anchorIndex >= 0) {
      return anchorIndex + 1;
    }
  }

  for (let index = historyIndex + 1; index < historyMessages.length; index += 1) {
    const anchorId = historyMessages[index]?.id;
    if (!anchorId) {
      continue;
    }

    const anchorIndex = findMessageIndex(nextMessages, anchorId);
    if (anchorIndex >= 0) {
      return anchorIndex;
    }
  }

  return 0;
}

function mergeHydratedHistory(
  state: LearningConversationState,
  historyMessages: LearningWorkspaceRenderedMessage[]
) {
  if (state.messages.length === 0) {
    return {
      historyHasPendingUser: false,
      messages: historyMessages,
    };
  }

  const usedHistoryIndexes = new Set<number>();
  let historyHasPendingUser = false;
  const nextMessages = state.messages.map((message) => {
    const matchingHistoryIndex = findMatchingHistoryIndex(message, historyMessages, usedHistoryIndexes);
    if (matchingHistoryIndex < 0) {
      return message;
    }

    usedHistoryIndexes.add(matchingHistoryIndex);
    if (message.id === state.userMessageId) {
      historyHasPendingUser = true;
    }

    return historyMessages[matchingHistoryIndex]!;
  });

  historyMessages.forEach((message, historyIndex) => {
    if (usedHistoryIndexes.has(historyIndex)) {
      return;
    }

    const insertIndex = resolveHistoryInsertIndex(nextMessages, historyMessages, historyIndex);
    nextMessages.splice(insertIndex, 0, message);
  });

  return {
    historyHasPendingUser,
    messages: nextMessages,
  };
}

export function reduceLearningConversationEvent(
  state: LearningConversationState,
  event: LearningStreamEvent
): LearningConversationState {
  switch (event.type) {
    case 'teacher.delta':
      return updateAssistantDraft(state, (message, presentation) => {
        const nextPresentation = ensureGuidePresentation(presentation);
        return buildRenderedDraftMessage(message, {
          ...nextPresentation,
          teacher: {
            content: `${nextPresentation.teacher.content}${event.delta}`,
          },
        });
      });
    case 'peer.delta':
      return updateAssistantDraft(state, (message, presentation) => {
        const nextPresentation = ensureGuidePresentation(presentation);
        return buildRenderedDraftMessage(message, {
          ...nextPresentation,
          peer: {
            content: `${nextPresentation.peer?.content ?? ''}${event.delta}`,
          },
        });
      });
    case 'explore.answer.delta':
      return updateAssistantDraft(state, (message, presentation) => {
        const nextPresentation = ensureExplorePresentation(presentation);
        return buildRenderedDraftMessage(message, {
          ...nextPresentation,
          answer: {
            content: `${nextPresentation.answer.content}${event.delta}`,
          },
        });
      });
    case 'explore.reasoning.delta':
      return updateAssistantDraft(state, (message, presentation) => {
        const nextPresentation = ensureExplorePresentation(presentation);
        return buildRenderedDraftMessage(message, {
          ...nextPresentation,
          reasoningContent: `${nextPresentation.reasoningContent ?? ''}${event.delta}`,
        });
      });
    case 'assistant.delta':
      return updateAssistantDraft(state, (message) => ({
        ...message,
        text: `${message.text}${event.delta}`,
      }));
    case 'evaluation':
      return {
        ...updateAssistantDraft(state, (message, presentation) => {
          const nextPresentation = ensureGuidePresentation(presentation);
          return buildRenderedDraftMessage(message, {
            ...nextPresentation,
            examiner: {
              ...nextPresentation.examiner,
              ...event.evaluation,
            },
          });
        }),
        latestEvaluation: event.evaluation,
      };
    case 'evidence.items':
      return updateAssistantDraft(state, (message, presentation) => {
        const nextPresentation = presentation ?? createDraftPresentation(state.mode);
        return buildRenderedDraftMessage(message, {
          ...nextPresentation,
          evidence: event.items,
        });
      });
    case 'followups.items':
      return updateAssistantDraft(state, (message, presentation) => {
        const nextPresentation = presentation ?? createDraftPresentation(state.mode);
        return buildRenderedDraftMessage(message, {
          ...nextPresentation,
          followups: event.items,
        });
      });
    case 'bridge.actions':
      return updateAssistantDraft(state, (message, presentation) => {
        const nextPresentation = presentation ?? createDraftPresentation(state.mode);
        return buildRenderedDraftMessage(message, {
          ...nextPresentation,
          bridgeActions: event.actions,
        });
      });
    case 'explore.related_concepts':
      return updateAssistantDraft(state, (message, presentation) => {
        const nextPresentation = ensureExplorePresentation(presentation);
        return buildRenderedDraftMessage(message, {
          ...nextPresentation,
          relatedConcepts: event.items,
        });
      });
    case 'assistant.final': {
      const rendered = createLearningRenderedMessages([event.message])[0];
      if (!rendered) {
        return state;
      }
      return {
        ...state,
        assistantMessageId: null,
        messages: state.messages.map((message) =>
          message.id === state.assistantMessageId ? rendered : message
        ),
      };
    }
    default:
      return state;
  }
}

const initialStoreState: LearningConversationState = {
  assistantMessageId: null,
  latestEvaluation: null,
  latestSessionSignal: null,
  latestStatus: null,
  messages: [],
  mode: 'guide',
  sessionId: null,
  userMessageId: null,
};

export const useLearningConversationStore = create<LearningConversationStore>((set) => ({
  ...initialStoreState,
  applyEvent: (event) => {
    set((state) => reduceLearningConversationEvent(state, event));
  },
  discardAssistantDraft: () => {
    set((state) => ({
      ...state,
      assistantMessageId: null,
      messages: state.messages.filter((message) => message.id !== state.assistantMessageId),
    }));
  },
  ensureResumeDraft: (input) => {
    set((state) => {
      const sameSession =
        state.sessionId === null || state.sessionId === input.sessionId;
      const baseMessages = sameSession ? state.messages.filter((message) => !message.streaming) : [];
      const hasAssistantDraft =
        sameSession &&
        Boolean(
          state.assistantMessageId &&
            state.messages.some((message) => message.id === state.assistantMessageId)
        );

      if (hasAssistantDraft) {
        return {
          ...state,
          mode: input.mode,
          sessionId: input.sessionId,
        };
      }

      const lastMessage = baseMessages[baseMessages.length - 1] ?? null;
      const shouldAppendUser =
        lastMessage?.role !== 'user' || lastMessage.text !== input.userText;

      return {
        ...state,
        assistantMessageId: input.assistantMessageId,
        latestEvaluation: null,
        latestSessionSignal: null,
        latestStatus: null,
        messages: [
          ...baseMessages,
          ...(shouldAppendUser
            ? [
                {
                  cards: [],
                  id: input.userMessageId,
                  presentation: null,
                  role: 'user' as const,
                  streaming: false,
                  text: input.userText,
                },
              ]
            : []),
          {
            cards: [],
            id: input.assistantMessageId,
            presentation: createDraftPresentation(input.mode),
            role: 'assistant',
            streaming: true,
            text: '',
          },
        ],
        mode: input.mode,
        sessionId: input.sessionId,
        userMessageId: input.userMessageId,
      };
    });
  },
  clearDraft: () => {
    set((state) => ({
      ...state,
      assistantMessageId: null,
      messages: state.messages.filter((message) => !message.streaming),
      userMessageId: null,
    }));
  },
  commitDraft: () => {
    set((state) => ({
      ...state,
      assistantMessageId: null,
      messages: state.messages.map((message) =>
        message.id === state.assistantMessageId ? { ...message, streaming: false } : message
      ),
      userMessageId: null,
    }));
  },
  hydrateHistory: (messages, sessionId) => {
    set((state) => {
      if (typeof sessionId === 'number' && state.sessionId !== null && state.sessionId !== sessionId) {
        return {
          ...initialStoreState,
          messages,
          mode: state.mode,
          sessionId,
        };
      }

      const { historyHasPendingUser, messages: nextMessages } = mergeHydratedHistory(
        state,
        messages
      );

      return {
        ...state,
        messages: nextMessages,
        sessionId: typeof sessionId === 'number' ? sessionId : state.sessionId,
        userMessageId: historyHasPendingUser ? null : state.userMessageId,
      };
    });
  },
  reset: () => {
    set(initialStoreState);
  },
  setLatestEvaluation: (latestEvaluation) => {
    set((state) => ({
      ...state,
      latestEvaluation,
    }));
  },
  setLatestSessionSignal: (latestSessionSignal) => {
    set((state) => ({
      ...state,
      latestSessionSignal,
    }));
  },
  setLatestStatus: (latestStatus) => {
    set((state) => ({
      ...state,
      latestStatus,
    }));
  },
  startDraft: (input) => {
    const nextSessionId =
      typeof input.sessionId === 'number' ? input.sessionId : null;
    set((state) => ({
      ...state,
      assistantMessageId: input.assistantMessageId,
      latestEvaluation: null,
      latestSessionSignal: null,
      latestStatus: null,
      messages: [
        ...((nextSessionId === null || state.sessionId === null || state.sessionId === nextSessionId)
          ? state.messages.filter((message) => !message.streaming)
          : []),
        ...createDraftMessages(input),
      ],
      mode: input.mode,
      sessionId: nextSessionId ?? state.sessionId,
      userMessageId: input.userMessageId,
    }));
  },
}));
