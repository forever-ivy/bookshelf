import {
  createLearningPdfAnnotation,
  createLearningProfile,
  deleteLearningPdfAnnotation,
  getLearningGraph,
  getLearningProfile,
  getLearningReaderState,
  listLearningProfiles,
  listLearningSessionMessages,
  listLearningSessions,
  quickExplainLearningPdfSelection,
  retryGenerateLearningProfile,
  resumeLearningSessionReply,
  startLearningSession,
  streamLearningSessionReply,
  updateLearningPdfAnnotation,
  updateLearningReaderProgress,
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

  it('parses resumed ai sdk stream events from the explore resume endpoint', async () => {
    const encoder = new TextEncoder();
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode(
              'data: {"type":"data-user-message","data":{"message":{"id":"user-message-1","parts":[{"type":"text","text":"详细讲解一个文档中的例题"}]}}}\n\n'
            )
          );
          controller.enqueue(
            encoder.encode(
              'data: {"type":"text-delta","id":"answer-1","delta":"线程是调度执行单位。"}\n\n'
            )
          );
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        },
      }),
      ok: true,
      status: 200,
    });

    const events = [];
    for await (const event of resumeLearningSessionReply(301, 'reader-token')) {
      events.push(event);
    }

    expect(global.fetch).toHaveBeenCalledWith(
      'https://library.example/api/v2/learning/sessions/301/stream',
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: 'text/event-stream',
          Authorization: 'Bearer reader-token',
        }),
        method: 'GET',
      })
    );
    expect(events).toEqual([
      {
        messageId: 'user-message-1',
        text: '详细讲解一个文档中的例题',
        type: 'resume.user_message',
      },
      {
        delta: '线程是调度执行单位。',
        type: 'explore.answer.delta',
      },
    ]);
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
              storagePath: '/srv/learning-storage/book-1.md',
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
              presentation: {
                bridgeActions: [
                  {
                    actionType: 'expand_step_to_explore',
                    label: '展开自由探索',
                  },
                ],
                evidence: [
                  {
                    excerpt: '围绕模型、数据和目标组织内容。',
                    sourceTitle: '机器学习从零到一',
                  },
                ],
                examiner: {
                  passed: true,
                  reasoning: '回答已经覆盖当前步骤的关键线索。',
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
      storagePath: '/srv/learning-storage/book-1.md',
    });
    expect(messages).toHaveLength(2);
    expect(messages[0]).toMatchObject({
      content: '帮我总结这一节的核心线索',
      role: 'user',
      learningSessionId: 301,
    });
    expect(messages[1]).toMatchObject({
      content: '我们先回到模型、数据和目标这三者的关系。',
      presentation: expect.objectContaining({
        examiner: expect.objectContaining({
          passed: true,
        }),
        kind: 'guide',
        teacher: expect.objectContaining({
          content: '先把模型、数据和目标三者的关系说清楚，再进入监督学习。',
        }),
      }),
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

  it('creates a learning profile for a book without waiting for generation', async () => {
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
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect((global.fetch as jest.Mock).mock.calls[0]?.[0]).toBe(
      'https://library.example/api/v2/learning/profiles'
    );
    expect(JSON.parse(String((global.fetch as jest.Mock).mock.calls[0]?.[1]?.body))).toEqual({
      difficultyMode: 'guided',
      goalMode: 'preview',
      sources: [{ bookId: 1, kind: 'book' }],
      title: '机器学习从零到一',
    });
  });

  it('uploads a file and creates a learning profile from the upload without waiting for generation', async () => {
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
    expect(global.fetch).toHaveBeenCalledTimes(2);
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
      'https://library.example/api/v2/learning/profiles/202/generate?background=1',
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
              'data: {"event":"guide.intent","data":{"kind":"offtrack_explore","source":"heuristic","stepIndex":0}}',
              '',
              'data: {"event":"teacher.delta","data":{"delta":"我们先回到模型、数据和目标这三者的关系。"}}',
              '',
              'data: {"event":"peer.delta","data":{"delta":"如果继续往下学，你觉得下一步最该澄清哪个概念？"}}',
              '',
              'data: {"event":"examiner.result","data":{"confidence":0.82,"meetsCriteria":true,"reasoning":"回答已经覆盖当前步骤的关键线索。","stepIndex":0}}',
              '',
              'data: {"event":"evidence.items","data":{"items":[{"chunkId":11,"sourceTitle":"机器学习从零到一","excerpt":"围绕模型、数据和目标组织内容。"}]}}',
              '',
              'data: {"event":"followups.items","data":{"items":["继续说明数据和模型之间的关系"]}}',
              '',
              'data: {"event":"bridge.actions","data":{"items":[{"actionType":"expand_step_to_explore","label":"展开自由探索"}]}}',
              '',
              'data: {"event":"session.redirect","data":{"targetMode":"explore","targetSession":{"id":901,"learningProfileId":101,"sessionKind":"explore","sourceSessionId":301,"focusStepIndex":0,"focusContext":{"stepTitle":"建立整体认知"},"status":"active","currentStepIndex":0,"currentStepTitle":"建立整体认知","completedStepsCount":0,"startedAt":"2026-04-08T08:21:30Z","updatedAt":"2026-04-08T08:21:30Z"},"bridgeAction":{"id":88,"actionType":"expand_step_to_explore","fromSessionId":301,"toSessionId":901,"status":"completed","payload":{"stepIndex":0,"trigger":"auto","reason":"offtrack_explore"},"result":{"recommendedPrompts":["先比较一下模型和数据"]},"createdAt":"2026-04-08T08:21:30Z"},"recommendedPrompts":["先比较一下模型和数据"]}}',
              '',
              'data: {"event":"session.progress","data":{"session":{"id":301,"learningProfileId":101,"status":"active","currentStepIndex":1,"currentStepTitle":"用自己的话解释概念","completedStepsCount":1,"startedAt":"2026-04-08T08:21:00Z","updatedAt":"2026-04-08T08:22:00Z"}}}',
              '',
              'data: {"event":"assistant.final","data":{"turn":{"id":801,"sessionId":301,"assistantContent":"我们先回到模型、数据和目标这三者的关系。","intentKind":"offtrack_explore","responseMode":"redirected","redirectedSessionId":901,"citations":[{"chunkId":11,"sourceTitle":"机器学习从零到一"}],"presentation":{"kind":"guide","teacher":{"content":"我们先回到模型、数据和目标这三者的关系。"},"peer":{"content":"如果继续往下学，你觉得下一步最该澄清哪个概念？"},"examiner":{"passed":true,"reasoning":"回答已经覆盖当前步骤的关键线索。"},"evidence":[{"chunkId":11,"sourceTitle":"机器学习从零到一","excerpt":"围绕模型、数据和目标组织内容。"}],"followups":["继续说明数据和模型之间的关系"],"bridgeActions":[{"actionType":"expand_step_to_explore","label":"展开自由探索"}]},"createdAt":"2026-04-08T08:22:00Z"}}}',
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
      'guide.intent',
      'teacher.delta',
      'peer.delta',
      'evaluation',
      'evidence.items',
      'followups.items',
      'bridge.actions',
      'session.redirect',
      'session.updated',
      'assistant.final',
    ]);
    expect(events[0]).toMatchObject({
      phase: 'retrieving',
      type: 'status',
    });
    expect(events[1]).toMatchObject({
      kind: 'offtrack_explore',
      type: 'guide.intent',
    });
    expect(events[8]).toMatchObject({
      session: expect.objectContaining({
        id: 901,
        sessionKind: 'explore',
        sourceSessionId: 301,
      }),
      type: 'session.redirect',
    });
    expect(events[10]).toMatchObject({
      message: {
        citations: [{ chunkId: 11, sourceTitle: '机器学习从零到一' }],
        learningSessionId: 301,
        intentKind: 'offtrack_explore',
        redirectedSessionId: 901,
        responseMode: 'redirected',
        presentation: expect.objectContaining({
          kind: 'guide',
          teacher: expect.objectContaining({
            content: '我们先回到模型、数据和目标这三者的关系。',
          }),
        }),
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

  it('parses explore reasoning stream events and keeps reasoning content on the final presentation', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            [
              'data: {"event":"status","data":{"phase":"retrieving","sessionId":901}}',
              '',
              'data: {"event":"explore.answer.delta","data":{"delta":"进程是资源分配单位，线程是调度执行单位。"}}',
              '',
              'data: {"event":"explore.reasoning.delta","data":{"delta":"先识别问题在比较两个概念，再抓定义维度和调度维度。"}}',
              '',
              'data: {"event":"assistant.final","data":{"turn":{"id":990,"sessionId":901,"assistantContent":"进程是资源分配单位，线程是调度执行单位。","presentation":{"kind":"explore","answer":{"content":"进程是资源分配单位，线程是调度执行单位。"},"reasoningContent":"先识别问题在比较两个概念，再抓定义维度和调度维度。","evidence":[],"relatedConcepts":["并发模型"],"followups":["继续追问调度差异"],"bridgeActions":[]},"createdAt":"2026-04-08T09:02:00Z"}}}',
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
      901,
      { content: '进程和线程有什么区别？' },
      'reader-token'
    )) {
      events.push(event);
    }

    expect(events.map((event) => event.type)).toEqual([
      'status',
      'explore.answer.delta',
      'explore.reasoning.delta',
      'assistant.final',
    ]);
    expect(events[2]).toMatchObject({
      delta: '先识别问题在比较两个概念，再抓定义维度和调度维度。',
      type: 'explore.reasoning.delta',
    });
    expect(events[3]).toMatchObject({
      message: {
        learningSessionId: 901,
        presentation: expect.objectContaining({
          kind: 'explore',
          reasoningContent: '先识别问题在比较两个概念，再抓定义维度和调度维度。',
        }),
      },
      type: 'assistant.final',
    });
  });

  it('parses AI SDK UI message stream parts for explore sessions', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            [
              'data: {"type":"data-status","data":{"phase":"retrieving"}}',
              '',
              'data: {"type":"data-evidence","data":{"items":[{"chunkId":11,"sourceTitle":"微积分A(1)","excerpt":"Leibniz公式。"}]}}',
              '',
              'data: {"type":"data-related-concepts","data":{"items":["莱布尼茨公式"]}}',
              '',
              'data: {"type":"data-followups","data":{"items":["继续讲第二题"]}}',
              '',
              'data: {"type":"data-bridge-actions","data":{"items":[{"actionType":"attach_explore_turn_to_guide_step","label":"收编回导学"}]}}',
              '',
              'data: {"type":"reasoning-start","id":"reasoning-1"}',
              '',
              'data: {"type":"reasoning-delta","id":"reasoning-1","delta":"先定位题目引用。"}',
              '',
              'data: {"type":"reasoning-end","id":"reasoning-1"}',
              '',
              'data: {"type":"text-start","id":"answer-1"}',
              '',
              'data: {"type":"text-delta","id":"answer-1","delta":"这道题先拆乘积，"}',
              '',
              'data: {"type":"text-delta","id":"answer-1","delta":"再套用 Leibniz 公式。"}',
              '',
              'data: {"type":"text-end","id":"answer-1"}',
              '',
              'data: {"type":"data-learning-final","data":{"turn":{"id":990,"sessionId":901,"assistantContent":"这道题先拆乘积，再套用 Leibniz 公式。","presentation":{"kind":"explore","answer":{"content":"这道题先拆乘积，再套用 Leibniz 公式。"},"reasoningContent":"先定位题目引用。","evidence":[{"chunkId":11,"sourceTitle":"微积分A(1)","excerpt":"Leibniz公式。"}],"relatedConcepts":["莱布尼茨公式"],"followups":["继续讲第二题"],"bridgeActions":[{"actionType":"attach_explore_turn_to_guide_step","label":"收编回导学"}]},"createdAt":"2026-04-08T09:02:00Z"}}}',
              '',
              'data: {"type":"finish"}',
              '',
              'data: [DONE]',
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
      901,
      { content: '详细讲解文档里的第二题' },
      'reader-token'
    )) {
      events.push(event);
    }

    expect(JSON.parse(String((global.fetch as jest.Mock).mock.calls[0]?.[1]?.body))).toMatchObject({
      message: {
        role: 'user',
        parts: [{ type: 'text', text: '详细讲解文档里的第二题' }],
      },
    });
    expect(events.map((event) => event.type)).toEqual([
      'status',
      'evidence.items',
      'explore.related_concepts',
      'followups.items',
      'bridge.actions',
      'explore.reasoning.delta',
      'explore.answer.delta',
      'explore.answer.delta',
      'assistant.final',
    ]);
    expect(events[5]).toMatchObject({
      delta: '先定位题目引用。',
      type: 'explore.reasoning.delta',
    });
    expect(events[8]).toMatchObject({
      message: {
        learningSessionId: 901,
        presentation: expect.objectContaining({
          kind: 'explore',
          reasoningContent: '先定位题目引用。',
        }),
      },
      type: 'assistant.final',
    });
  });

  it('parses standard sse event headers and crlf-delimited learning streams', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            [
              'event: status',
              'data: {"phase":"retrieving","sessionId":901}',
              '',
              'event: explore.answer.delta',
              'data: {"delta":"先抓住资源分配和调度执行这两个维度。"}',
              '',
              'event: assistant.final',
              'data: {"turn":{"id":990,"sessionId":901,"assistantContent":"先抓住资源分配和调度执行这两个维度。","presentation":{"kind":"explore","answer":{"content":"先抓住资源分配和调度执行这两个维度。"},"evidence":[],"relatedConcepts":["并发模型"],"followups":[],"bridgeActions":[]},"createdAt":"2026-04-08T09:02:00Z"}}',
              '',
            ].join('\r\n')
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
      901,
      { content: '进程和线程有什么区别？' },
      'reader-token'
    )) {
      events.push(event);
    }

    expect(events.map((event) => event.type)).toEqual([
      'status',
      'explore.answer.delta',
      'assistant.final',
    ]);
    expect(events[0]).toMatchObject({
      phase: 'retrieving',
      type: 'status',
    });
    expect(events[1]).toMatchObject({
      delta: '先抓住资源分配和调度执行这两个维度。',
      type: 'explore.answer.delta',
    });
    expect(events[2]).toMatchObject({
      message: {
        learningSessionId: 901,
        presentation: expect.objectContaining({
          kind: 'explore',
        }),
      },
      type: 'assistant.final',
    });
  });

  it('normalizes graph payloads from the v2 learning endpoint', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({
        graph: {
          edges: [
            {
              source: 'step:0',
              target: 'concept:limits',
              type: 'TESTS',
            },
          ],
          nodes: [
            {
              id: 'step:0',
              keywords: ['limits'],
              label: '建立整体认知',
              type: 'LessonStep',
            },
            {
              id: 'concept:limits',
              label: '极限',
              type: 'Concept',
            },
          ],
          provider: 'fallback',
        },
        ok: true,
      }),
      ok: true,
    });

    const graph = await getLearningGraph(101, 'reader-token');

    expect(graph).toMatchObject({
      edges: [
        {
          source: 'step:0',
          target: 'concept:limits',
          type: 'TESTS',
        },
      ],
      nodes: [
        {
          id: 'step:0',
          keywords: ['limits'],
          label: '建立整体认知',
          type: 'LessonStep',
        },
        {
          id: 'concept:limits',
          label: '极限',
          type: 'Concept',
        },
      ],
      provider: 'fallback',
    });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://library.example/api/v2/learning/profiles/101/graph',
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: 'application/json',
          Authorization: 'Bearer reader-token',
        }),
        method: 'GET',
      })
    );
  });

  it('normalizes reader state and synced pdf annotations from v2 learning endpoints', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({
        annotations: [
          {
            anchor: {
              pageNumber: 4,
              rects: [{ height: 0.04, width: 0.32, x: 0.18, y: 0.42 }],
              textBefore: '前文',
              textQuote: '梯度下降',
            },
            annotationType: 'highlight',
            color: '#f2c94c',
            createdAt: '2026-04-21T09:00:00Z',
            id: 55,
            noteText: null,
            pageNumber: 4,
            profileId: 101,
            readerId: 'profile:101:document',
            selectedText: '梯度下降',
            updatedAt: '2026-04-21T09:00:00Z',
          },
        ],
        ok: true,
        progress: {
          layoutMode: 'horizontal',
          metadata: { viewportWidth: 390 },
          pageNumber: 4,
          profileId: 101,
          readerId: 'profile:101:document',
          scale: 1.25,
          updatedAt: '2026-04-21T09:01:00Z',
        },
        readerId: 'profile:101:document',
      }),
      ok: true,
    });

    const state = await getLearningReaderState(101, 'reader-token');

    expect(state).toEqual({
      annotations: [
        expect.objectContaining({
          anchor: expect.objectContaining({
            pageNumber: 4,
            rects: [{ height: 0.04, width: 0.32, x: 0.18, y: 0.42 }],
            textQuote: '梯度下降',
          }),
          annotationType: 'highlight',
          color: '#f2c94c',
          id: 55,
          pageNumber: 4,
          profileId: 101,
          readerId: 'profile:101:document',
          selectedText: '梯度下降',
        }),
      ],
      progress: expect.objectContaining({
        layoutMode: 'horizontal',
        pageNumber: 4,
        profileId: 101,
        readerId: 'profile:101:document',
        scale: 1.25,
      }),
      readerId: 'profile:101:document',
    });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://library.example/api/v2/learning/profiles/101/reader-state',
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: 'application/json',
          Authorization: 'Bearer reader-token',
        }),
        method: 'GET',
      })
    );
  });

  it('writes reader progress and annotation mutations through the v2 learning sync endpoints', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        json: async () => ({
          ok: true,
          progress: {
            layoutMode: 'horizontal',
            metadata: {},
            pageNumber: 8,
            profileId: 101,
            readerId: 'profile:101:document',
            scale: 1.4,
            updatedAt: '2026-04-21T09:02:00Z',
          },
        }),
        ok: true,
      })
      .mockResolvedValueOnce({
        json: async () => ({
          annotation: {
            anchor: {
              pageNumber: 8,
              rects: [{ height: 0.05, width: 0.4, x: 0.1, y: 0.2 }],
              textQuote: '反向传播',
            },
            annotationType: 'note',
            color: '#76a9fa',
            createdAt: '2026-04-21T09:02:00Z',
            id: 77,
            noteText: '这段要复习',
            pageNumber: 8,
            profileId: 101,
            readerId: 'profile:101:document',
            selectedText: '反向传播',
            updatedAt: '2026-04-21T09:02:00Z',
          },
          ok: true,
        }),
        ok: true,
      })
      .mockResolvedValueOnce({
        json: async () => ({
          annotation: {
            annotationType: 'note',
            color: '#f2994a',
            id: 77,
            noteText: '改成考试重点',
            pageNumber: 8,
            profileId: 101,
            readerId: 'profile:101:document',
            selectedText: '反向传播',
          },
          ok: true,
        }),
        ok: true,
      })
      .mockResolvedValueOnce({
        json: async () => ({ ok: true }),
        ok: true,
      });

    const progress = await updateLearningReaderProgress(
      101,
      {
        layoutMode: 'horizontal',
        pageNumber: 8,
        scale: 1.4,
      },
      'reader-token'
    );
    const annotation = await createLearningPdfAnnotation(
      101,
      {
        anchor: {
          pageNumber: 8,
          rects: [{ height: 0.05, width: 0.4, x: 0.1, y: 0.2 }],
          textQuote: '反向传播',
        },
        annotationType: 'note',
        color: '#76a9fa',
        noteText: '这段要复习',
        pageNumber: 8,
        selectedText: '反向传播',
      },
      'reader-token'
    );
    const updated = await updateLearningPdfAnnotation(
      101,
      77,
      {
        color: '#f2994a',
        noteText: '改成考试重点',
      },
      'reader-token'
    );
    await deleteLearningPdfAnnotation(101, 77, 'reader-token');

    expect(progress).toMatchObject({
      layoutMode: 'horizontal',
      pageNumber: 8,
      scale: 1.4,
    });
    expect(annotation).toMatchObject({
      annotationType: 'note',
      id: 77,
      noteText: '这段要复习',
    });
    expect(updated).toMatchObject({
      color: '#f2994a',
      id: 77,
      noteText: '改成考试重点',
    });
    expect((global.fetch as jest.Mock).mock.calls.map((call) => [call[0], call[1]?.method])).toEqual([
      ['https://library.example/api/v2/learning/profiles/101/reader-progress', 'PATCH'],
      ['https://library.example/api/v2/learning/profiles/101/annotations', 'POST'],
      ['https://library.example/api/v2/learning/profiles/101/annotations/77', 'PATCH'],
      ['https://library.example/api/v2/learning/profiles/101/annotations/77', 'DELETE'],
    ]);
  });

  it('runs quick explain without creating an explore session from the app contract', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({
        answer: '梯度下降可以理解为沿着损失函数下降最快的方向逐步更新参数。',
        modelName: 'deepseek-chat',
        ok: true,
      }),
      ok: true,
    });

    const result = await quickExplainLearningPdfSelection(
      101,
      {
        anchor: {
          pageNumber: 4,
          rects: [{ height: 0.04, width: 0.32, x: 0.18, y: 0.42 }],
          textQuote: '梯度下降',
        },
        pageNumber: 4,
        selectedText: '梯度下降',
        surroundingText: '梯度下降是训练模型时常用的优化方法。',
      },
      'reader-token'
    );

    expect(result).toEqual({
      answer: '梯度下降可以理解为沿着损失函数下降最快的方向逐步更新参数。',
      modelName: 'deepseek-chat',
    });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://library.example/api/v2/learning/profiles/101/quick-explain',
      expect.objectContaining({
        body: expect.stringContaining('"selectedText":"梯度下降"'),
        method: 'POST',
      })
    );
  });
});
