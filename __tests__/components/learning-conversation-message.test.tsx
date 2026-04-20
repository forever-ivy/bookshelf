import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { LearningConversationMessage } from '@/components/learning/learning-conversation-message';

describe('learning conversation message', () => {
  it('renders coach-first guide cards and exposes supporting sections and redirect actions', () => {
    const handleAction = jest.fn();

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
        onAction={handleAction}
      />
    );

    expect(screen.getByText('Guide')).toBeTruthy();
    expect(screen.getAllByText('先把模型、数据和目标三者的关系说清楚，再进入监督学习。').length).toBeGreaterThan(0);
    expect(screen.getByText('如果继续往下学，你觉得下一步最该澄清哪个概念？')).toBeTruthy();
    expect(screen.getByText('考官判断')).toBeTruthy();
    expect(screen.getByText('回答还没有把模型和数据怎么配合说清楚。')).toBeTruthy();
    expect(screen.getByText('补强建议')).toBeTruthy();
    expect(screen.getByText('继续说明数据和模型之间的关系')).toBeTruthy();
    expect(screen.getByText('转向 Explore')).toBeTruthy();
    fireEvent.press(screen.getByText('转去 Explore 深挖'));
    expect(handleAction).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'expand_step_to_explore',
        label: '转去 Explore 深挖',
      })
    );
  });

  it('renders explore answers without evidence, related concepts, or followups, while keeping actions', () => {
    const handleAction = jest.fn();

    render(
      <LearningConversationMessage
        message={{
          cards: [
            {
              content: '极限的核心是先固定自变量靠近目标点，再观察函数值的稳定趋势。',
              kind: 'answer',
              title: '答案',
            },
            {
              items: [
                {
                  chunkId: 'chunk-1',
                  excerpt: '函数极限的定义关注的是 x 逼近 a 时，f(x) 是否稳定靠近 L。',
                  sourceTitle: 'test.pdf',
                },
              ],
              kind: 'evidence',
              title: '资料依据',
            },
            {
              items: ['函数极限', '无穷小量'],
              kind: 'related_concepts',
              title: '相关概念',
            },
            {
              actions: [
                {
                  actionType: 'attach_explore_turn_to_guide_step',
                  label: '收编回 Guide',
                },
              ],
              kind: 'bridge_actions',
              title: '收编动作',
            },
            {
              items: ['那它和数列极限的关系是什么？'],
              kind: 'followups',
              title: '继续追问',
            },
          ],
          id: 'message-2',
          presentation: {
            answer: {
              content: '极限的核心是先固定自变量靠近目标点，再观察函数值的稳定趋势。',
            },
            bridgeActions: [],
            evidence: [
              {
                chunkId: 'chunk-1',
                excerpt: '函数极限的定义关注的是 x 逼近 a 时，f(x) 是否稳定靠近 L。',
                sourceTitle: 'test.pdf',
              },
            ],
            followups: ['那它和数列极限的关系是什么？'],
            kind: 'explore',
            relatedConcepts: ['函数极限', '无穷小量'],
            bridgeActions: [
              {
                actionType: 'attach_explore_turn_to_guide_step',
                label: '收编回 Guide',
              },
            ],
          },
          role: 'assistant',
          streaming: false,
          text: '极限的核心是先固定自变量靠近目标点，再观察函数值的稳定趋势。',
        }}
        onAction={handleAction}
      />
    );

    expect(screen.getByText('Explore')).toBeTruthy();
    expect(screen.getByText('极限的核心是先固定自变量靠近目标点，再观察函数值的稳定趋势。')).toBeTruthy();
    expect(screen.queryByText('资料依据')).toBeNull();
    expect(screen.queryByText('test.pdf')).toBeNull();
    expect(
      screen.queryByText('函数极限的定义关注的是 x 逼近 a 时，f(x) 是否稳定靠近 L。')
    ).toBeNull();
    expect(screen.queryByText('相关概念')).toBeNull();
    expect(screen.queryByText('函数极限')).toBeNull();
    expect(screen.queryByText('无穷小量')).toBeNull();
    expect(screen.queryByText('继续追问')).toBeNull();
    expect(screen.queryByText('那它和数列极限的关系是什么？')).toBeNull();
    expect(screen.queryByText('收编动作')).toBeNull();
    expect(screen.queryByText('收编回 Guide')).toBeNull();
    expect(handleAction).not.toHaveBeenCalled();
  });

  it('renders an expandable reasoning row for explore messages when reasoning content exists', () => {
    render(
      <LearningConversationMessage
        message={{
          cards: [
            {
              content: '进程是资源分配单位，线程是调度执行单位。',
              kind: 'answer',
              title: '答案',
            },
          ],
          id: 'message-3',
          presentation: {
            answer: {
              content: '进程是资源分配单位，线程是调度执行单位。',
            },
            bridgeActions: [],
            evidence: [],
            followups: [],
            kind: 'explore',
            reasoningContent: '先识别问题在比较两个概念，再抓定义维度和调度维度。',
            relatedConcepts: [],
          },
          role: 'assistant',
          streaming: false,
          text: '进程是资源分配单位，线程是调度执行单位。',
        }}
      />
    );

    expect(screen.getByText('Explore')).toBeTruthy();
    expect(screen.queryByText('思维链')).toBeNull();
    expect(screen.queryByText('先识别问题在比较两个概念，再抓定义维度和调度维度。')).toBeNull();

    fireEvent.press(screen.getByTestId('learning-conversation-reasoning-toggle'));

    expect(screen.getByText('基于当前资料推理')).toBeTruthy();
    expect(screen.getByText('先识别问题在比较两个概念，再抓定义维度和调度维度。')).toBeTruthy();
  });

  it('does not render raw markdown or latex in the explore primary answer body', () => {
    render(
      <LearningConversationMessage
        message={{
          cards: [],
          id: 'message-3b',
          presentation: {
            answer: {
              content:
                '文档中出现了以下几个公式：\n\n1. 一个函数公式：$$ f(x) = \\\\frac{x}{1 - x^{2}} $$\n\n3. **Leibniz公式**：例如用于 $f^{100}(x)$ 的求解。',
            },
            bridgeActions: [],
            evidence: [],
            followups: [],
            kind: 'explore',
            relatedConcepts: [],
          },
          role: 'assistant',
          streaming: false,
          text: '',
        }}
      />
    );

    expect(
      screen.queryByText(
        '文档中出现了以下几个公式：\n\n1. 一个函数公式：$$ f(x) = \\\\frac{x}{1 - x^{2}} $$\n\n3. **Leibniz公式**：例如用于 $f^{100}(x)$ 的求解。'
      )
    ).toBeNull();
  });

  it('renders streaming explore messages from presentation data even before cards are built', () => {
    render(
      <LearningConversationMessage
        message={{
          cards: [],
          id: 'message-4',
          presentation: {
            answer: {
              content: '先看任务目标，再拆主要章节。',
            },
            bridgeActions: [],
            evidence: [],
            followups: [],
            kind: 'explore',
            reasoningContent: '我先定位文档目标，再决定该用概览还是分段解释。',
            relatedConcepts: [],
          },
          role: 'assistant',
          streaming: true,
          text: '先看任务目标，再拆主要章节。',
        }}
      />
    );

    expect(screen.getByText('Explore')).toBeTruthy();
    expect(screen.getByText('先看任务目标，再拆主要章节。')).toBeTruthy();

    fireEvent.press(screen.getByTestId('learning-conversation-reasoning-toggle'));

    expect(screen.getByText('我先定位文档目标，再决定该用概览还是分段解释。')).toBeTruthy();
  });
});
