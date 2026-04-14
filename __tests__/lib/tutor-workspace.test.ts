import {
  buildTutorSessionTransitionLabel,
  buildTutorWorkspaceSources,
  createTutorRenderedMessages,
} from '@/lib/tutor/workspace';

describe('tutor workspace helpers', () => {
  it('hydrates a full workspace transcript from persisted session messages', () => {
    const messages = createTutorRenderedMessages([
      {
        content: '我们先不急着记算法名。你觉得这本书最先要帮你建立的是什么框架？',
        createdAt: '2026-04-08T08:00:00Z',
        id: 801,
        role: 'assistant',
        tutorSessionId: 301,
      },
      {
        content: '我觉得它先让我知道数据、目标和模型之间是什么关系。',
        createdAt: '2026-04-08T08:04:00Z',
        id: 802,
        role: 'user',
        tutorSessionId: 301,
      },
    ]);

    expect(messages).toHaveLength(2);
    expect(messages[0]).toMatchObject({
      role: 'assistant',
      text: '我们先不急着记算法名。你觉得这本书最先要帮你建立的是什么框架？',
    });
    expect(messages[1]).toMatchObject({
      role: 'user',
      text: '我觉得它先让我知道数据、目标和模型之间是什么关系。',
    });
  });

  it('builds workspace source cards from backend profile sources', () => {
    const sourceCards = buildTutorWorkspaceSources({
      bookId: 1,
      createdAt: '2026-04-08T08:00:00Z',
      curriculum: [],
      id: 101,
      persona: {
        greeting: '我们先把这本书真正学进去。',
        name: '周老师',
      },
      sourceSummary: '从馆藏书摘要拆出的导学提要。',
      sourceType: 'book',
      sources: [
        {
          fileName: 'book-1.md',
          id: 7,
          kind: 'book_synthetic',
          metadata: { bookId: 1, bookTitle: '机器学习从零到一' },
          parseStatus: 'parsed',
          profileId: 101,
        },
      ],
      status: 'ready',
      title: '机器学习从零到一',
      updatedAt: '2026-04-08T08:30:00Z',
    });

    expect(sourceCards).toEqual([
      expect.objectContaining({
        excerpt: '从馆藏书摘要拆出的导学提要。',
        meta: 'BOOK · 已解析',
        title: 'book-1.md',
      }),
    ]);
  });

  it('describes step transitions after a streamed tutor update', () => {
    const label = buildTutorSessionTransitionLabel(
      {
        completedSteps: [{ completedAt: '2026-04-08T08:00:00Z', confidence: 0.82, stepIndex: 0 }],
        completedStepsCount: 1,
        conversationSessionId: 401,
        createdAt: '2026-04-08T08:00:00Z',
        currentStepIndex: 1,
        currentStepTitle: '用自己的话解释概念',
        id: 301,
        progressLabel: '1 / 2 步',
        status: 'active',
        tutorProfileId: 101,
        updatedAt: '2026-04-08T08:30:00Z',
      },
      {
        completedSteps: [
          { completedAt: '2026-04-08T08:00:00Z', confidence: 0.82, stepIndex: 0 },
          { completedAt: '2026-04-08T08:31:00Z', confidence: 0.86, stepIndex: 1 },
        ],
        completedStepsCount: 2,
        conversationSessionId: 401,
        createdAt: '2026-04-08T08:00:00Z',
        currentStepIndex: 1,
        currentStepTitle: '用自己的话解释概念',
        id: 301,
        progressLabel: '2 / 2 步',
        status: 'completed',
        tutorProfileId: 101,
        updatedAt: '2026-04-08T08:31:00Z',
      }
    );

    expect(label).toBe('当前导学本的所有步骤都已完成。');
  });
});
