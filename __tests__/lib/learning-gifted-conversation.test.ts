import {
  LEARNING_ASSISTANT_USER_ID,
  LEARNING_CURRENT_USER_ID,
  toGiftedLearningMessages,
} from '@/lib/learning/gifted-conversation';

import type { LearningWorkspaceRenderedMessage } from '@/lib/learning/workspace';

function createMessage(
  id: string,
  role: LearningWorkspaceRenderedMessage['role'],
  text: string,
  streaming = false
): LearningWorkspaceRenderedMessage {
  return {
    cards: [],
    id,
    presentation: null,
    role,
    streaming,
    text,
  };
}

describe('learning gifted conversation adapter', () => {
  it('maps workspace messages into GiftedChat messages without dropping metadata', () => {
    const workspaceMessages = [
      createMessage('m-1', 'assistant', '先建立整体框架。'),
      createMessage('m-2', 'user', '我想问一个例子。'),
      createMessage('m-3', 'assistant', '正在回答。', true),
    ];

    const giftedMessages = toGiftedLearningMessages(workspaceMessages);

    expect(giftedMessages.map((message) => message._id)).toEqual(['m-1', 'm-2', 'm-3']);
    expect(giftedMessages[0]?.user._id).toBe(LEARNING_ASSISTANT_USER_ID);
    expect(giftedMessages[1]?.user._id).toBe(LEARNING_CURRENT_USER_ID);
    expect(giftedMessages[2]?.pending).toBe(true);
    expect(giftedMessages[2]?.learningMessage).toBe(workspaceMessages[2]);
  });

  it('keeps stable createdAt values so FlatList ordering is deterministic', () => {
    const giftedMessages = toGiftedLearningMessages([
      createMessage('m-1', 'assistant', '第一条'),
      createMessage('m-2', 'assistant', '第二条'),
    ]);

    expect(giftedMessages[0]?.createdAt).toEqual(new Date(0));
    expect(giftedMessages[1]?.createdAt).toEqual(new Date(1));
  });
});
