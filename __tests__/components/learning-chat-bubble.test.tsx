import { render, screen } from '@testing-library/react-native';
import { Platform, StyleSheet } from 'react-native';
import React from 'react';

import { LearningChatBubble } from '@/components/learning/learning-chat-bubble';

describe('learning chat bubble', () => {
  it('renders assistant markdown replies with lightweight actions', () => {
    render(
      <LearningChatBubble
        role="assistant"
        text={[
          '## 主要内容',
          '',
          '这本书先帮你建立机器学习的整体地图。',
          '',
          '- 先认识数据、目标和模型',
          '- 再理解训练为什么依赖标签',
        ].join('\n')}
      />
    );

    expect(screen.queryByTestId('learning-assistant-thinking-label')).toBeNull();
    expect(screen.getByText('主要内容')).toBeTruthy();
    expect(screen.getByText('这本书先帮你建立机器学习的整体地图。')).toBeTruthy();
    expect(screen.getByText('先认识数据、目标和模型')).toBeTruthy();
    expect(screen.getByText('再理解训练为什么依赖标签')).toBeTruthy();
    expect(screen.getByLabelText('复制回答')).toBeTruthy();
    expect(screen.getByLabelText('重试回答')).toBeTruthy();
    expect(screen.getByLabelText('分享回答')).toBeTruthy();
    expect(screen.getByLabelText('更多操作')).toBeTruthy();
  });

  it('renders a dedicated assistant thinking placeholder before reply text appears', () => {
    render(<LearningChatBubble role="assistant" text="" thinking />);

    expect(screen.getByTestId('learning-assistant-thinking-indicator')).toBeTruthy();
    expect(screen.getByText('Explore')).toBeTruthy();
    expect(screen.queryByText('思考 5s')).toBeNull();
    expect(screen.queryByText('思考中')).toBeNull();
    expect(screen.queryByLabelText('复制回答')).toBeNull();
  });

  it('renders an explicit assistant status label only when provided', () => {
    render(<LearningChatBubble role="assistant" text="先抓住模型、数据和目标。" thinkingLabel="检索完成" />);

    expect(screen.getByTestId('learning-assistant-thinking-label')).toBeTruthy();
    expect(screen.getByText('检索完成')).toBeTruthy();
  });

  it('keeps user replies in the original compact bubble without assistant mock chrome', () => {
    render(<LearningChatBubble role="user" text="我会先放鸦片战争、洋务运动、戊戌变法和辛亥革命。" />);

    expect(screen.getByText('我会先放鸦片战争、洋务运动、戊戌变法和辛亥革命。')).toBeTruthy();
    expect(screen.queryByTestId('learning-assistant-thinking-label')).toBeNull();
    expect(screen.queryByLabelText('复制回答')).toBeNull();
    expect(screen.queryByText('我的回答')).toBeNull();
  });

  it('does not force plain user text to flex inside the compact bubble', () => {
    render(<LearningChatBubble role="user" text="帮我总结这一节的核心线索" />);

    expect(
      StyleSheet.flatten(screen.getByText('帮我总结这一节的核心线索').props.style).flex
    ).toBeUndefined();
  });

  it('matches user plain text typography to the assistant reply body typography', () => {
    render(<LearningChatBubble role="user" text="帮我总结这一节的核心线索" />);

    const style = StyleSheet.flatten(screen.getByText('帮我总结这一节的核心线索').props.style);

    expect(style.fontFamily).toBe(
      Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' })
    );
    expect(style.fontSize).toBe(17);
    expect(style.lineHeight).toBe(28);
  });

  it('gives rich user replies a stable width so the webview content does not collapse', () => {
    render(<LearningChatBubble role="user" text="$$ f(x) = \\frac{x}{1 - x^2} $$" />);

    expect(StyleSheet.flatten(screen.getByTestId('learning-user-bubble').props.style).width).toBe('84%');
  });
});
