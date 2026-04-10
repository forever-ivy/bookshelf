import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { TutorChatBubble } from '@/components/tutor/tutor-chat-bubble';

describe('tutor chat bubble', () => {
  it('renders assistant markdown replies with lightweight actions', () => {
    render(
      <TutorChatBubble
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

    expect(screen.getByTestId('tutor-assistant-thinking-label')).toBeTruthy();
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
    render(<TutorChatBubble role="assistant" text="" thinking />);

    expect(screen.getByTestId('tutor-assistant-thinking-indicator')).toBeTruthy();
    expect(screen.queryByText('思考 5s')).toBeNull();
    expect(screen.queryByText('思考中')).toBeNull();
    expect(screen.queryByLabelText('复制回答')).toBeNull();
  });

  it('keeps user replies in the original compact bubble without assistant mock chrome', () => {
    render(<TutorChatBubble role="user" text="我会先放鸦片战争、洋务运动、戊戌变法和辛亥革命。" />);

    expect(screen.getByText('我会先放鸦片战争、洋务运动、戊戌变法和辛亥革命。')).toBeTruthy();
    expect(screen.queryByTestId('tutor-assistant-thinking-label')).toBeNull();
    expect(screen.queryByLabelText('复制回答')).toBeNull();
    expect(screen.queryByText('我的回答')).toBeNull();
  });
});
