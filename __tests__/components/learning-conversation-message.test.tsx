import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { LearningConversationMessage } from '@/components/learning/learning-conversation-message';

describe('learning conversation message', () => {
  it('renders structured guide cards and exposes bridge actions', () => {
    const onAction = jest.fn();

    render(
      <LearningConversationMessage
        message={{
          cards: [
            {
              content: '先把模型、数据和目标三者的关系说清楚，再进入监督学习。',
              kind: 'teacher',
              title: '导师主讲',
            },
            {
              evaluation: {
                masteryScore: 0.82,
                missingConcepts: [],
                passed: true,
                reasoning: '回答已经覆盖当前步骤的关键线索。',
                stepIndex: 0,
              },
              kind: 'examiner',
              title: '考官判断',
            },
            {
              items: ['继续说明数据和模型之间的关系'],
              kind: 'followups',
              title: '继续推进',
            },
            {
              actions: [
                {
                  actionType: 'expand_step_to_explore',
                  label: '转去 Explore 深挖',
                },
              ],
              kind: 'bridge_actions',
              title: '延展动作',
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
              masteryScore: 0.82,
              missingConcepts: [],
              passed: true,
              reasoning: '回答已经覆盖当前步骤的关键线索。',
              stepIndex: 0,
            },
            followups: ['继续说明数据和模型之间的关系'],
            kind: 'guide',
            peer: null,
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

    expect(screen.getByText('导师主讲')).toBeTruthy();
    expect(screen.getByText('考官判断')).toBeTruthy();
    expect(screen.getByText('继续推进')).toBeTruthy();
    fireEvent.press(screen.getByText('转去 Explore 深挖'));
    expect(onAction).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'expand_step_to_explore',
      })
    );
  });
});
