import {
  buildLearningSessionTransitionLabel,
  buildLearningWorkspaceSources,
  createLearningRenderedMessages,
  shouldAutoRouteGuideDraftToExplore,
} from '@/lib/learning/workspace';

describe('learning workspace helpers', () => {
  it('hydrates a full workspace transcript from persisted session messages', () => {
    const messages = createLearningRenderedMessages([
      {
        content: '我们先不急着记算法名。你觉得这本书最先要帮你建立的是什么框架？',
        createdAt: '2026-04-08T08:00:00Z',
        id: 801,
        role: 'assistant',
        learningSessionId: 301,
      },
      {
        content: '我觉得它先让我知道数据、目标和模型之间是什么关系。',
        createdAt: '2026-04-08T08:04:00Z',
        id: 802,
        role: 'user',
        learningSessionId: 301,
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

  it('preserves structured guide presentations as renderable workspace cards', () => {
    const messages = createLearningRenderedMessages([
      {
        citations: [
          {
            excerpt: '围绕模型、数据和目标组织内容。',
            sourceTitle: '机器学习从零到一',
          },
        ],
        content: '先把模型、数据和目标三者的关系说清楚，再进入监督学习。',
        createdAt: '2026-04-08T08:05:00Z',
        id: 803,
        learningSessionId: 301,
        presentation: {
          bridgeActions: [
            {
              actionType: 'expand_step_to_explore',
              label: '转去 Explore 深挖',
            },
          ],
          evidence: [
            {
              excerpt: '围绕模型、数据和目标组织内容。',
              sourceTitle: '机器学习从零到一',
            },
          ],
          examiner: {
            masteryScore: 0.82,
            missingConcepts: [],
            passed: true,
            reasoning: '回答已经覆盖当前步骤的关键线索。',
            stepIndex: 0,
          },
          followups: [],
          kind: 'guide',
          peer: {
            content: '如果继续往下学，你觉得下一步最该澄清哪个概念？',
          },
          teacher: {
            content: '先把模型、数据和目标三者的关系说清楚，再进入监督学习。',
          },
        },
        role: 'assistant',
      },
    ]);

    expect(messages[0]).toMatchObject({
      presentation: expect.objectContaining({
        kind: 'guide',
      }),
      role: 'assistant',
    });
    expect(messages[0].cards.map((card) => card.kind)).toEqual([
      'coach',
      'teacher',
      'peer',
      'examiner',
      'evidence',
      'redirect',
    ]);
  });

  it('keeps guide coach card stable and skips examiner on unevaluated turns', () => {
    const messages = createLearningRenderedMessages([
      {
        content: '先把这一步真正要解释的问题说清楚，再继续往下追。',
        createdAt: '2026-04-08T08:06:00Z',
        id: 804,
        learningSessionId: 301,
        presentation: {
          bridgeActions: [],
          evidence: [],
          examiner: {
            masteryScore: 0,
            missingConcepts: [],
            passed: false,
            reasoning: null,
            stepIndex: 0,
          },
          followups: [],
          kind: 'guide',
          peer: null,
          teacher: {
            content: '先把这一步真正要解释的问题说清楚，再继续往下追。',
          },
        },
        role: 'assistant',
      },
    ]);

    expect(messages[0].cards.map((card) => card.kind)).toEqual(['coach']);
  });

  it('builds workspace source cards from backend profile sources', () => {
    const sourceCards = buildLearningWorkspaceSources({
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

  it('describes step transitions after a streamed learning update', () => {
    const label = buildLearningSessionTransitionLabel(
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
        learningProfileId: 101,
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
        learningProfileId: 101,
        updatedAt: '2026-04-08T08:31:00Z',
      }
    );

    expect(label).toBe('当前导学本的所有步骤都已完成。');
  });

  it('detects when a guide draft is really a freeform question', () => {
    expect(shouldAutoRouteGuideDraftToExplore('这一步到底在讲什么？')).toBe(true);
    expect(shouldAutoRouteGuideDraftToExplore('帮我总结这一节的核心线索')).toBe(true);
    expect(shouldAutoRouteGuideDraftToExplore('请给我举一个更具体的例子')).toBe(true);
    expect(shouldAutoRouteGuideDraftToExplore('这是个简历')).toBe(true);
    expect(shouldAutoRouteGuideDraftToExplore('这是一份简历')).toBe(true);
    expect(shouldAutoRouteGuideDraftToExplore('这是一本讲监督学习的书')).toBe(false);
    expect(shouldAutoRouteGuideDraftToExplore('我理解它是从带标签的数据里学规律。')).toBe(
      false
    );
  });
});
