import type {
  MessageStatus,
  ThreadAssistantMessagePart,
  ThreadMessage,
  ThreadMessageLike,
} from '@assistant-ui/core';

import type { LearningWorkspaceRenderedMessage } from '@/lib/learning/workspace';

const COMPLETE_STATUS: MessageStatus = {
  reason: 'stop',
  type: 'complete',
};

const RUNNING_STATUS: MessageStatus = {
  type: 'running',
};

function resolveAssistantText(message: LearningWorkspaceRenderedMessage) {
  if (message.presentation?.kind === 'explore') {
    return message.presentation.answer.content.trim();
  }

  return message.text.trim();
}

function resolveAssistantParts(message: LearningWorkspaceRenderedMessage): ThreadAssistantMessagePart[] {
  const parts: ThreadAssistantMessagePart[] = [];

  if (message.presentation?.kind === 'explore') {
    const reasoning = message.presentation.reasoningContent?.trim();

    if (reasoning) {
      parts.push({
        text: reasoning,
        type: 'reasoning',
      });
    }
  }

  const text = resolveAssistantText(message);

  if (text) {
    parts.push({
      text,
      type: 'text',
    });
  }

  return parts;
}

export function toAssistantLearningMessage(
  message: LearningWorkspaceRenderedMessage,
  index: number
): ThreadMessageLike {
  if (message.role === 'user') {
    return {
      content: [
        {
          text: message.text,
          type: 'text',
        },
      ],
      createdAt: new Date(index),
      id: message.id,
      metadata: {
        custom: {
          learningMessage: message,
        },
      },
      role: 'user',
    };
  }

  return {
    content: resolveAssistantParts(message),
    createdAt: new Date(index),
    id: message.id,
    metadata: {
      custom: {
        learningMessage: message,
      },
    },
    role: 'assistant',
    status: message.streaming ? RUNNING_STATUS : COMPLETE_STATUS,
  };
}

export function getLearningMessageFromAssistantMessage(message: ThreadMessage) {
  const learningMessage = message.metadata.custom.learningMessage;

  if (
    learningMessage &&
    typeof learningMessage === 'object' &&
    'id' in learningMessage &&
    'role' in learningMessage &&
    'text' in learningMessage
  ) {
    return learningMessage as LearningWorkspaceRenderedMessage;
  }

  return null;
}
