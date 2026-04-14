import type {
  CreateTutorProfileInput,
  StartTutorSessionResult,
  TutorCitation,
  TutorCompletedStep,
  TutorCurriculumStep,
  TutorDashboard,
  TutorDashboardContinueSession,
  TutorGenerationJob,
  TutorPersona,
  TutorProfile,
  TutorSession,
  TutorSessionMessage,
  TutorSourceDocument,
  TutorStepEvaluation,
  TutorStreamEvent,
  TutorSuggestion,
} from '@/lib/api/types';
import {
  LibraryApiError,
  getLibraryServiceBaseUrl,
  libraryRequest,
} from '@/lib/api/client';

function tutorServiceNotConfigured(): never {
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
    fallback: tutorServiceNotConfigured,
  });
}

function nowIso() {
  return new Date().toISOString();
}

function resolveProgressLabel(completedStepsCount: number, totalSteps: number) {
  return `${completedStepsCount} / ${Math.max(totalSteps, 1)} 步`;
}

function buildSyntheticCompletedSteps(count: number): TutorCompletedStep[] {
  return Array.from({ length: Math.max(count, 0) }, (_, index) => ({
    completedAt: nowIso(),
    confidence: 1,
    stepIndex: index,
  }));
}

function normalizeTutorPersona(raw: any): TutorPersona {
  return {
    coachingFocus: raw?.coachingFocus ?? raw?.coaching_focus ?? null,
    greeting: raw?.greeting ?? '我们先从你的理解出发。',
    name: raw?.name ?? '学习导师',
    style: raw?.style ?? null,
  };
}

function normalizeTutorCurriculumStep(raw: any, index = 0): TutorCurriculumStep {
  return {
    goal: raw?.goal ?? null,
    guidingQuestion: raw?.guidingQuestion ?? raw?.guiding_question ?? null,
    id: String(raw?.id ?? `step-${index + 1}`),
    index: Number(raw?.index ?? index),
    keywords: Array.isArray(raw?.keywords) ? raw.keywords.filter((value: unknown) => typeof value === 'string') : [],
    learningObjective: raw?.learningObjective ?? raw?.learning_objective ?? null,
    successCriteria: raw?.successCriteria ?? raw?.success_criteria ?? null,
    title: raw?.title ?? `步骤 ${index + 1}`,
  };
}

function normalizeTutorCitation(raw: any): TutorCitation {
  return {
    ...(raw && typeof raw === 'object' ? raw : {}),
    chunkId: raw?.chunkId ?? raw?.chunk_id ?? null,
    excerpt: raw?.excerpt ?? null,
    sourceTitle: raw?.sourceTitle ?? raw?.source_title ?? null,
  };
}

function normalizeTutorSourceDocument(raw: any): TutorSourceDocument {
  return {
    contentHash: raw?.contentHash ?? raw?.content_hash ?? null,
    fileName: raw?.fileName ?? raw?.file_name ?? 'source.txt',
    id: Number(raw?.id ?? 0),
    kind: raw?.kind ?? 'upload_file',
    metadata: raw?.metadata ?? raw?.metadata_json ?? {},
    mimeType: raw?.mimeType ?? raw?.mime_type ?? null,
    originBookSourceDocumentId:
      raw?.originBookSourceDocumentId ?? raw?.origin_book_source_document_id ?? null,
    parseStatus: raw?.parseStatus ?? raw?.parse_status ?? null,
    profileId: Number(raw?.profileId ?? raw?.profile_id ?? 0),
  };
}

function normalizeTutorGenerationJob(raw: any): TutorGenerationJob {
  return {
    attemptCount: typeof raw?.attemptCount === 'number' ? raw.attemptCount : raw?.attempt_count,
    createdAt: raw?.createdAt ?? raw?.created_at ?? null,
    errorMessage: raw?.errorMessage ?? raw?.error_message ?? null,
    id: Number(raw?.id ?? 0),
    jobType: raw?.jobType ?? raw?.job_type ?? null,
    profileId: raw?.profileId ?? raw?.profile_id,
    status: raw?.status ?? 'queued',
    updatedAt: raw?.updatedAt ?? raw?.updated_at ?? null,
  };
}

function normalizeTutorProfile(raw: any, options: { latestJob?: any; sources?: any[] } = {}): TutorProfile {
  const curriculumRaw = raw?.curriculum?.steps ?? raw?.curriculum ?? raw?.curriculum_json?.steps ?? raw?.curriculum_json ?? [];
  const sourcesRaw = options.sources ?? raw?.sources ?? [];
  const latestJobRaw = options.latestJob ?? raw?.latestJob ?? null;

  return {
    bookId: raw?.bookId ?? raw?.book_id ?? null,
    bookSourceDocumentId:
      raw?.bookSourceDocumentId ?? raw?.book_source_document_id ?? null,
    createdAt: raw?.createdAt ?? raw?.created_at ?? nowIso(),
    curriculum: Array.isArray(curriculumRaw)
      ? curriculumRaw.map((step: any, index: number) => normalizeTutorCurriculumStep(step, index))
      : [],
    failureCode: raw?.failureCode ?? raw?.failure_code ?? null,
    failureMessage: raw?.failureMessage ?? raw?.failure_message ?? null,
    id: Number(raw?.id ?? 0),
    latestJob: latestJobRaw ? normalizeTutorGenerationJob(latestJobRaw) : null,
    persona: normalizeTutorPersona(raw?.persona ?? raw?.persona_json ?? {}),
    sourceSummary: raw?.sourceSummary ?? raw?.source_summary ?? null,
    sourceType: raw?.sourceType ?? raw?.source_type ?? 'upload',
    sources: Array.isArray(sourcesRaw)
      ? sourcesRaw.map((source: any) => normalizeTutorSourceDocument(source))
      : [],
    status: raw?.status ?? 'queued',
    teachingGoal: raw?.teachingGoal ?? raw?.teaching_goal ?? null,
    title: raw?.title ?? '未命名导师',
    updatedAt: raw?.updatedAt ?? raw?.updated_at ?? raw?.createdAt ?? raw?.created_at ?? nowIso(),
  };
}

function normalizeTutorCompletedStep(raw: any): TutorCompletedStep {
  return {
    completedAt: raw?.completedAt ?? raw?.completed_at ?? nowIso(),
    confidence: Number(raw?.confidence ?? 1),
    stepIndex: Number(raw?.stepIndex ?? raw?.step_index ?? 0),
  };
}

function normalizeTutorSession(
  raw: any,
  options: {
    profile?: TutorProfile | null;
    totalSteps?: number | null;
  } = {}
): TutorSession {
  const completedStepsRaw = raw?.completedSteps ?? raw?.completed_steps ?? raw?.completed_steps_json ?? [];
  const completedStepsCount = Number(
    raw?.completedStepsCount ?? raw?.completed_steps_count ?? (Array.isArray(completedStepsRaw) ? completedStepsRaw.length : 0)
  );
  const totalSteps =
    options.profile?.curriculum.length ??
    options.totalSteps ??
    raw?.totalSteps ??
    raw?.total_steps ??
    Math.max(completedStepsCount, Number(raw?.currentStepIndex ?? raw?.current_step_index ?? 0) + 1, 1);
  const completedSteps = Array.isArray(completedStepsRaw) && completedStepsRaw.length > 0
    ? completedStepsRaw.map((item: any) => normalizeTutorCompletedStep(item))
    : buildSyntheticCompletedSteps(completedStepsCount);

  return {
    completedSteps,
    completedStepsCount,
    conversationSessionId: Number(raw?.conversationSessionId ?? raw?.conversation_session_id ?? raw?.id ?? 0),
    createdAt: raw?.createdAt ?? raw?.created_at ?? raw?.startedAt ?? raw?.started_at ?? nowIso(),
    currentStepIndex: Number(raw?.currentStepIndex ?? raw?.current_step_index ?? 0),
    currentStepTitle: raw?.currentStepTitle ?? raw?.current_step_title ?? null,
    id: Number(raw?.id ?? 0),
    lastMessagePreview: raw?.lastMessagePreview ?? raw?.last_message_preview ?? null,
    progressLabel: raw?.progressLabel ?? raw?.progress_label ?? resolveProgressLabel(completedStepsCount, totalSteps),
    status: raw?.status ?? 'active',
    tutorProfileId: Number(raw?.tutorProfileId ?? raw?.tutor_profile_id ?? raw?.profileId ?? raw?.profile_id ?? 0),
    updatedAt: raw?.updatedAt ?? raw?.updated_at ?? raw?.startedAt ?? raw?.started_at ?? nowIso(),
  };
}

function normalizeTutorSessionMessage(raw: any, options: { citations?: any[] } = {}): TutorSessionMessage {
  const citationsRaw = options.citations ?? raw?.citations ?? raw?.citations_json ?? [];

  return {
    citations: Array.isArray(citationsRaw)
      ? citationsRaw.map((citation: any) => normalizeTutorCitation(citation))
      : [],
    content: raw?.content ?? '',
    createdAt: raw?.createdAt ?? raw?.created_at ?? nowIso(),
    id: Number(raw?.id ?? 0),
    role: raw?.role ?? 'assistant',
    tutorSessionId: Number(raw?.tutorSessionId ?? raw?.tutor_session_id ?? raw?.sessionId ?? raw?.session_id ?? 0),
  };
}

function normalizeTutorSuggestion(raw: any): TutorSuggestion {
  return {
    bookId: raw?.bookId ?? raw?.book_id ?? null,
    description: raw?.description ?? '',
    id: String(raw?.id ?? `suggestion-${Math.random().toString(36).slice(2, 8)}`),
    kind: raw?.kind ?? 'next_step',
    profileId: raw?.profileId ?? raw?.profile_id ?? null,
    title: raw?.title ?? '继续学习',
  };
}

function normalizeTutorDashboardContinueSession(
  raw: any,
  profileById: Map<number, TutorProfile>
): TutorDashboardContinueSession | null {
  if (!raw) {
    return null;
  }

  const tutorProfileId = Number(raw?.tutorProfileId ?? raw?.tutor_profile_id ?? raw?.profileId ?? raw?.profile_id ?? 0);
  const profile = profileById.get(tutorProfileId) ?? null;
  const session = normalizeTutorSession(raw, { profile });

  return {
    ...session,
    personaName: profile?.persona.name ?? null,
    profileId: tutorProfileId,
    title: profile?.title ?? raw?.title ?? '继续学习',
  };
}

function normalizeTutorDashboard(payload: any): TutorDashboard {
  const recentProfiles: TutorProfile[] = Array.isArray(payload?.recentProfiles ?? payload?.recent_profiles)
    ? (payload?.recentProfiles ?? payload?.recent_profiles).map((profile: any) => normalizeTutorProfile(profile))
    : [];
  const profileById = new Map(recentProfiles.map((profile) => [profile.id, profile]));
  const resumableSessions = Array.isArray(payload?.resumableSessions ?? payload?.resumable_sessions)
    ? (payload?.resumableSessions ?? payload?.resumable_sessions)
    : [];

  return {
    continueSession: normalizeTutorDashboardContinueSession(resumableSessions[0] ?? null, profileById),
    recentProfiles,
    suggestions: Array.isArray(payload?.suggestions)
      ? payload.suggestions.map((item: any) => normalizeTutorSuggestion(item))
      : [],
  };
}

function normalizeStartTutorSessionResult(payload: any, profile?: TutorProfile | null): StartTutorSessionResult {
  const session = normalizeTutorSession(payload?.session ?? payload, {
    profile,
    totalSteps: profile?.curriculum.length ?? 1,
  });
  return {
    firstStep: payload?.firstStep ?? payload?.first_step
      ? normalizeTutorCurriculumStep(payload?.firstStep ?? payload?.first_step)
      : null,
    session,
    welcomeMessage: normalizeTutorSessionMessage(payload?.welcomeMessage ?? payload?.welcome_message ?? {}),
  };
}

function normalizeTutorEvaluation(raw: any): TutorStepEvaluation {
  return {
    confidence: Number(raw?.confidence ?? 0),
    meetsCriteria: Boolean(raw?.meetsCriteria ?? raw?.meets_criteria),
    reasoning: raw?.reasoning ?? null,
    stepIndex: Number(raw?.stepIndex ?? raw?.step_index ?? 0),
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

function normalizeTutorStreamEvent(raw: { data?: any; event?: string }): TutorStreamEvent | null {
  switch (raw.event) {
    case 'status':
      return {
        phase: raw.data?.phase ?? null,
        type: 'status',
      };
    case 'assistant.delta':
      return {
        delta: String(raw.data?.delta ?? ''),
        type: 'assistant.delta',
      };
    case 'evaluation':
      return {
        evaluation: normalizeTutorEvaluation(raw.data),
        type: 'evaluation',
      };
    case 'session.updated':
      return {
        session: normalizeTutorSession(raw.data),
        type: 'session.updated',
      };
    case 'assistant.done':
      return {
        message: normalizeTutorSessionMessage(raw.data?.message ?? raw.data ?? {}, {
          citations: raw.data?.citations,
        }),
        type: 'assistant.done',
      };
    case 'error':
      return {
        message: raw.data?.message ?? '导学回复失败，请稍后重试。',
        type: 'error',
      };
    default:
      return null;
  }
}

export async function getTutorDashboard(token?: string | null): Promise<TutorDashboard> {
  return strictLibraryRequest('/api/v1/tutor/dashboard', {
    method: 'GET',
    token,
  }).then((payload: any) => normalizeTutorDashboard(payload));
}

export async function listTutorProfiles(token?: string | null): Promise<TutorProfile[]> {
  return strictLibraryRequest('/api/v1/tutor/profiles', {
    method: 'GET',
    token,
  }).then((payload: any) => {
    const items = Array.isArray(payload?.items) ? payload.items : [];
    return items.map((profile: any) => normalizeTutorProfile(profile));
  });
}

export async function getTutorProfile(profileId: number, token?: string | null): Promise<TutorProfile> {
  return strictLibraryRequest(`/api/v1/tutor/profiles/${profileId}`, {
    method: 'GET',
    token,
  }).then((payload: any) =>
    normalizeTutorProfile(payload?.profile ?? {}, {
      latestJob: payload?.latestJob,
      sources: payload?.sources,
    })
  );
}

export async function createTutorProfile(
  input: CreateTutorProfileInput,
  token?: string | null
): Promise<TutorProfile> {
  return strictLibraryRequest('/api/v1/tutor/profiles', {
    body: JSON.stringify({
      bookId: input.bookId,
      ...(input.bookSourceDocumentId ? { bookSourceDocumentId: input.bookSourceDocumentId } : null),
      sourceType: input.sourceType,
      ...(input.teachingGoal ? { teachingGoal: input.teachingGoal } : null),
      ...(input.title ? { title: input.title } : null),
    }),
    method: 'POST',
    token,
  }).then((payload: any) => normalizeTutorProfile(payload?.profile ?? payload));
}

export async function uploadTutorProfile(formData: FormData, token?: string | null): Promise<TutorProfile> {
  return strictLibraryRequest('/api/v1/tutor/profiles/upload', {
    body: formData,
    method: 'POST',
    token,
  }).then((payload: any) => normalizeTutorProfile(payload?.profile ?? payload));
}

export async function listTutorSessions(token?: string | null): Promise<TutorSession[]> {
  return strictLibraryRequest('/api/v1/tutor/sessions', {
    method: 'GET',
    token,
  }).then((payload: any) => {
    const items = Array.isArray(payload?.items) ? payload.items : [];
    return items.map((session: any) => normalizeTutorSession(session));
  });
}

export async function getTutorSession(sessionId: number, token?: string | null): Promise<TutorSession> {
  return strictLibraryRequest(`/api/v1/tutor/sessions/${sessionId}`, {
    method: 'GET',
    token,
  }).then((payload: any) => normalizeTutorSession(payload?.session ?? payload));
}

export async function listTutorSessionMessages(
  sessionId: number,
  token?: string | null
): Promise<TutorSessionMessage[]> {
  return strictLibraryRequest(`/api/v1/tutor/sessions/${sessionId}/messages`, {
    method: 'GET',
    token,
  }).then((payload: any) => {
    const items = Array.isArray(payload?.items) ? payload.items : [];
    return items.map((message: any) => normalizeTutorSessionMessage(message));
  });
}

export async function startTutorSession(
  profileId: number,
  token?: string | null
): Promise<StartTutorSessionResult> {
  return strictLibraryRequest(`/api/v1/tutor/profiles/${profileId}/sessions`, {
    method: 'POST',
    token,
  }).then((payload: any) => normalizeStartTutorSessionResult(payload));
}

export async function* streamTutorSessionReply(
  sessionId: number,
  input: { content: string },
  token?: string | null
): AsyncGenerator<TutorStreamEvent, void, void> {
  const baseUrl = getLibraryServiceBaseUrl();
  if (!baseUrl) {
    tutorServiceNotConfigured();
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/v1/tutor/sessions/${sessionId}/messages/stream`, {
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
    throw new LibraryApiError('tutor_stream_http_error', {
      code: `http_${response.status}`,
      status: response.status,
    });
  }

  if (!response.body) {
    throw new LibraryApiError('tutor_stream_missing_body', {
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
      const event = normalizeTutorStreamEvent(parsed);
      if (event) {
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
      const event = normalizeTutorStreamEvent(parsed);
      if (event) {
        yield event;
      }
    }
  }
}
