import { resolveLatestTurnFocusMessageId } from '@/lib/learning/conversation-focus';

describe('resolveLatestTurnFocusMessageId', () => {
  it('anchors the user message when it is the last message (just sent)', () => {
    const messageId = resolveLatestTurnFocusMessageId([
      {
        id: 'message-1',
        role: 'assistant',
        streaming: false,
        text: '更早回复',
      },
      {
        id: 'message-2',
        role: 'user',
        streaming: false,
        text: '新问题',
      },
    ] as any);

    expect(messageId).toBe('message-2');
  });

  it('returns the latest user message for the active streaming turn', () => {
    const messageId = resolveLatestTurnFocusMessageId([
      {
        id: 'message-1',
        role: 'assistant',
        streaming: false,
        text: '更早回复',
      },
      {
        id: 'message-2',
        role: 'user',
        streaming: false,
        text: '继续',
      },
      {
        id: 'message-3',
        role: 'assistant',
        streaming: true,
        text: '',
      },
    ] as any);

    expect(messageId).toBe('message-2');
  });

  it('does not keep anchoring an old user message after the reply has finished', () => {
    const messageId = resolveLatestTurnFocusMessageId([
      {
        id: 'message-1',
        role: 'assistant',
        streaming: false,
        text: '更早回复',
      },
      {
        id: 'message-2',
        role: 'user',
        streaming: false,
        text: '继续',
      },
      {
        id: 'message-3',
        role: 'assistant',
        streaming: false,
        text: '已完成回答',
      },
    ] as any);

    expect(messageId).toBeNull();
  });
});
