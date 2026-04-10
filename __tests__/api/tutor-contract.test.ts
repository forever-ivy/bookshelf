import {
  createTutorProfile,
  getTutorDashboard,
  getTutorProfile,
  listTutorSessionMessages,
  startTutorSession,
} from '@/lib/api/tutor';

describe('tutor contract', () => {
  const originalBaseUrl = process.env.EXPO_PUBLIC_LIBRARY_SERVICE_URL;
  const originalTutorDataMode = process.env.EXPO_PUBLIC_TUTOR_DATA_MODE;
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.EXPO_PUBLIC_LIBRARY_SERVICE_URL = 'https://library.example';
    process.env.EXPO_PUBLIC_TUTOR_DATA_MODE = 'live';
    global.fetch = jest.fn();
  });

  afterEach(() => {
    process.env.EXPO_PUBLIC_LIBRARY_SERVICE_URL = originalBaseUrl;
    process.env.EXPO_PUBLIC_TUTOR_DATA_MODE = originalTutorDataMode;
    global.fetch = originalFetch;
    jest.resetAllMocks();
  });

  it('prefers frontend tutor mock data by default until live mode is enabled', async () => {
    delete process.env.EXPO_PUBLIC_TUTOR_DATA_MODE;

    const result = await getTutorDashboard('reader-token');

    expect(global.fetch).not.toHaveBeenCalled();
    expect(result.recentProfiles.length).toBeGreaterThanOrEqual(4);
    expect(result.recentProfiles.some((profile) => profile.title === '高等数学题型拆解')).toBe(true);
  });

  it('includes a teacher-style lead-in before the history timeline prompt in mock session messages', async () => {
    delete process.env.EXPO_PUBLIC_TUTOR_DATA_MODE;

    const messages = await listTutorSessionMessages(305);

    expect(messages[0]?.content).toBe(
      '我们先把这段近代史看成一条会不断推进的主线。近代史最容易碎片化。先别背条目，如果只保留四个时间节点，你会选哪四个？'
    );
  });

  it('normalizes dashboard progress, continue session, and suggestions', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({
        continue_session: {
          completed_steps_count: 1,
          conversation_session_id: 401,
          current_step_index: 1,
          current_step_title: '用自己的话解释监督学习',
          id: 301,
          last_message_preview: '先试着说说什么是标签数据。',
          progress_label: '1 / 4 步',
          status: 'active',
          tutor_profile: {
            id: 101,
            persona_json: {
              greeting: '我们一步步来。',
              name: '周老师',
            },
            title: '机器学习从零到一',
          },
        },
        recent_profiles: [
          {
            created_at: '2026-04-08T08:00:00Z',
            curriculum_json: [{ title: '建立整体地图' }],
            id: 101,
            persona_json: { greeting: '我们一步步来。', name: '周老师' },
            source_type: 'book',
            status: 'ready',
            title: '机器学习从零到一',
            updated_at: '2026-04-08T08:20:00Z',
          },
        ],
        suggestions: [
          {
            description: '先从整体框架入手，再回到算法细节。',
            id: 'next-step-1',
            kind: 'next_step',
            title: '继续当前书的第 2 步',
          },
        ],
      }),
      ok: true,
    });

    const result = await getTutorDashboard('reader-token');

    expect(result.continueSession).toMatchObject({
      completedStepsCount: 1,
      currentStepIndex: 1,
      currentStepTitle: '用自己的话解释监督学习',
      id: 301,
      progressLabel: '1 / 4 步',
      profileId: 101,
      title: '机器学习从零到一',
    });
    expect(result.recentProfiles[0]).toMatchObject({
      id: 101,
      sourceType: 'book',
      status: 'ready',
      title: '机器学习从零到一',
    });
    expect(result.suggestions[0]).toMatchObject({
      description: '先从整体框架入手，再回到算法细节。',
      id: 'next-step-1',
      kind: 'next_step',
      title: '继续当前书的第 2 步',
    });
  });

  it('normalizes profile details and session bootstrap payloads', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        json: async () => ({
          profile: {
            book_id: 1,
            created_at: '2026-04-08T08:00:00Z',
            curriculum_json: [
              {
                guiding_question: '你觉得机器学习最先该建立什么概念？',
                id: 'step-1',
                success_criteria: '能说出模型、数据、目标之间的关系',
                title: '建立整体框架',
              },
            ],
            id: 101,
            persona_json: {
              greeting: '我们一步步来。',
              name: '周老师',
              style: '先提问再提示',
            },
            source_type: 'book',
            status: 'ready',
            title: '机器学习从零到一',
            updated_at: '2026-04-08T08:20:00Z',
          },
        }),
        ok: true,
      })
      .mockResolvedValueOnce({
        json: async () => ({
          first_step: {
            guiding_question: '先用一句话概括这本书会教你什么。',
            id: 'step-1',
            title: '建立整体框架',
          },
          session: {
            completed_steps_count: 0,
            completed_steps_json: [],
            conversation_session_id: 9001,
            current_step_index: 0,
            id: 301,
            progress_label: '0 / 4 步',
            status: 'active',
            tutor_profile_id: 101,
          },
          welcome_message: '欢迎回来，我们先用一句话概括这本书。',
        }),
        ok: true,
      });

    const profile = await getTutorProfile(101, 'reader-token');
    const session = await startTutorSession(101, 'reader-token');

    expect(profile).toMatchObject({
      bookId: 1,
      id: 101,
      sourceType: 'book',
      status: 'ready',
      title: '机器学习从零到一',
    });
    expect(profile.persona).toMatchObject({
      greeting: '我们一步步来。',
      name: '周老师',
      style: '先提问再提示',
    });
    expect(profile.curriculum[0]).toMatchObject({
      guidingQuestion: '你觉得机器学习最先该建立什么概念？',
      successCriteria: '能说出模型、数据、目标之间的关系',
      title: '建立整体框架',
    });
    expect(session.session).toMatchObject({
      conversationSessionId: 9001,
      currentStepIndex: 0,
      id: 301,
      progressLabel: '0 / 4 步',
      tutorProfileId: 101,
    });
    expect(session.firstStep).toMatchObject({
      guidingQuestion: '先用一句话概括这本书会教你什么。',
      title: '建立整体框架',
    });
    expect(session.welcomeMessage).toBe('欢迎回来，我们先用一句话概括这本书。');
  });

  it('sends aligned tutor profile creation payloads', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({
        profile: {
          created_at: '2026-04-08T08:00:00Z',
          curriculum_json: [],
          id: 102,
          persona_json: {
            greeting: '我们从你的资料开始。',
            name: '实验课助教',
          },
          source_type: 'upload',
          status: 'generating',
          title: '实验手册导学',
          updated_at: '2026-04-08T08:00:00Z',
        },
      }),
      ok: true,
    });

    await createTutorProfile(
      {
        sourceType: 'upload',
        sourceText: '实验步骤一：配置环境。',
        teachingGoal: '实验预习',
        title: '实验手册导学',
      },
      'reader-token'
    );

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect((global.fetch as jest.Mock).mock.calls[0]?.[0]).toBe('https://library.example/api/v1/tutor/profiles');
    expect(JSON.parse(String((global.fetch as jest.Mock).mock.calls[0]?.[1]?.body))).toEqual({
      source_text: '实验步骤一：配置环境。',
      source_type: 'upload',
      teaching_goal: '实验预习',
      title: '实验手册导学',
    });
  });

  it('returns a parsing upload profile with the file name while frontend mock mode is active', async () => {
    delete process.env.EXPO_PUBLIC_TUTOR_DATA_MODE;

    const profile = await createTutorProfile({
      sourceText: 'file:///mock/course-outline.pdf',
      sourceType: 'upload',
      title: 'course-outline.pdf',
    });

    expect(profile.status).toBe('generating');
    expect(profile.title).toBe('course-outline.pdf');
    expect(profile.persona.greeting).toBe('正在解析文档，请稍后');
  });
});
