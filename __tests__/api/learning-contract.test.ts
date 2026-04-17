import {
  createLearningProfile,
  getLearningProfile,
  listLearningProfiles,
  listLearningSessionMessages,
  listLearningSessions,
  retryGenerateLearningProfile,
  startLearningSession,
  streamLearningSessionReply,
  uploadLearningProfile,
} from '@/lib/api/learning';

describe('learning contract', () => {
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

  it('throws service_not_configured when the learning backend base url is missing', async () => {
    delete process.env.EXPO_PUBLIC_LIBRARY_SERVICE_URL;

    await expect(listLearningProfiles('reader-token')).rejects.toMatchObject({
      code: 'service_not_configured',
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('normalizes learning profile summaries and owned sessions from v2 learning endpoints', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        json: async () => ({
          items: [
            {
              latestJob: {
                attemptCount: 1,
                createdAt: '2026-04-08T08:12:00Z',
                id: 9,
                jobType: 'plan_generate',
                profileId: 101,
                status: 'completed',
                updatedAt: '2026-04-08T08:20:00Z',
              },
              primaryAsset: {
                assetKind: 'book_synthetic',
                bookId: 1,
                bookSourceDocumentId: 41,
                bundleId: 12,
                contentHash: 'abc',
                fileName: 'book-1.md',
                id: 7,
                metadata: { bookTitle: '机器学习从零到一' },
                mimeType: 'text/markdown',
                parseStatus: 'parsed',
              },
              profile: {
                createdAt: '2026-04-08T08:00:00Z',
                difficultyMode: 'guided',
                goalMode: 'preview',
                id: 101,
                status: 'ready',
                title: '机器学习从零到一',
                updatedAt: '2026-04-08T08:20:00Z',
              },
              stepCount: 4,
            },
            {
              latestJob: {
                attemptCount: 0,
                createdAt: '2026-04-08T09:00:00Z',
                id: 10,
                jobType: 'plan_generate',
                profileId: 102,
                status: 'queued',
                updatedAt: '2026-04-08T09:00:00Z',
              },
              primaryAsset: {
                assetKind: 'upload_file',
                bundleId: 13,
                contentHash: 'def',
                fileName: 'course-outline.pdf',
                id: 8,
                metadata: {},
                mimeType: 'application/pdf',
                parseStatus: 'uploaded',
              },
              profile: {
                createdAt: '2026-04-08T09:00:00Z',
                difficultyMode: 'guided',
                goalMode: 'preview',
                id: 102,
                status: 'queued',
                title: 'course-outline.pdf',
                updatedAt: '2026-04-08T09:00:00Z',
              },
              stepCount: 0,
            },
          ],
        }),
        ok: true,
      })
      .mockResolvedValueOnce({
        json: async () => ({
          items: [
            {
              completedStepsCount: 1,
              currentStepIndex: 1,
              currentStepTitle: '用自己的话解释监督学习',
              id: 301,
              learningMode: 'preview',
              profileId: 101,
              sessionKind: 'guide',
              startedAt: '2026-04-08T08:02:00Z',
              status: 'active',
              updatedAt: '2026-04-08T08:22:00Z',
            },
          ],
        }),
        ok: true,
      });

    const profiles = await listLearningProfiles('reader-token');
    const sessions = await listLearningSessions('reader-token');

    expect(profiles[0]).toMatchObject({
      id: 101,
      sourceType: 'book',
      status: 'ready',
      title: '机器学习从零到一',
    });
    expect(profiles[0]?.curriculum).toHaveLength(4);
    expect(profiles[0]?.latestJob).toMatchObject({
      attemptCount: 1,
      jobType: 'plan_generate',
      status: 'completed',
    });
    expect(profiles[0]?.sources[0]).toMatchObject({
      fileName: 'book-1.md',
      kind: 'book_synthetic',
      originBookSourceDocumentId: 41,
      parseStatus: 'parsed',
      profileId: 101,
    });
    expect(profiles[0]?.persona).toMatchObject({
      greeting: '我们先从你的理解出发。',
      name: '导学老师',
    });
    expect(profiles[1]).toMatchObject({
      id: 102,
      sourceType: 'upload',
      status: 'queued',
      title: 'course-outline.pdf',
    });
    expect(profiles[1]?.latestJob).toMatchObject({
      attemptCount: 0,
      status: 'queued',
    });
    expect(sessions[0]).toMatchObject({
      completedStepsCount: 1,
      currentStepIndex: 1,
      currentStepTitle: '用自己的话解释监督学习',
      id: 301,
      learningProfileId: 101,
    });
    expect(sessions[0]?.progressLabel).toBe('1 / 2 步');
  });

  it('normalizes profile details, turn history, and session bootstrap payloads from v2 learning', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        json: async () => ({
          activePathVersion: {
            id: 41,
            overview: '从整体框架到关键概念逐步推进。',
            profileId: 101,
            status: 'ready',
            stepCount: 2,
            title: '机器学习导学路径',
          },
          assets: [
            {
              assetKind: 'book_synthetic',
              bookId: 1,
              bookSourceDocumentId: 41,
              bundleId: 12,
              contentHash: 'abc',
              fileName: 'book-1.md',
              id: 7,
              metadata: { bookTitle: '机器学习从零到一' },
              mimeType: 'text/markdown',
              parseStatus: 'parsed',
            },
          ],
          jobs: [
            {
              attemptCount: 2,
              createdAt: '2026-04-08T08:12:00Z',
              errorMessage: '上次图谱构建超时',
              id: 9,
              jobType: 'graph_build',
              profileId: 101,
              status: 'failed',
              updatedAt: '2026-04-08T08:16:00Z',
            },
            {
              attemptCount: 3,
              createdAt: '2026-04-08T08:17:00Z',
              id: 10,
              jobType: 'plan_generate',
              profileId: 101,
              status: 'completed',
              updatedAt: '2026-04-08T08:20:00Z',
            },
          ],
          profile: {
            createdAt: '2026-04-08T08:00:00Z',
            difficultyMode: 'guided',
            goalMode: 'preview',
            id: 101,
            status: 'ready',
            title: '机器学习从零到一',
            updatedAt: '2026-04-08T08:20:00Z',
          },
          steps: [
            {
              guidingQuestion: '你觉得机器学习最先该建立什么概念？',
              id: 501,
              keywords: ['模型', '数据', '目标'],
              stepIndex: 0,
              successCriteria: '能说出模型、数据、目标之间的关系',
              title: '建立整体框架',
            },
            {
              guidingQuestion: '如何用自己的话解释监督学习？',
              id: 502,
              keywords: ['监督学习', '标签数据'],
              stepIndex: 1,
              successCriteria: '能解释标签数据与目标函数',
              title: '用自己的话解释监督学习',
            },
          ],
        }),
        ok: true,
      })
      .mockResolvedValueOnce({
        json: async () => ({
          items: [
            {
              assistantContent: '我们先回到模型、数据和目标这三者的关系。',
              citations: [
                {
                  chunkId: 11,
                  excerpt: '围绕模型、数据和目标组织内容。',
                  sourceTitle: '机器学习从零到一',
                },
              ],
              createdAt: '2026-04-08T08:22:00Z',
              id: 801,
              sessionId: 301,
              turnKind: 'guide',
              userContent: '帮我总结这一节的核心线索',
            },
          ],
        }),
        ok: true,
      })
      .mockResolvedValueOnce({
        json: async () => ({
          firstStep: {
            guidingQuestion: '先用一句话概括这本书会教你什么。',
            id: 501,
            stepIndex: 0,
            title: '建立整体框架',
          },
          session: {
            completedStepsCount: 0,
            currentStepIndex: 0,
            currentStepTitle: '建立整体框架',
            id: 301,
            learningMode: 'preview',
            profileId: 101,
            sessionKind: 'guide',
            startedAt: '2026-04-08T08:21:00Z',
            status: 'active',
            updatedAt: '2026-04-08T08:21:00Z',
          },
        }),
        ok: true,
      });

    const profile = await getLearningProfile(101, 'reader-token');
    const messages = await listLearningSessionMessages(301, 'reader-token');
    const session = await startLearningSession(101, 'reader-token');

    expect(profile).toMatchObject({
      id: 101,
      failureMessage: '上次图谱构建超时',
      sourceType: 'book',
      status: 'ready',
      title: '机器学习从零到一',
    });
    expect(profile.persona).toMatchObject({
      greeting: '我们先从你的理解出发。',
      name: '导学老师',
    });
    expect(profile.curriculum[0]).toMatchObject({
      guidingQuestion: '你觉得机器学习最先该建立什么概念？',
      successCriteria: '能说出模型、数据、目标之间的关系',
      title: '建立整体框架',
    });
    expect(profile.sources[0]).toMatchObject({
      fileName: 'book-1.md',
      kind: 'book_synthetic',
      originBookSourceDocumentId: 41,
      parseStatus: 'parsed',
      profileId: 101,
    });
    expect(messages).toHaveLength(2);
    expect(messages[0]).toMatchObject({
      content: '帮我总结这一节的核心线索',
      role: 'user',
      learningSessionId: 301,
    });
    expect(messages[1]).toMatchObject({
      content: '我们先回到模型、数据和目标这三者的关系。',
      role: 'assistant',
      learningSessionId: 301,
    });
    expect(messages[1]?.citations?.[0]).toMatchObject({
      chunkId: 11,
      sourceTitle: '机器学习从零到一',
    });
    expect(session.session).toMatchObject({
      currentStepIndex: 0,
      currentStepTitle: '建立整体框架',
      id: 301,
      learningProfileId: 101,
    });
    expect(session.firstStep).toMatchObject({
      guidingQuestion: '先用一句话概括这本书会教你什么。',
      title: '建立整体框架',
    });
    expect(session.welcomeMessage).toMatchObject({
      role: 'assistant',
      learningSessionId: 301,
    });
    expect(session.welcomeMessage.content).toContain('建立整体框架');
  });

  it('creates a learning profile for a book and immediately triggers generation', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        json: async () => ({
          assets: [
            {
              assetKind: 'book_synthetic',
              bookId: 1,
              bookSourceDocumentId: 41,
              bundleId: 12,
              fileName: 'book-1.md',
              id: 7,
              metadata: { bookTitle: '机器学习从零到一' },
              parseStatus: 'parsed',
            },
          ],
          jobs: [
            {
              attemptCount: 0,
              id: 1,
              jobType: 'parse',
              profileId: 102,
              status: 'queued',
            },
          ],
          profile: {
            createdAt: '2026-04-08T08:00:00Z',
            difficultyMode: 'guided',
            goalMode: 'preview',
            id: 102,
            status: 'queued',
            title: '机器学习从零到一',
            updatedAt: '2026-04-08T08:00:00Z',
          },
        }),
        ok: true,
      })
      .mockResolvedValueOnce({
        json: async () => ({
          jobs: [
            {
              attemptCount: 1,
              id: 1,
              jobType: 'parse',
              profileId: 102,
              status: 'queued',
              updatedAt: '2026-04-08T08:01:00Z',
            },
          ],
          ok: true,
          triggered: true,
        }),
        ok: true,
      });

    const profile = await createLearningProfile(
      {
        bookId: 1,
        bookSourceDocumentId: 41,
        sourceType: 'book',
        teachingGoal: '实验预习',
        title: '机器学习从零到一',
      },
      'reader-token'
    );

    expect(profile).toMatchObject({
      id: 102,
      sourceType: 'book',
      status: 'queued',
      title: '机器学习从零到一',
    });
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect((global.fetch as jest.Mock).mock.calls[0]?.[0]).toBe(
      'https://library.example/api/v2/learning/profiles'
    );
    expect(JSON.parse(String((global.fetch as jest.Mock).mock.calls[0]?.[1]?.body))).toEqual({
      difficultyMode: 'guided',
      goalMode: 'preview',
      sources: [{ bookId: 1, kind: 'book' }],
      title: '机器学习从零到一',
    });
    expect((global.fetch as jest.Mock).mock.calls[1]?.[0]).toBe(
      'https://library.example/api/v2/learning/profiles/102/generate'
    );
  });

  it('uploads a file, creates a learning profile from the upload, and triggers generation', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        json: async () => ({
          ok: true,
          upload: {
            fileName: '操作系统实验讲义.pdf',
            id: 88,
          },
        }),
        ok: true,
      })
      .mockResolvedValueOnce({
        json: async () => ({
          assets: [
            {
              assetKind: 'upload_file',
              bundleId: 12,
              fileName: '操作系统实验讲义.pdf',
              id: 9,
              metadata: {},
              parseStatus: 'uploaded',
            },
          ],
          jobs: [
            {
              attemptCount: 0,
              id: 1,
              jobType: 'parse',
              profileId: 202,
              status: 'queued',
            },
          ],
          profile: {
            createdAt: '2026-04-08T08:00:00Z',
            difficultyMode: 'guided',
            goalMode: 'preview',
            id: 202,
            status: 'queued',
            title: '操作系统实验讲义',
            updatedAt: '2026-04-08T08:00:00Z',
          },
        }),
        ok: true,
      })
      .mockResolvedValueOnce({
        json: async () => ({
          jobs: [
            {
              attemptCount: 1,
              id: 1,
              jobType: 'parse',
              profileId: 202,
              status: 'queued',
            },
          ],
          ok: true,
          triggered: true,
        }),
        ok: true,
      });

    const formData = new FormData();
    formData.append('title', '操作系统实验讲义');
    formData.append('teachingGoal', '帮助我完成实验预习');
    formData.append('file', 'mock-binary');

    const profile = await uploadLearningProfile(formData, 'reader-token');

    expect(profile).toMatchObject({
      id: 202,
      sourceType: 'upload',
      status: 'queued',
      title: '操作系统实验讲义',
    });
    expect(global.fetch).toHaveBeenCalledTimes(3);
    expect((global.fetch as jest.Mock).mock.calls[0]?.[0]).toBe(
      'https://library.example/api/v2/learning/uploads'
    );
    expect((global.fetch as jest.Mock).mock.calls[1]?.[0]).toBe(
      'https://library.example/api/v2/learning/profiles'
    );
    expect(JSON.parse(String((global.fetch as jest.Mock).mock.calls[1]?.[1]?.body))).toEqual({
      difficultyMode: 'guided',
      goalMode: 'preview',
      sources: [{ kind: 'upload', uploadId: 88 }],
      title: '操作系统实验讲义',
    });
    expect((global.fetch as jest.Mock).mock.calls[2]?.[0]).toBe(
      'https://library.example/api/v2/learning/profiles/202/generate'
    );
  });

  it('retries generation for an existing learning profile', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({
        jobs: [
          {
            attemptCount: 1,
            id: 1,
            jobType: 'parse',
            profileId: 202,
            status: 'queued',
          },
        ],
        ok: true,
        triggered: true,
      }),
      ok: true,
    });

    const result = await retryGenerateLearningProfile(202, 'reader-token');

    expect(result).toEqual({
      jobs: [
        expect.objectContaining({
          attemptCount: 1,
          id: 1,
          status: 'queued',
        }),
      ],
      triggered: true,
    });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://library.example/api/v2/learning/profiles/202/generate',
      expect.objectContaining({
        method: 'POST',
      })
    );
  });

  it('parses backend sse events for learning streaming replies', async () => {
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
              'data: {"event":"session.progress","data":{"session":{"id":301,"learningProfileId":101,"status":"active","currentStepIndex":1,"currentStepTitle":"用自己的话解释概念","completedStepsCount":1,"startedAt":"2026-04-08T08:21:00Z","updatedAt":"2026-04-08T08:22:00Z"}}}',
              '',
              'data: {"event":"assistant.final","data":{"turn":{"id":801,"sessionId":301,"assistantContent":"我们先回到模型、数据和目标这三者的关系。","citations":[{"chunkId":11,"sourceTitle":"机器学习从零到一"}],"createdAt":"2026-04-08T08:22:00Z"}}}',
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
    for await (const event of streamLearningSessionReply(
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
      'assistant.final',
    ]);
    expect(events[0]).toMatchObject({
      phase: 'retrieving',
      type: 'status',
    });
    expect(events[4]).toMatchObject({
      message: {
        citations: [{ chunkId: 11, sourceTitle: '机器学习从零到一' }],
        learningSessionId: 301,
      },
      type: 'assistant.final',
    });
  });

  it('ignores remediation plan events that do not include a session snapshot', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            [
              'data: {"event":"status","data":{"phase":"retrieving","sessionId":301}}',
              '',
              'data: {"event":"session.remediation","data":{"plan":{"id":91,"sessionId":301,"status":"active"}}}',
              '',
              'data: {"event":"assistant.final","data":{"turn":{"id":801,"sessionId":301,"assistantContent":"我们先回到模型、数据和目标这三者的关系。","createdAt":"2026-04-08T08:22:00Z"}}}',
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
    for await (const event of streamLearningSessionReply(
      301,
      { content: '帮我总结这一节的核心线索' },
      'reader-token'
    )) {
      events.push(event);
    }

    expect(events.map((event) => event.type)).toEqual(['status', 'assistant.final']);
  });
});
