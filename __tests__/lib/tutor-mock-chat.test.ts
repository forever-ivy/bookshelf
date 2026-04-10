import {
  createInitialTutorChatMessages,
  extractTextFromUIMessage,
} from '@/lib/tutor/mock-chat';

describe('tutor mock chat seeds', () => {
  it('hydrates a full workspace transcript when history messages exist', () => {
    const profile = {
      bookId: 1,
      createdAt: '2026-04-08T08:00:00Z',
      curriculum: [
        {
          goal: '先建立整体框架。',
          guidingQuestion: '如果只用一句话介绍这本书，它最核心的任务是什么？',
          id: 'step-1',
          successCriteria: '能说清主题和目标。',
          title: '建立整体框架',
        },
        {
          goal: '把关键概念说清楚。',
          guidingQuestion: '你会怎么解释监督学习和标签数据？',
          id: 'step-2',
          successCriteria: '能用自己的话解释核心概念。',
          title: '用自己的话解释概念',
        },
      ],
      id: 101,
      persona: {
        coachingFocus: '先搭框架，再用自己的话解释。',
        greeting: '我们先把这本书真正学进去。',
        name: '周老师',
        style: '先追问，再补脚手架',
      },
      sourceText: '一本关于机器学习入门的馆藏书。',
      sourceType: 'book' as const,
      status: 'ready' as const,
      title: '机器学习从零到一',
      updatedAt: '2026-04-08T08:30:00Z',
    };

    const session = {
      completedSteps: [{ completedAt: '2026-04-08T08:20:00Z', confidence: 0.82, stepIndex: 0 }],
      completedStepsCount: 1,
      conversationSessionId: 401,
      createdAt: '2026-04-08T08:00:00Z',
      currentStepIndex: 1,
      currentStepTitle: '用自己的话解释概念',
      id: 301,
      lastMessagePreview: '先试着说说什么是标签数据。',
      progressLabel: '1 / 2 步',
      status: 'active' as const,
      tutorProfileId: 101,
      updatedAt: '2026-04-08T08:30:00Z',
    };

    const history = [
      {
        content: '我们先不急着记算法名。你觉得这本书最先要帮你建立的是什么框架？',
        createdAt: '2026-04-08T08:00:00Z',
        id: 801,
        role: 'assistant' as const,
        tutorSessionId: 301,
      },
      {
        content: '我觉得它先让我知道数据、目标和模型之间是什么关系。',
        createdAt: '2026-04-08T08:04:00Z',
        id: 802,
        role: 'user' as const,
        tutorSessionId: 301,
      },
      {
        content: '很好，这说明你已经有了整体图景。下一步我们试着用自己的话解释监督学习。',
        createdAt: '2026-04-08T08:06:00Z',
        id: 803,
        role: 'assistant' as const,
        tutorSessionId: 301,
      },
      {
        content: '监督学习就是给模型看已经标好答案的数据，让它自己学会从输入推到输出。',
        createdAt: '2026-04-08T08:11:00Z',
        id: 804,
        role: 'user' as const,
        tutorSessionId: 301,
      },
      {
        content: '这个解释已经很接近了。那你再想一层，什么叫“标签数据”？',
        createdAt: '2026-04-08T08:14:00Z',
        id: 805,
        role: 'assistant' as const,
        tutorSessionId: 301,
      },
      {
        content: '标签就是训练时已经知道的正确结果，比如邮件是不是垃圾邮件。',
        createdAt: '2026-04-08T08:18:00Z',
        id: 806,
        role: 'user' as const,
        tutorSessionId: 301,
      },
    ];

    const messages = createInitialTutorChatMessages(profile, session, history);

    expect(messages).toHaveLength(history.length);
    expect(messages.filter((message) => message.role === 'assistant')).toHaveLength(3);
    expect(messages.filter((message) => message.role === 'user')).toHaveLength(3);
    expect(extractTextFromUIMessage(messages[0])).toContain('最先要帮你建立的是什么框架');
    expect(extractTextFromUIMessage(messages.at(-1) ?? {})).toContain('邮件是不是垃圾邮件');
  });

  it('falls back to greeting and current step prompt when there is no history', () => {
    const profile = {
      bookId: null,
      createdAt: '2026-04-08T09:00:00Z',
      curriculum: [
        {
          goal: '先识别资料要完成什么。',
          guidingQuestion: '这份资料最想让你完成什么？',
          id: 'step-1',
          successCriteria: '能说清资料目标。',
          title: '看清资料任务',
        },
      ],
      id: 102,
      persona: {
        greeting: '这份资料适合先做一轮预习，我们先辨认任务和风险点。',
        name: '实验课助教',
      },
      sourceType: 'upload' as const,
      status: 'ready' as const,
      title: '实验手册导学',
      updatedAt: '2026-04-08T09:12:00Z',
    };

    const session = {
      completedSteps: [],
      completedStepsCount: 0,
      conversationSessionId: 402,
      createdAt: '2026-04-08T09:00:00Z',
      currentStepIndex: 0,
      currentStepTitle: '看清资料任务',
      id: 302,
      lastMessagePreview: '先试着判断这份手册最想让你完成什么。',
      progressLabel: '0 / 1 步',
      status: 'active' as const,
      tutorProfileId: 102,
      updatedAt: '2026-04-08T09:12:00Z',
    };

    const messages = createInitialTutorChatMessages(profile, session, []);

    expect(messages).toHaveLength(2);
    expect(extractTextFromUIMessage(messages[0])).toContain('先辨认任务和风险点');
    expect(extractTextFromUIMessage(messages[1])).toBe(
      '这份资料最想让你完成什么？ 先试着判断这份手册最想让你完成什么。'
    );
  });
});
