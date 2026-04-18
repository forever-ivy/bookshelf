import {
  createInitialLearningConversationState,
  reduceLearningConversationEvent,
} from '@/stores/learning-conversation-store';

describe('learning conversation store helpers', () => {
  it('builds a structured guide draft from typed stream events', () => {
    let state = createInitialLearningConversationState({
      assistantMessageId: 'local-assistant-1',
      mode: 'guide',
      userText: '帮我总结这一节的核心线索',
      userMessageId: 'local-user-1',
    });

    state = reduceLearningConversationEvent(state, {
      delta: '我们先回到模型、数据和目标这三者的关系。',
      type: 'teacher.delta',
    });
    state = reduceLearningConversationEvent(state, {
      items: [
        {
          excerpt: '围绕模型、数据和目标组织内容。',
          sourceTitle: '机器学习从零到一',
        },
      ],
      type: 'evidence.items',
    });
    state = reduceLearningConversationEvent(state, {
      evaluation: {
        masteryScore: 0.82,
        missingConcepts: [],
        passed: true,
        reasoning: '回答已经覆盖当前步骤的关键线索。',
        stepIndex: 0,
      },
      type: 'evaluation',
    });
    state = reduceLearningConversationEvent(state, {
      items: ['继续说明数据和模型之间的关系'],
      type: 'followups.items',
    });
    state = reduceLearningConversationEvent(state, {
      actions: [
        {
          actionType: 'expand_step_to_explore',
          label: '展开自由探索',
        },
      ],
      type: 'bridge.actions',
    });

    expect(state.messages[1]).toMatchObject({
      cards: expect.arrayContaining([
        expect.objectContaining({
          kind: 'teacher',
          title: '导师主讲',
        }),
        expect.objectContaining({
          kind: 'examiner',
        }),
        expect.objectContaining({
          kind: 'followups',
        }),
      ]),
      presentation: expect.objectContaining({
        bridgeActions: [
          expect.objectContaining({
            actionType: 'expand_step_to_explore',
          }),
        ],
        evidence: [
          expect.objectContaining({
            sourceTitle: '机器学习从零到一',
          }),
        ],
        examiner: expect.objectContaining({
          passed: true,
        }),
        kind: 'guide',
        teacher: expect.objectContaining({
          content: '我们先回到模型、数据和目标这三者的关系。',
        }),
      }),
      streaming: true,
    });
  });
});
