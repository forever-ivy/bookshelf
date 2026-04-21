import type { IMessage } from 'react-native-gifted-chat';

import type { LearningWorkspaceRenderedMessage } from '@/lib/learning/workspace';

export const LEARNING_CURRENT_USER_ID = 'learning-current-user';
export const LEARNING_ASSISTANT_USER_ID = 'learning-assistant';

export type LearningGiftedMessage = IMessage & {
  learningMessage: LearningWorkspaceRenderedMessage;
};

export function toGiftedLearningMessages(
  messages: LearningWorkspaceRenderedMessage[]
): LearningGiftedMessage[] {
  return messages.map((message, index) => ({
    _id: message.id,
    createdAt: new Date(index),
    learningMessage: message,
    pending: message.streaming,
    text: message.text,
    user: {
      _id: message.role === 'user' ? LEARNING_CURRENT_USER_ID : LEARNING_ASSISTANT_USER_ID,
      name: message.role === 'user' ? '我' : '知序',
    },
  }));
}
