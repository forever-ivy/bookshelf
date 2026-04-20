import {
  createInitialLearningConversationState,
  reduceLearningConversationEvent,
  useLearningConversationStore,
} from '@/stores/learning-conversation-store';

describe('learning conversation store helpers', () => {
  beforeEach(() => {
    useLearningConversationStore.getState().reset();
  });

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

  it('accumulates explore reasoning deltas into the current assistant draft', () => {
    let state = createInitialLearningConversationState({
      assistantMessageId: 'local-assistant-2',
      mode: 'explore',
      userText: '进程和线程有什么区别？',
      userMessageId: 'local-user-2',
    });

    state = reduceLearningConversationEvent(state, {
      delta: '进程是资源分配单位，线程是调度执行单位。',
      type: 'explore.answer.delta',
    });
    state = reduceLearningConversationEvent(state, {
      delta: '先识别问题在比较两个概念，再抓定义维度和调度维度。',
      type: 'explore.reasoning.delta',
    });

    expect(state.messages[1]).toMatchObject({
      presentation: expect.objectContaining({
        answer: {
          content: '进程是资源分配单位，线程是调度执行单位。',
        },
        kind: 'explore',
        reasoningContent: '先识别问题在比较两个概念，再抓定义维度和调度维度。',
      }),
      streaming: true,
    });
  });

  it('preserves prior history when starting a new draft', () => {
    useLearningConversationStore.getState().hydrateHistory([
      {
        cards: [],
        id: 'history-user-1',
        presentation: null,
        role: 'user',
        streaming: false,
        text: '这个文档讲了什么？',
      },
      {
        cards: [],
        id: 'history-assistant-1',
        presentation: {
          answer: {
            content: '它先给了一段概览。',
          },
          bridgeActions: [],
          evidence: [],
          followups: [],
          kind: 'explore',
          relatedConcepts: [],
        },
        role: 'assistant',
        streaming: false,
        text: '它先给了一段概览。',
      },
    ]);

    useLearningConversationStore.getState().startDraft({
      assistantMessageId: 'local-assistant-3',
      mode: 'explore',
      userMessageId: 'local-user-3',
      userText: '继续展开第二段',
    });

    expect(useLearningConversationStore.getState().messages).toMatchObject([
      expect.objectContaining({
        id: 'history-user-1',
        text: '这个文档讲了什么？',
      }),
      expect.objectContaining({
        id: 'history-assistant-1',
        text: '它先给了一段概览。',
      }),
      expect.objectContaining({
        id: 'local-user-3',
        text: '继续展开第二段',
      }),
      expect.objectContaining({
        id: 'local-assistant-3',
        streaming: true,
      }),
    ]);
  });

  it('keeps the optimistic user draft when history rehydrates during an active stream', () => {
    useLearningConversationStore.getState().hydrateHistory([
      {
        cards: [],
        id: 'history-assistant-1',
        presentation: {
          answer: {
            content: '它先给了一段概览。',
          },
          bridgeActions: [],
          evidence: [],
          followups: [],
          kind: 'explore',
          relatedConcepts: [],
        },
        role: 'assistant',
        streaming: false,
        text: '它先给了一段概览。',
      },
    ]);

    useLearningConversationStore.getState().startDraft({
      assistantMessageId: 'local-assistant-4',
      mode: 'explore',
      userMessageId: 'local-user-4',
      userText: '你好！我是你的微积分复习助手。',
    });

    useLearningConversationStore.getState().hydrateHistory([
      {
        cards: [],
        id: 'history-assistant-1',
        presentation: {
          answer: {
            content: '它先给了一段概览。',
          },
          bridgeActions: [],
          evidence: [],
          followups: [],
          kind: 'explore',
          relatedConcepts: [],
        },
        role: 'assistant',
        streaming: false,
        text: '它先给了一段概览。',
      },
    ]);

    expect(useLearningConversationStore.getState().messages).toMatchObject([
      expect.objectContaining({
        id: 'history-assistant-1',
      }),
      expect.objectContaining({
        id: 'local-user-4',
        role: 'user',
        text: '你好！我是你的微积分复习助手。',
      }),
      expect.objectContaining({
        id: 'local-assistant-4',
        streaming: true,
      }),
    ]);
  });

  it('keeps the optimistic user message after assistant.final until synced history includes that user turn', () => {
    let state = createInitialLearningConversationState({
      assistantMessageId: 'local-assistant-5',
      mode: 'explore',
      userText: '帮我总结这份资料的重点',
      userMessageId: 'local-user-5',
    });

    state = reduceLearningConversationEvent(state, {
      message: {
        content: '这是已经整理好的总结。',
        createdAt: '2026-04-08T08:31:00Z',
        id: 900,
        role: 'assistant',
        learningSessionId: 301,
        presentation: {
          answer: {
            content: '这是已经整理好的总结。',
          },
          bridgeActions: [],
          evidence: [],
          followups: [],
          kind: 'explore',
          relatedConcepts: [],
        },
      },
      type: 'assistant.final',
    });

    useLearningConversationStore.setState(state);
    useLearningConversationStore.getState().hydrateHistory([
      {
        cards: [],
        id: 'history-assistant-1',
        presentation: {
          answer: {
            content: '这是已经整理好的总结。',
          },
          bridgeActions: [],
          evidence: [],
          followups: [],
          kind: 'explore',
          relatedConcepts: [],
        },
        role: 'assistant',
        streaming: false,
        text: '这是已经整理好的总结。',
      },
    ]);

    expect(useLearningConversationStore.getState().messages).toMatchObject([
      expect.objectContaining({
        id: 'history-assistant-1',
      }),
      expect.objectContaining({
        id: 'local-user-5',
        role: 'user',
        text: '帮我总结这份资料的重点',
      }),
    ]);
  });
});
