import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { LearningGiftedConversation } from '@/components/learning/learning-gifted-conversation';

import type { LearningWorkspaceRenderedMessage } from '@/lib/learning/workspace';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
  }),
}));

function createMessage(
  overrides: Partial<LearningWorkspaceRenderedMessage> = {}
): LearningWorkspaceRenderedMessage {
  return {
    cards: [],
    id: 'm-1',
    presentation: null,
    role: 'assistant',
    streaming: false,
    text: '先建立整体框架。',
    ...overrides,
  };
}

describe('LearningGiftedConversation', () => {
  it('renders the conversation surface with existing learning messages', () => {
    render(
      <LearningGiftedConversation
        draft=""
        emptyLabel="还没有消息"
        messages={[createMessage()]}
        onDraftChange={jest.fn()}
        onSend={jest.fn()}
        starterPrompts={[]}
      />
    );

    expect(screen.getByTestId('learning-gifted-chat')).toBeTruthy();
    expect(screen.getByTestId('learning-workspace-screen')).toBeTruthy();
    expect(screen.getByText('先建立整体框架。')).toBeTruthy();
  });

  it('keeps the composer controlled and sends the current draft', () => {
    const handleDraftChange = jest.fn();
    const handleSend = jest.fn();

    render(
      <LearningGiftedConversation
        draft="继续解释"
        emptyLabel="还没有消息"
        messages={[]}
        onDraftChange={handleDraftChange}
        onSend={handleSend}
        placeholder="继续发散"
        starterPrompts={[]}
      />
    );

    fireEvent.changeText(screen.getByTestId('learning-workspace-composer-input'), '新的问题');
    fireEvent.press(screen.getByTestId('learning-workspace-composer-send'));

    expect(handleDraftChange).toHaveBeenCalledWith('新的问题');
    expect(handleSend).toHaveBeenCalledWith('继续解释');
  });

  it('renders empty starter prompts and sends them as drafts', () => {
    const handleSend = jest.fn();

    render(
      <LearningGiftedConversation
        draft=""
        emptyLabel="问一个延展问题。"
        messages={[]}
        onDraftChange={jest.fn()}
        onSend={handleSend}
        starterPrompts={['举一个例子']}
      />
    );

    expect(screen.getByText('问一个延展问题。')).toBeTruthy();
    fireEvent.press(screen.getByText('举一个例子'));
    expect(handleSend).toHaveBeenCalledWith('举一个例子');
  });

  it('disables input while sending', () => {
    render(
      <LearningGiftedConversation
        draft="正在发送"
        emptyLabel="问一个延展问题。"
        isSending
        messages={[]}
        onDraftChange={jest.fn()}
        onSend={jest.fn()}
        starterPrompts={[]}
      />
    );

    expect(screen.getByTestId('learning-workspace-composer-input').props.editable).toBe(false);
  });

  it('renders inline status above the composer', () => {
    render(
      <LearningGiftedConversation
        draft=""
        emptyLabel="问一个延展问题。"
        latestStatus={{ label: '模型请求错误', tone: 'warning' }}
        messages={[]}
        onDraftChange={jest.fn()}
        onSend={jest.fn()}
        starterPrompts={[]}
      />
    );

    expect(screen.getByTestId('learning-workspace-inline-status')).toBeTruthy();
    expect(screen.getByText('模型请求错误')).toBeTruthy();
  });
});
