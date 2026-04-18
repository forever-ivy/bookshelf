import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { LearningConversationMessage } from '@/components/learning/learning-conversation-message';

describe('learning conversation message', () => {
  it('renders coach-first guide cards and exposes redirect actions', () => {
    const onAction = jest.fn();

    render(
      <LearningConversationMessage
        message={{
          cards: [
            {
              content: '先把模型、数据和目标三者的关系说清楚，再进入监督学习。',
              kind: 'coach',
              title: '教练反馈',
            },
            {
              content: '先把模型、数据和目标三者的关系说清楚，再进入监督学习。',
              kind: 'teacher',
              title: '导师主讲',
            },
            {
              content: '如果继续往下学，你觉得下一步最该澄清哪个概念？',
              kind: 'peer',
              title: '学伴追问',
            },
            {
              evaluation: {
                masteryScore: 0.48,
                missingConcepts: ['模型和数据的关系'],
                passed: false,
                reasoning: '回答还没有把模型和数据怎么配合说清楚。',
                stepIndex: 0,
              },
              kind: 'examiner',
              title: '考官判断',
            },
            {
              items: ['继续说明数据和模型之间的关系'],
              kind: 'remediation',
              title: '补强建议',
            },
            {
              actions: [
                {
                  actionType: 'expand_step_to_explore',
                  label: '转去 Explore 深挖',
                },
              ],
              kind: 'redirect',
              title: '转向 Explore',
            },
          ],
          id: 'message-1',
          presentation: {
            bridgeActions: [
              {
                actionType: 'expand_step_to_explore',
                label: '转去 Explore 深挖',
              },
            ],
            evidence: [],
            examiner: {
              masteryScore: 0.48,
              missingConcepts: ['模型和数据的关系'],
              passed: false,
              reasoning: '回答还没有把模型和数据怎么配合说清楚。',
              stepIndex: 0,
            },
            followups: ['继续说明数据和模型之间的关系'],
            kind: 'guide',
            peer: {
              content: '如果继续往下学，你觉得下一步最该澄清哪个概念？',
            },
            teacher: {
              content: '先把模型、数据和目标三者的关系说清楚，再进入监督学习。',
            },
          },
          role: 'assistant',
          streaming: false,
          text: '先把模型、数据和目标三者的关系说清楚，再进入监督学习。',
        }}
        onAction={onAction}
      />
    );

    expect(screen.getByText('教练反馈')).toBeTruthy();
    expect(screen.getByText('导师主讲')).toBeTruthy();
    expect(screen.getByText('学伴追问')).toBeTruthy();
    expect(screen.getByText('考官判断')).toBeTruthy();
    expect(screen.getByText('补强建议')).toBeTruthy();
    expect(screen.getByText('回答还没有把模型和数据怎么配合说清楚。')).toBeTruthy();
    expect(screen.getByText('转向 Explore')).toBeTruthy();
    fireEvent.press(screen.getByText('转去 Explore 深挖'));
    expect(onAction).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'expand_step_to_explore',
      })
    );
  });
});
