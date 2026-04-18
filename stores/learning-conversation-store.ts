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
};

type LearningConversationStore = LearningConversationState & {
  applyEvent: (event: LearningStreamEvent) => void;
  clearDraft: () => void;
  hydrateHistory: (messages: LearningWorkspaceRenderedMessage[]) => void;
  reset: () => void;
  setLatestEvaluation: (evaluation: LearningStepEvaluation | null) => void;
  setLatestSessionSignal: (signal: LearningWorkspaceSessionSignal | null) => void;
  setLatestStatus: (signal: LearningWorkspaceStatusSignal | null) => void;
  startDraft: (input: {
    assistantMessageId: string;
    mode: LearningConversationMode;
    userMessageId: string;
    userText: string;
  }) => void;
};

function createDraftPresentation(mode: LearningConversationMode): LearningConversationPresentation {
  if (mode === 'explore') {
    return {
      answer: { content: '' },
      bridgeActions: [],
      evidence: [],
      focus: null,
      followups: [],
      kind: 'explore',
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
    messages: [
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
    ],
    mode: input.mode,
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
};

export const useLearningConversationStore = create<LearningConversationStore>((set) => ({
  ...initialStoreState,
  applyEvent: (event) => {
    set((state) => reduceLearningConversationEvent(state, event));
  },
  clearDraft: () => {
    set((state) => ({
      ...state,
      assistantMessageId: null,
      messages: state.messages.filter((message) => !message.streaming),
    }));
  },
  hydrateHistory: (messages) => {
    set((state) => {
      const draftMessages = state.messages.filter((message) => message.streaming);
      const nextMessages = draftMessages.length > 0 ? [...messages, ...draftMessages] : messages;

      return {
        ...state,
        messages: nextMessages,
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
    set(createInitialLearningConversationState(input));
  },
}));
