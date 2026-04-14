import {
  createTutorProfile,
  getTutorDashboard,
  getTutorProfile,
  listTutorSessionMessages,
  startTutorSession,
  streamTutorSessionReply,
  uploadTutorProfile,
} from '@/lib/api/tutor';

describe('tutor contract', () => {
  const originalBaseUrl = process.env.EXPO_PUBLIC_LIBRARY_SERVICE_URL;
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.EXPO_PUBLIC_LIBRARY_SERVICE_URL = 'https://library.example';
    global.fetch = jest.fn();
  });

  afterEach(() => {
    process.env.EXPO_PUBLIC_LIBRARY_SERVICE_URL = originalBaseUrl;
    global.fetch = originalFetch;
    jest.resetAllMocks();
  });

  it('throws service_not_configured when the tutor backend base url is missing', async () => {
    delete process.env.EXPO_PUBLIC_LIBRARY_SERVICE_URL;

    await expect(getTutorDashboard('reader-token')).rejects.toMatchObject({
      code: 'service_not_configured',
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('normalizes dashboard progress, resumable sessions, and suggestions', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({
        recentProfiles: [
          {
            createdAt: '2026-04-08T08:00:00Z',
            curriculum: {
              steps: [
                {
                  guidingQuestion: '你觉得机器学习最先该建立什么概念？',
                  index: 0,
                  successCriteria: '能说出模型、数据、目标之间的关系',
                  title: '建立整体框架',
                },
              ],
            },
            id: 101,
            persona: { greeting: '我们一步步来。', name: '周老师' },
            sourceSummary: '从馆藏摘要里提炼出来的导学主线。',
            sourceType: 'book',
            status: 'ready',
            title: '机器学习从零到一',
            updatedAt: '2026-04-08T08:20:00Z',
          },
        ],
        resumableSessions: [
          {
            completedStepsCount: 1,
            currentStepIndex: 1,
            currentStepTitle: '用自己的话解释监督学习',
            id: 301,
            lastMessagePreview: '先试着说说什么是标签数据。',
            readerId: 9,
            startedAt: '2026-04-08T08:02:00Z',
            status: 'active',
            tutorProfileId: 101,
            updatedAt: '2026-04-08T08:22:00Z',
          },
        ],
        suggestions: [
          {
            kind: 'start_session',
            profileId: 101,
            title: '机器学习从零到一',
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
      profileId: 101,
      tutorProfileId: 101,
    });
    expect(result.recentProfiles[0]).toMatchObject({
      id: 101,
      sourceSummary: '从馆藏摘要里提炼出来的导学主线。',
      sourceType: 'book',
      status: 'ready',
      title: '机器学习从零到一',
    });
    expect(result.recentProfiles[0]?.curriculum[0]).toMatchObject({
      guidingQuestion: '你觉得机器学习最先该建立什么概念？',
      successCriteria: '能说出模型、数据、目标之间的关系',
      title: '建立整体框架',
    });
    expect(result.suggestions[0]).toMatchObject({
      kind: 'start_session',
      profileId: 101,
      title: '机器学习从零到一',
    });
  });

  it('normalizes profile details, sources, message citations, and session bootstrap payloads', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        json: async () => ({
          latestJob: {
            id: 9,
            status: 'processing',
          },
          profile: {
            bookId: 1,
            createdAt: '2026-04-08T08:00:00Z',
            curriculum: {
              steps: [
                {
                  guidingQuestion: '你觉得机器学习最先该建立什么概念？',
                  index: 0,
                  successCriteria: '能说出模型、数据、目标之间的关系',
                  title: '建立整体框架',
                },
              ],
            },
            id: 101,
            persona: {
              greeting: '我们一步步来。',
              name: '周老师',
              style: '先提问再提示',
            },
            sourceSummary: '从馆藏书摘要拆出的导学提要。',
            sourceType: 'book',
            status: 'ready',
            title: '机器学习从零到一',
            updatedAt: '2026-04-08T08:20:00Z',
          },
          sources: [
            {
              contentHash: 'abc',
              fileName: 'book-1.md',
              id: 7,
              kind: 'book_synthetic',
              metadata: { bookId: 1, bookTitle: '机器学习从零到一' },
              mimeType: 'text/markdown',
              parseStatus: 'parsed',
              profileId: 101,
            },
          ],
        }),
        ok: true,
      })
      .mockResolvedValueOnce({
        json: async () => ({
          items: [
            {
              citations: [
                {
                  chunkId: 11,
                  excerpt: '围绕模型、数据和目标组织内容。',
                  sourceTitle: '机器学习从零到一',
                },
              ],
              content: '我们先回到模型、数据和目标这三者的关系。',
              createdAt: '2026-04-08T08:22:00Z',
              id: 801,
              role: 'assistant',
              sessionId: 301,
            },
          ],
        }),
        ok: true,
      })
      .mockResolvedValueOnce({
        json: async () => ({
          firstStep: {
            guidingQuestion: '先用一句话概括这本书会教你什么。',
            index: 0,
            title: '建立整体框架',
          },
          session: {
            completedStepsCount: 0,
            currentStepIndex: 0,
            currentStepTitle: '建立整体框架',
            id: 301,
            startedAt: '2026-04-08T08:21:00Z',
            status: 'active',
            tutorProfileId: 101,
            updatedAt: '2026-04-08T08:21:00Z',
          },
          welcomeMessage: {
            content: '欢迎回来，我们先用一句话概括这本书。',
            createdAt: '2026-04-08T08:21:00Z',
            id: 802,
            role: 'assistant',
            sessionId: 301,
          },
        }),
        ok: true,
      });

    const profile = await getTutorProfile(101, 'reader-token');
    const messages = await listTutorSessionMessages(301, 'reader-token');
    const session = await startTutorSession(101, 'reader-token');

    expect(profile).toMatchObject({
      bookId: 1,
      id: 101,
      sourceSummary: '从馆藏书摘要拆出的导学提要。',
      sourceType: 'book',
      status: 'ready',
      title: '机器学习从零到一',
    });
    expect(profile.sources[0]).toMatchObject({
      fileName: 'book-1.md',
      kind: 'book_synthetic',
      parseStatus: 'parsed',
      profileId: 101,
    });
    expect(messages[0]).toMatchObject({
      content: '我们先回到模型、数据和目标这三者的关系。',
      role: 'assistant',
      tutorSessionId: 301,
    });
    expect(messages[0]?.citations?.[0]).toMatchObject({
      chunkId: 11,
      sourceTitle: '机器学习从零到一',
    });
    expect(session.session).toMatchObject({
      currentStepIndex: 0,
      currentStepTitle: '建立整体框架',
      id: 301,
      tutorProfileId: 101,
    });
    expect(session.firstStep).toMatchObject({
      guidingQuestion: '先用一句话概括这本书会教你什么。',
      title: '建立整体框架',
    });
    expect(session.welcomeMessage).toMatchObject({
      content: '欢迎回来，我们先用一句话概括这本书。',
      role: 'assistant',
      tutorSessionId: 301,
    });
  });

  it('sends aligned tutor profile creation payloads for book-based tutors', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({
        profile: {
          createdAt: '2026-04-08T08:00:00Z',
          curriculum: { steps: [] },
          id: 102,
          persona: {
            greeting: '我们从这本书开始。',
            name: '馆藏导学老师',
          },
          sourceType: 'book',
          status: 'queued',
          title: '机器学习从零到一',
          updatedAt: '2026-04-08T08:00:00Z',
        },
      }),
      ok: true,
    });

    await createTutorProfile(
      {
        bookId: 1,
        sourceType: 'book',
        teachingGoal: '实验预习',
        title: '机器学习从零到一',
      },
      'reader-token'
    );

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect((global.fetch as jest.Mock).mock.calls[0]?.[0]).toBe(
      'https://library.example/api/v1/tutor/profiles'
    );
    expect(JSON.parse(String((global.fetch as jest.Mock).mock.calls[0]?.[1]?.body))).toEqual({
      bookId: 1,
      sourceType: 'book',
      teachingGoal: '实验预习',
      title: '机器学习从零到一',
    });
  });

  it('uploads tutor source files with FormData and normalizes the queued profile', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({
        profile: {
          createdAt: '2026-04-08T08:00:00Z',
          curriculum: { steps: [] },
          id: 202,
          persona: {
            greeting: '资料正在解析中。',
            name: '资料分析助手',
          },
          sourceType: 'upload',
          status: 'queued',
          title: '操作系统实验讲义',
          updatedAt: '2026-04-08T08:00:00Z',
        },
      }),
      ok: true,
    });

    const formData = new FormData();
    formData.append('title', '操作系统实验讲义');
    formData.append('teachingGoal', '帮助我完成实验预习');
    formData.append('file', 'mock-binary');

    const profile = await uploadTutorProfile(formData, 'reader-token');

    expect(profile).toMatchObject({
      id: 202,
      sourceType: 'upload',
      status: 'queued',
      title: '操作系统实验讲义',
    });
    expect((global.fetch as jest.Mock).mock.calls[0]?.[0]).toBe(
      'https://library.example/api/v1/tutor/profiles/upload'
    );
    expect((global.fetch as jest.Mock).mock.calls[0]?.[1]?.body).toBe(formData);
  });

  it('parses backend sse events for tutor streaming replies', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            [
              'data: {"event":"status","data":{"phase":"retrieving","sessionId":301}}',
              '',
              'data: {"event":"assistant.delta","data":{"delta":"我们先"}}',
              '',
              'data: {"event":"evaluation","data":{"confidence":0.82,"meetsCriteria":true,"reasoning":"回答已经覆盖当前步骤的关键线索。","stepIndex":0}}',
              '',
              'data: {"event":"session.updated","data":{"id":301,"tutorProfileId":101,"status":"active","currentStepIndex":1,"currentStepTitle":"用自己的话解释概念","completedStepsCount":1,"startedAt":"2026-04-08T08:21:00Z","updatedAt":"2026-04-08T08:22:00Z"}}',
              '',
              'data: {"event":"assistant.done","data":{"message":{"id":801,"sessionId":301,"role":"assistant","content":"我们先回到模型、数据和目标这三者的关系。","citations":[{"chunkId":11,"sourceTitle":"机器学习从零到一"}],"createdAt":"2026-04-08T08:22:00Z"}}}',
              '',
            ].join('\n')
          )
        );
        controller.close();
      },
    });

    (global.fetch as jest.Mock).mockResolvedValue({
      body: stream,
      headers: { get: () => 'text/event-stream' },
      ok: true,
      status: 200,
    });

    const events = [];
    for await (const event of streamTutorSessionReply(
      301,
      { content: '帮我总结这一节的核心线索' },
      'reader-token'
    )) {
      events.push(event);
    }

    expect(events.map((event) => event.type)).toEqual([
      'status',
      'assistant.delta',
      'evaluation',
      'session.updated',
      'assistant.done',
    ]);
    expect(events[0]).toMatchObject({
      phase: 'retrieving',
      type: 'status',
    });
    expect(events[4]).toMatchObject({
      message: {
        citations: [{ chunkId: 11, sourceTitle: '机器学习从零到一' }],
        tutorSessionId: 301,
      },
      type: 'assistant.done',
    });
  });
});
