import type {
  CreateLearningProfileInput,
  LearningCitation,
  LearningCompletedStep,
  LearningCurriculumStep,
  LearningDashboard,
  LearningDashboardContinueSession,
  LearningGenerationJob,
  LearningPersona,
  LearningProfile,
  LearningSession,
  LearningSessionMessage,
  LearningSourceDocument,
  LearningSourceType,
  LearningStepEvaluation,
  LearningStreamEvent,
  LearningSuggestion,
  StartLearningSessionResult,
} from '@/lib/api/types';
import {
  LibraryApiError,
  getLibraryServiceBaseUrl,
  libraryRequest,
} from '@/lib/api/client';

function learningServiceNotConfigured(): never {
  throw new LibraryApiError('library_service_not_configured', {
    code: 'service_not_configured',
  });
}

function strictLibraryRequest<T>(
  path: string,
  options: RequestInit & { retryOnAuthError?: boolean; token?: string | null }
): Promise<T> {
  return libraryRequest<T>(path, {
    ...options,
    fallback: learningServiceNotConfigured,
  });
}

function nowIso() {
  return new Date().toISOString();
}

function resolveProgressLabel(completedStepsCount: number, totalSteps: number) {
  return `${completedStepsCount} / ${Math.max(totalSteps, 1)} 步`;
}

export function buildSyntheticCompletedSteps(count: number): LearningCompletedStep[] {
  return Array.from({ length: Math.max(count, 0) }, (_, index) => ({
    completedAt: nowIso(),
    confidence: 1,
    stepIndex: index,
  }));
}

function normalizeLearningCurriculumStep(raw: any, index = 0): LearningCurriculumStep {
  return {
    goal: raw?.goal ?? raw?.objective ?? null,
    guidingQuestion: raw?.guidingQuestion ?? raw?.guiding_question ?? null,
    id: String(raw?.id ?? `step-${index + 1}`),
    index: Number(raw?.index ?? raw?.stepIndex ?? raw?.step_index ?? index),
    keywords: Array.isArray(raw?.keywords)
      ? raw.keywords.filter((value: unknown) => typeof value === 'string')
      : [],
    learningObjective:
      raw?.learningObjective ?? raw?.learning_objective ?? raw?.objective ?? null,
    successCriteria: raw?.successCriteria ?? raw?.success_criteria ?? null,
    title: raw?.title ?? `步骤 ${index + 1}`,
  };
}

function buildPlaceholderCurriculum(stepCount: number) {
  return Array.from({ length: Math.max(stepCount, 0) }, (_, index) =>
    normalizeLearningCurriculumStep(
      {
        id: `step-${index + 1}`,
        stepIndex: index,
        title: `步骤 ${index + 1}`,
      },
      index
    )
  );
}

function normalizeLearningCitation(raw: any): LearningCitation {
  return {
    ...(raw && typeof raw === 'object' ? raw : {}),
    chunkId: raw?.chunkId ?? raw?.chunk_id ?? null,
    excerpt: raw?.excerpt ?? raw?.snippet ?? null,
    sourceTitle: raw?.sourceTitle ?? raw?.source_title ?? null,
  };
}

function normalizeLearningSourceDocument(raw: any, profileId: number): LearningSourceDocument {
  return {
    contentHash: raw?.contentHash ?? raw?.content_hash ?? null,
    fileName: raw?.fileName ?? raw?.file_name ?? 'source.txt',
    id: Number(raw?.id ?? 0),
    kind: raw?.kind ?? raw?.assetKind ?? raw?.asset_kind ?? 'upload_file',
    metadata: raw?.metadata ?? raw?.metadata_json ?? {},
    mimeType: raw?.mimeType ?? raw?.mime_type ?? null,
    originBookSourceDocumentId:
      raw?.originBookSourceDocumentId ??
      raw?.origin_book_source_document_id ??
      raw?.bookSourceDocumentId ??
      raw?.book_source_document_id ??
      null,
    parseStatus: raw?.parseStatus ?? raw?.parse_status ?? null,
    profileId: Number(raw?.profileId ?? raw?.profile_id ?? profileId),
  };
}

function normalizeLearningGenerationJob(raw: any): LearningGenerationJob {
  return {
    attemptCount:
      typeof raw?.attemptCount === 'number'
        ? raw.attemptCount
        : typeof raw?.attempt_count === 'number'
          ? raw.attempt_count
          : undefined,
    createdAt: raw?.createdAt ?? raw?.created_at ?? null,
    errorMessage: raw?.errorMessage ?? raw?.error_message ?? null,
    id: Number(raw?.id ?? 0),
    jobType: raw?.jobType ?? raw?.job_type ?? null,
    profileId: raw?.profileId ?? raw?.profile_id,
    status: raw?.status ?? 'queued',
    updatedAt: raw?.updatedAt ?? raw?.updated_at ?? null,
  };
}

function sortJobsByUpdatedAt(jobs: any[]) {
  return [...jobs].sort((left, right) => {
    const leftTime = new Date(
      left?.updatedAt ?? left?.updated_at ?? left?.createdAt ?? left?.created_at ?? 0
    ).getTime();
    const rightTime = new Date(
      right?.updatedAt ?? right?.updated_at ?? right?.createdAt ?? right?.created_at ?? 0
    ).getTime();
    if (leftTime === rightTime) {
      return Number(right?.id ?? 0) - Number(left?.id ?? 0);
    }

    return rightTime - leftTime;
  });
}

function selectLatestJob(jobs: any[]) {
  return sortJobsByUpdatedAt(jobs)[0] ?? null;
}

function selectFailedJob(jobs: any[]) {
  return (
    sortJobsByUpdatedAt(jobs).find((job) => (job?.status ?? job?.job_status) === 'failed') ??
    null
  );
}

function resolveLearningSourceTypeFromAsset(asset: any): LearningSourceType {
  const assetKind = String(
    asset?.assetKind ?? asset?.asset_kind ?? asset?.kind ?? ''
  ).toLowerCase();
  return assetKind.startsWith('book') ? 'book' : 'upload';
}

function buildDefaultLearningPersona(sourceType: LearningSourceType): LearningPersona {
  if (sourceType === 'book') {
    return {
      coachingFocus: '先搭起阅读框架，再用自己的话解释关键概念。',
      greeting: '我们先从你的理解出发。',
      name: '导学老师',
      style: '先提问，再给脚手架提示',
    };
  }

  return {
    coachingFocus: '先看清这份资料要完成什么，再拆出关键步骤。',
    greeting: '我们先把这份资料真正拆明白。',
    name: '资料陪练助手',
    style: '先定位任务，再聚焦重点概念',
  };
}

function normalizeLearningProfile(
  raw: any,
  options: {
    assets?: any[];
    latestJob?: any;
    stepCount?: number;
    steps?: any[];
    jobs?: any[];
    sourceSummary?: string | null;
  } = {}
): LearningProfile {
  const assets = Array.isArray(options.assets) ? options.assets : [];
  const steps = Array.isArray(options.steps) ? options.steps : [];
  const jobs = Array.isArray(options.jobs) ? options.jobs : [];
  const latestJobRaw = options.latestJob ?? selectLatestJob(jobs);
  const failedJobRaw = selectFailedJob(jobs);
  const primaryAsset = assets[0] ?? null;
  const sourceType =
    primaryAsset != null
      ? resolveLearningSourceTypeFromAsset(primaryAsset)
      : raw?.sourceType === 'book'
        ? 'book'
        : 'upload';
  const persona = buildDefaultLearningPersona(sourceType);
  const curriculum =
    steps.length > 0
      ? steps.map((step: any, index: number) => normalizeLearningCurriculumStep(step, index))
      : buildPlaceholderCurriculum(options.stepCount ?? 0);

  return {
    bookId: primaryAsset?.bookId ?? primaryAsset?.book_id ?? null,
    bookSourceDocumentId:
      primaryAsset?.bookSourceDocumentId ?? primaryAsset?.book_source_document_id ?? null,
    createdAt: raw?.createdAt ?? raw?.created_at ?? nowIso(),
    curriculum,
    failureCode: raw?.failureCode ?? raw?.failure_code ?? null,
    failureMessage:
      raw?.failureMessage ??
      raw?.failure_message ??
      failedJobRaw?.errorMessage ??
      failedJobRaw?.error_message ??
      null,
    id: Number(raw?.id ?? 0),
    latestJob: latestJobRaw ? normalizeLearningGenerationJob(latestJobRaw) : null,
    persona,
    sourceSummary: options.sourceSummary ?? raw?.sourceSummary ?? raw?.source_summary ?? null,
    sourceType,
    sources: assets.map((source) => normalizeLearningSourceDocument(source, Number(raw?.id ?? 0))),
    status: raw?.status ?? 'queued',
    teachingGoal: raw?.teachingGoal ?? raw?.teaching_goal ?? null,
    title: raw?.title ?? '未命名导学',
    updatedAt:
      raw?.updatedAt ?? raw?.updated_at ?? raw?.createdAt ?? raw?.created_at ?? nowIso(),
  };
}

function normalizeLearningCompletedStep(raw: any): LearningCompletedStep {
  return {
    completedAt: raw?.completedAt ?? raw?.completed_at ?? nowIso(),
    confidence: Number(raw?.confidence ?? 1),
    stepIndex: Number(raw?.stepIndex ?? raw?.step_index ?? 0),
  };
}

function normalizeLearningSession(
  raw: any,
  options: {
    profile?: LearningProfile | null;
    totalSteps?: number | null;
  } = {}
): LearningSession {
  const completedStepsRaw =
    raw?.completedSteps ?? raw?.completed_steps ?? raw?.completed_steps_json ?? [];
  const completedStepsCount = Number(
    raw?.completedStepsCount ??
      raw?.completed_steps_count ??
      (Array.isArray(completedStepsRaw) ? completedStepsRaw.length : 0)
  );
  const totalSteps =
    options.profile?.curriculum.length ??
    options.totalSteps ??
    raw?.totalSteps ??
    raw?.total_steps ??
    Math.max(
      completedStepsCount,
      Number(raw?.currentStepIndex ?? raw?.current_step_index ?? 0) + 1,
      1
    );
  const completedSteps =
    Array.isArray(completedStepsRaw) && completedStepsRaw.length > 0
      ? completedStepsRaw.map((item: any) => normalizeLearningCompletedStep(item))
      : buildSyntheticCompletedSteps(completedStepsCount);

  return {
    completedSteps,
    completedStepsCount,
    conversationSessionId: Number(
      raw?.conversationSessionId ?? raw?.conversation_session_id ?? raw?.id ?? 0
    ),
    createdAt: raw?.createdAt ?? raw?.created_at ?? raw?.startedAt ?? raw?.started_at ?? nowIso(),
    currentStepIndex: Number(raw?.currentStepIndex ?? raw?.current_step_index ?? 0),
    currentStepTitle: raw?.currentStepTitle ?? raw?.current_step_title ?? null,
    id: Number(raw?.id ?? 0),
    lastMessagePreview: raw?.lastMessagePreview ?? raw?.last_message_preview ?? null,
    progressLabel:
      raw?.progressLabel ??
      raw?.progress_label ??
      resolveProgressLabel(completedStepsCount, totalSteps),
    status: raw?.status ?? 'active',
    learningProfileId: Number(
      raw?.learningProfileId ?? raw?.learning_profile_id ?? raw?.profileId ?? raw?.profile_id ?? 0
    ),
    updatedAt: raw?.updatedAt ?? raw?.updated_at ?? raw?.startedAt ?? raw?.started_at ?? nowIso(),
  };
}

function normalizeLearningSessionMessage(
  raw: any,
  options: { citations?: any[] } = {}
): LearningSessionMessage {
  const citationsRaw = options.citations ?? raw?.citations ?? raw?.citations_json ?? [];

  return {
    citations: Array.isArray(citationsRaw)
      ? citationsRaw.map((citation: any) => normalizeLearningCitation(citation))
      : [],
    content: raw?.content ?? '',
    createdAt: raw?.createdAt ?? raw?.created_at ?? nowIso(),
    id: Number(raw?.id ?? 0),
    role: raw?.role ?? 'assistant',
    learningSessionId: Number(
      raw?.learningSessionId ??
        raw?.learning_session_id ??
        raw?.sessionId ??
        raw?.session_id ??
        0
    ),
  };
}

function normalizeLearningEvaluation(raw: any): LearningStepEvaluation {
  return {
    confidence: Number(raw?.confidence ?? raw?.masteryScore ?? raw?.mastery_score ?? 0),
    meetsCriteria: Boolean(raw?.meetsCriteria ?? raw?.meets_criteria ?? raw?.passed),
    passed: Boolean(raw?.passed ?? raw?.meetsCriteria ?? raw?.meets_criteria),
    masteryScore: Number(raw?.masteryScore ?? raw?.mastery_score ?? 0),
    missingConcepts: Array.isArray(raw?.missingConcepts) ? raw.missingConcepts : [],
    reasoning: raw?.reasoning ?? raw?.feedback ?? null,
    feedback: raw?.feedback ?? raw?.reasoning ?? null,
    stepIndex: Number(raw?.stepIndex ?? raw?.step_index ?? 0),
  };
}

function buildWelcomeMessage(
  session: LearningSession,
  firstStep: LearningCurriculumStep | null,
  sourceType: LearningSourceType = 'upload'
): LearningSessionMessage {
  const persona = buildDefaultLearningPersona(sourceType);
  const stepTitle = firstStep?.title ?? session.currentStepTitle ?? '第一步';
  const prompt = firstStep?.guidingQuestion
    ? `先从这个问题开始：${firstStep.guidingQuestion}`
    : '先说说你现在理解到哪里了。';

  return {
    content: `${persona.greeting} 我们先从“${stepTitle}”开始。${prompt}`,
    createdAt: session.createdAt,
    id: Number(`9${session.id}`),
    role: 'assistant',
    learningSessionId: session.id,
  };
}

function normalizeStartLearningSessionResult(
  payload: any,
  options: {
    profile?: LearningProfile | null;
    sourceType?: LearningSourceType;
  } = {}
): StartLearningSessionResult {
  const firstStep =
    payload?.firstStep ?? payload?.first_step
      ? normalizeLearningCurriculumStep(payload?.firstStep ?? payload?.first_step)
      : null;
  const session = normalizeLearningSession(payload?.session ?? payload, {
    profile: options.profile,
    totalSteps: options.profile?.curriculum.length ?? (firstStep ? 1 : null),
  });

  return {
    firstStep,
    session,
    welcomeMessage: normalizeLearningSessionMessage(
      payload?.welcomeMessage ??
        payload?.welcome_message ??
        buildWelcomeMessage(session, firstStep, options.sourceType)
    ),
  };
}

function normalizeLearningTurnMessages(turn: any): LearningSessionMessage[] {
  const sessionId = Number(turn?.sessionId ?? turn?.session_id ?? 0);
  const createdAt = turn?.createdAt ?? turn?.created_at ?? nowIso();
  const citations = Array.isArray(turn?.citations) ? turn.citations : [];
  const messages: LearningSessionMessage[] = [];

  if (typeof turn?.userContent === 'string' && turn.userContent.trim()) {
    messages.push(
      normalizeLearningSessionMessage({
        content: turn.userContent,
        createdAt,
        id: Number(`${turn?.id ?? 0}1`),
        role: 'user',
        sessionId,
      })
    );
  }

  if (typeof turn?.assistantContent === 'string' && turn.assistantContent.trim()) {
    messages.push(
      normalizeLearningSessionMessage(
        {
          content: turn.assistantContent,
          createdAt,
          id: Number(`${turn?.id ?? 0}2`),
          role: 'assistant',
          sessionId,
        },
        { citations }
      )
    );
  }

  return messages;
}

function normalizeLearningSuggestion(raw: any): LearningSuggestion {
  return {
    bookId: raw?.bookId ?? raw?.book_id ?? null,
    description: raw?.description ?? '',
    id: String(raw?.id ?? `suggestion-${Math.random().toString(36).slice(2, 8)}`),
    kind: raw?.kind ?? 'next_step',
    profileId: raw?.profileId ?? raw?.profile_id ?? null,
    title: raw?.title ?? '继续学习',
  };
}

function normalizeLearningDashboardContinueSession(
  session: LearningSession,
  profile: LearningProfile | null
): LearningDashboardContinueSession {
  return {
    ...session,
    personaName: profile?.persona.name ?? null,
    profileId: session.learningProfileId,
    title: profile?.title ?? '继续学习',
  };
}

function decodeSseFrames(chunk: string) {
  return chunk
    .split('\n\n')
    .map((frame) => frame.trim())
    .filter(Boolean);
}

function parseSsePayload(frame: string) {
  const payload = frame
    .split('\n')
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trim())
    .join('');

  if (!payload) {
    return null;
  }

  return JSON.parse(payload) as { data?: any; event?: string };
}

function normalizeLearningFinalMessage(raw: any): LearningSessionMessage {
  const turn = raw?.turn ?? raw?.message ?? raw ?? {};

  return normalizeLearningSessionMessage(
    {
      content: turn?.assistantContent ?? turn?.content ?? '',
      createdAt:
        turn?.createdAt ?? turn?.created_at ?? raw?.createdAt ?? raw?.created_at ?? nowIso(),
      id: Number(turn?.id ?? 0),
      role: 'assistant',
      sessionId:
        turn?.sessionId ?? turn?.session_id ?? raw?.sessionId ?? raw?.session_id ?? 0,
    },
    { citations: turn?.citations ?? raw?.citations }
  );
}

function normalizeLearningStreamEvents(raw: { data?: any; event?: string }): LearningStreamEvent[] {
  switch (raw.event) {
    case 'status':
    case 'session.status':
      return [
        {
          phase: raw.data?.phase ?? null,
          type: 'status',
        },
      ];
    case 'assistant.delta':
    case 'agent.teacher.delta':
    case 'agent.peer.delta':
    case 'explore.answer.delta':
      return [
        {
          delta: String(raw.data?.delta ?? ''),
          type: 'assistant.delta',
        },
      ];
    case 'evaluation':
    case 'agent.examiner.result':
      return [
        {
          evaluation: normalizeLearningEvaluation(raw.data),
          type: 'evaluation',
        },
      ];
    case 'session.updated':
      return [
        {
          session: normalizeLearningSession(raw.data),
          type: 'session.updated',
        },
      ];
    case 'session.progress':
      return raw.data?.session
        ? [
            {
              session: normalizeLearningSession(raw.data.session),
              type: 'session.updated',
            },
          ]
        : raw.data
          ? [
              {
                session: normalizeLearningSession(raw.data),
              type: 'session.updated',
            },
          ]
          : [];
    case 'session.remediation':
      return raw.data?.session
        ? [
            {
              session: normalizeLearningSession(raw.data.session),
              type: 'session.updated',
            },
          ]
        : [];
    case 'assistant.final':
    case 'assistant.done':
      return [
        {
          message: normalizeLearningFinalMessage(raw.data),
          type: 'assistant.final',
        },
      ];
    case 'error':
      return [
        {
          message: raw.data?.message ?? '导学回复失败，请稍后重试。',
          type: 'error',
        },
      ];
    case 'retrieval.evidence':
    case 'explore.related_concepts':
      return [];
    default:
      return [];
  }
}

function extractFormDataValue(formData: FormData, fieldName: string) {
  if (typeof formData.get === 'function') {
    const value = formData.get(fieldName);
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
  }

  const parts = (formData as FormData & { _parts?: Array<[string, unknown]> })._parts;
  if (!Array.isArray(parts)) {
    return null;
  }

  const entry = parts.find(([name]) => name === fieldName)?.[1];
  return typeof entry === 'string' && entry.trim().length > 0 ? entry.trim() : null;
}

async function triggerProfileGeneration(profileId: number, token?: string | null) {
  return strictLibraryRequest<{ jobs?: any[]; ok: boolean; triggered: boolean }>(
    `/api/v2/learning/profiles/${profileId}/generate`,
    {
      method: 'POST',
      token,
    }
  );
}

function deriveDashboard(
  profiles: LearningProfile[],
  sessions: LearningSession[]
): LearningDashboard {
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const continueSessionRecord =
    [...sessions]
      .filter((session) => session.status !== 'completed')
      .sort(
        (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
      )[0] ?? null;

  return {
    continueSession: continueSessionRecord
      ? normalizeLearningDashboardContinueSession(
          continueSessionRecord,
          profileById.get(continueSessionRecord.learningProfileId) ?? null
        )
      : null,
    recentProfiles: profiles,
    suggestions: [],
  };
}

export async function getLearningDashboard(token?: string | null): Promise<LearningDashboard> {
  const [profiles, sessions] = await Promise.all([
    listLearningProfiles(token),
    listLearningSessions(token),
  ]);

  return deriveDashboard(profiles, sessions);
}

export async function listLearningProfiles(token?: string | null): Promise<LearningProfile[]> {
  try {
    const payload: any = await strictLibraryRequest('/api/v2/learning/profiles', {
      method: 'GET',
      token,
    });
    const items = Array.isArray(payload?.items) ? payload.items : [];

    return items.map((item: any) =>
      normalizeLearningProfile(item?.profile ?? {}, {
        assets: item?.primaryAsset ? [item.primaryAsset] : [],
        latestJob: item?.latestJob,
        stepCount: Number(item?.stepCount ?? 0),
      })
    );
  } catch (error: any) {
    if (error?.status === 404 || error?.status === 405) {
      return [];
    }

    throw error;
  }
}

export async function getLearningProfile(
  profileId: number,
  token?: string | null
): Promise<LearningProfile> {
  return strictLibraryRequest(`/api/v2/learning/profiles/${profileId}`, {
    method: 'GET',
    token,
  }).then((payload: any) =>
    normalizeLearningProfile(payload?.profile ?? {}, {
      assets: Array.isArray(payload?.assets) ? payload.assets : [],
      jobs: Array.isArray(payload?.jobs) ? payload.jobs : [],
      sourceSummary: payload?.activePathVersion?.overview ?? null,
      steps: Array.isArray(payload?.steps) ? payload.steps : [],
    })
  );
}

export async function retryGenerateLearningProfile(
  profileId: number,
  token?: string | null
): Promise<{ jobs: LearningGenerationJob[]; triggered: boolean }> {
  return triggerProfileGeneration(profileId, token).then((payload: any) => ({
    jobs: Array.isArray(payload?.jobs)
      ? payload.jobs.map((job: any) => normalizeLearningGenerationJob(job))
      : [],
    triggered: Boolean(payload?.triggered),
  }));
}

export async function createLearningProfile(
  input: CreateLearningProfileInput,
  token?: string | null
): Promise<LearningProfile> {
  const created = await strictLibraryRequest('/api/v2/learning/profiles', {
    body: JSON.stringify({
      difficultyMode: 'guided',
      goalMode: 'preview',
      sources: [{ kind: 'book', bookId: input.bookId }],
      title: input.title?.trim() || `馆藏导学 ${input.bookId}`,
    }),
    method: 'POST',
    token,
  });
  const profileId = Number((created as any)?.profile?.id ?? 0);
  const generation = await triggerProfileGeneration(profileId, token);

  return normalizeLearningProfile((created as any)?.profile ?? {}, {
    assets: Array.isArray((created as any)?.assets) ? (created as any).assets : [],
    jobs: [
      ...(Array.isArray((created as any)?.jobs) ? (created as any).jobs : []),
      ...(Array.isArray((generation as any)?.jobs) ? (generation as any).jobs : []),
    ],
  });
}

export async function uploadLearningProfile(
  formData: FormData,
  token?: string | null,
  options?: { title?: string }
): Promise<LearningProfile> {
  const uploadResult = await strictLibraryRequest('/api/v2/learning/uploads', {
    body: formData,
    method: 'POST',
    token,
  });
  const upload = (uploadResult as any)?.upload ?? {};
  const title =
    options?.title ??
    extractFormDataValue(formData, 'title') ??
    upload?.fileName ??
    '未命名资料';
  const created = await strictLibraryRequest('/api/v2/learning/profiles', {
    body: JSON.stringify({
      difficultyMode: 'guided',
      goalMode: 'preview',
      sources: [{ kind: 'upload', uploadId: upload?.id }],
      title,
    }),
    method: 'POST',
    token,
  });
  const profileId = Number((created as any)?.profile?.id ?? 0);
  const generation = await triggerProfileGeneration(profileId, token);

  return normalizeLearningProfile((created as any)?.profile ?? {}, {
    assets: Array.isArray((created as any)?.assets) ? (created as any).assets : [],
    jobs: [
      ...(Array.isArray((created as any)?.jobs) ? (created as any).jobs : []),
      ...(Array.isArray((generation as any)?.jobs) ? (generation as any).jobs : []),
    ],
  });
}

export async function listLearningSessions(token?: string | null): Promise<LearningSession[]> {
  try {
    const payload: any = await strictLibraryRequest('/api/v2/learning/sessions', {
      method: 'GET',
      token,
    });
    const items = Array.isArray(payload?.items) ? payload.items : [];
    return items.map((session: any) => normalizeLearningSession(session));
  } catch (error: any) {
    if (error?.status === 404 || error?.status === 405) {
      return [];
    }

    throw error;
  }
}

export async function getLearningSession(
  sessionId: number,
  token?: string | null
): Promise<LearningSession> {
  return strictLibraryRequest(`/api/v2/learning/sessions/${sessionId}`, {
    method: 'GET',
    token,
  }).then((payload: any) => normalizeLearningSession(payload?.session ?? payload));
}

export async function listLearningSessionMessages(
  sessionId: number,
  token?: string | null
): Promise<LearningSessionMessage[]> {
  return strictLibraryRequest(`/api/v2/learning/sessions/${sessionId}/turns`, {
    method: 'GET',
    token,
  }).then((payload: any) => {
    const items = Array.isArray(payload?.items) ? payload.items : [];
    return items.flatMap((turn: any) => normalizeLearningTurnMessages(turn));
  });
}

export async function startLearningSession(
  profileId: number,
  token?: string | null,
  options: { learningMode?: string; sessionKind?: 'guide' | 'explore' } = {}
): Promise<StartLearningSessionResult> {
  return strictLibraryRequest('/api/v2/learning/sessions', {
    body: JSON.stringify({
      learningMode: options.learningMode ?? 'preview',
      profileId,
      sessionKind: options.sessionKind ?? 'guide',
    }),
    method: 'POST',
    token,
  }).then((payload: any) => normalizeStartLearningSessionResult(payload));
}

export async function* streamLearningSessionReply(
  sessionId: number,
  input: { content: string },
  token?: string | null
): AsyncGenerator<LearningStreamEvent, void, void> {
  const baseUrl = getLibraryServiceBaseUrl();
  if (!baseUrl) {
    learningServiceNotConfigured();
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/v2/learning/sessions/${sessionId}/stream`, {
      body: JSON.stringify({ content: input.content }),
      headers: {
        Accept: 'text/event-stream',
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      method: 'POST',
    });
  } catch {
    throw new LibraryApiError('library_network_error', {
      code: 'network_error',
    });
  }

  if (!response.ok) {
    throw new LibraryApiError('learning_stream_http_error', {
      code: `http_${response.status}`,
      status: response.status,
    });
  }

  if (!response.body) {
    throw new LibraryApiError('learning_stream_missing_body', {
      code: 'stream_missing_body',
      status: response.status,
    });
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });
    const frames = decodeSseFrames(buffer);
    buffer = buffer.endsWith('\n\n') ? '' : frames.pop() ?? '';

    for (const frame of frames) {
      const parsed = parseSsePayload(frame);
      if (!parsed) {
        continue;
      }

      for (const event of normalizeLearningStreamEvents(parsed)) {
        yield event;
      }
    }

    if (done) {
      break;
    }
  }

  if (buffer.trim()) {
    const parsed = parseSsePayload(buffer.trim());
    if (parsed) {
      for (const event of normalizeLearningStreamEvents(parsed)) {
        yield event;
      }
    }
  }
}

export async function submitLearningBridgeAction(
  sessionId: number,
  actionType: 'expand_step_to_explore' | 'attach_explore_turn_to_guide_step',
  options?: {
    turnId?: number;
    targetGuideSessionId?: number;
    targetStepIndex?: number;
  },
  token?: string | null
): Promise<any> {
  return strictLibraryRequest(`/api/v2/learning/sessions/${sessionId}/bridge-actions`, {
    body: JSON.stringify({
      actionType,
      ...(options?.turnId != null ? { turnId: options.turnId } : {}),
      ...(options?.targetGuideSessionId != null
        ? { targetGuideSessionId: options.targetGuideSessionId }
        : {}),
      ...(options?.targetStepIndex != null ? { targetStepIndex: options.targetStepIndex } : {}),
    }),
    method: 'POST',
    token,
  });
}

export async function getLearningGraph(profileId: number, token?: string | null): Promise<any> {
  return strictLibraryRequest(`/api/v2/learning/profiles/${profileId}/graph`, {
    method: 'GET',
    token,
  });
}

export async function getLearningReport(sessionId: number, token?: string | null): Promise<any> {
  return strictLibraryRequest(`/api/v2/learning/sessions/${sessionId}/report`, {
    method: 'GET',
    token,
  });
}
