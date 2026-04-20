import { fetch as expoFetch } from 'expo/fetch';

import type {
  CreateLearningProfileInput,
  LearningBridgeAction,
  LearningCitation,
  LearningCompletedStep,
  LearningConversationPresentation,
  LearningCurriculumStep,
  LearningDashboard,
  LearningDashboardContinueSession,
  LearningGenerationJob,
  LearningGraph,
  LearningGraphEdge,
  LearningGraphNode,
  LearningPersona,
  LearningProfile,
  LearningSession,
  LearningSessionMessage,
  LearningSourceDocument,
  LearningSourceType,
  LearningStepEvaluation,
  LearningStreamEvent,
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

function normalizeLearningBridgeAction(raw: any): LearningBridgeAction {
  return {
    actionType: raw?.actionType ?? raw?.action_type ?? 'expand_step_to_explore',
    description: raw?.description ?? null,
    label: raw?.label ?? null,
    targetGuideSessionId:
      raw?.targetGuideSessionId ?? raw?.target_guide_session_id ?? null,
    targetStepIndex: raw?.targetStepIndex ?? raw?.target_step_index ?? null,
    turnId: raw?.turnId ?? raw?.turn_id ?? null,
  };
}

function normalizeLearningGraphNode(raw: any): LearningGraphNode {
  return {
    ...(raw && typeof raw === 'object' ? raw : {}),
    id: String(raw?.id ?? ''),
    label: String(raw?.label ?? raw?.title ?? raw?.id ?? ''),
    profileId:
      typeof raw?.profileId === 'number'
        ? raw.profileId
        : typeof raw?.profile_id === 'number'
          ? raw.profile_id
          : null,
    type: String(raw?.type ?? 'Node'),
  };
}

function normalizeLearningGraphEdge(raw: any): LearningGraphEdge {
  return {
    ...(raw && typeof raw === 'object' ? raw : {}),
    source: String(raw?.source ?? ''),
    target: String(raw?.target ?? ''),
    type: String(raw?.type ?? 'RELATED_TO'),
  };
}

function normalizeLearningGraph(raw: any): LearningGraph {
  const nodes = Array.isArray(raw?.nodes) ? raw.nodes.map((node: any) => normalizeLearningGraphNode(node)) : [];
  const edges = Array.isArray(raw?.edges) ? raw.edges.map((edge: any) => normalizeLearningGraphEdge(edge)) : [];

  return {
    edges,
    nodes,
    provider: String(raw?.provider ?? 'fallback'),
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
    focusContext: raw?.focusContext ?? raw?.focus_context ?? {},
    focusStepIndex:
      typeof raw?.focusStepIndex === 'number'
        ? raw.focusStepIndex
        : typeof raw?.focus_step_index === 'number'
          ? raw.focus_step_index
          : null,
    id: Number(raw?.id ?? 0),
    lastMessagePreview: raw?.lastMessagePreview ?? raw?.last_message_preview ?? null,
    learningMode: raw?.learningMode ?? raw?.learning_mode ?? null,
    progressLabel:
      raw?.progressLabel ??
      raw?.progress_label ??
      resolveProgressLabel(completedStepsCount, totalSteps),
    sessionKind: raw?.sessionKind ?? raw?.session_kind ?? 'guide',
    status: raw?.status ?? 'active',
    learningProfileId: Number(
      raw?.learningProfileId ?? raw?.learning_profile_id ?? raw?.profileId ?? raw?.profile_id ?? 0
    ),
    sourceSessionId: raw?.sourceSessionId ?? raw?.source_session_id ?? null,
    sourceTurnId: raw?.sourceTurnId ?? raw?.source_turn_id ?? null,
    updatedAt: raw?.updatedAt ?? raw?.updated_at ?? raw?.startedAt ?? raw?.started_at ?? nowIso(),
  };
}

function normalizeLearningSessionMessage(
  raw: any,
  options: { citations?: any[]; presentation?: any } = {}
): LearningSessionMessage {
  const citationsRaw = options.citations ?? raw?.citations ?? raw?.citations_json ?? [];

  return {
    citations: Array.isArray(citationsRaw)
      ? citationsRaw.map((citation: any) => normalizeLearningCitation(citation))
      : [],
    content: raw?.content ?? '',
    createdAt: raw?.createdAt ?? raw?.created_at ?? nowIso(),
    id: Number(raw?.id ?? 0),
    intentKind: raw?.intentKind ?? raw?.intent_kind ?? null,
    role: raw?.role ?? 'assistant',
    learningSessionId: Number(
      raw?.learningSessionId ??
        raw?.learning_session_id ??
        raw?.sessionId ??
        raw?.session_id ??
        0
    ),
    presentation: normalizeLearningPresentation(
      options.presentation ?? raw?.presentation ?? raw?.metadata?.presentation
    ),
    redirectedSessionId:
      raw?.redirectedSessionId ?? raw?.redirected_session_id ?? null,
    responseMode: raw?.responseMode ?? raw?.response_mode ?? null,
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

function normalizeLearningPresentation(raw: any): LearningConversationPresentation | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  if (raw?.kind === 'guide') {
    return {
      bridgeActions: Array.isArray(raw?.bridgeActions)
        ? raw.bridgeActions.map((action: any) => normalizeLearningBridgeAction(action))
        : [],
      evidence: Array.isArray(raw?.evidence)
        ? raw.evidence.map((item: any) => normalizeLearningCitation(item))
        : [],
      examiner: {
        ...normalizeLearningEvaluation(raw?.examiner ?? {}),
        label: raw?.examiner?.label ?? null,
      },
      followups: Array.isArray(raw?.followups)
        ? raw.followups.filter((item: unknown) => typeof item === 'string')
        : [],
      kind: 'guide',
      peer:
        raw?.peer && typeof raw.peer === 'object' && typeof raw.peer.content === 'string'
          ? { content: raw.peer.content }
          : null,
      relatedConcepts: Array.isArray(raw?.relatedConcepts)
        ? raw.relatedConcepts.filter((item: unknown) => typeof item === 'string')
        : [],
      step: raw?.step
        ? {
            guidingQuestion: raw.step.guidingQuestion ?? null,
            index:
              typeof raw.step.index === 'number'
                ? raw.step.index
                : typeof raw.step.stepIndex === 'number'
                  ? raw.step.stepIndex
                  : null,
            objective: raw.step.objective ?? null,
            successCriteria: raw.step.successCriteria ?? null,
            title: raw.step.title ?? null,
          }
        : null,
      teacher: {
        content: raw?.teacher?.content ?? '',
      },
    };
  }

  if (raw?.kind === 'explore') {
    return {
      answer: {
        content: raw?.answer?.content ?? raw?.answer ?? '',
      },
      bridgeActions: Array.isArray(raw?.bridgeActions)
        ? raw.bridgeActions.map((action: any) => normalizeLearningBridgeAction(action))
        : [],
      evidence: Array.isArray(raw?.evidence)
        ? raw.evidence.map((item: any) => normalizeLearningCitation(item))
        : [],
      focus: raw?.focus
        ? {
            guidingQuestion: raw.focus.guidingQuestion ?? null,
            objective: raw.focus.objective ?? null,
            stepIndex:
              typeof raw.focus.stepIndex === 'number' ? raw.focus.stepIndex : null,
            stepTitle: raw.focus.stepTitle ?? null,
          }
        : null,
      followups: Array.isArray(raw?.followups)
        ? raw.followups.filter((item: unknown) => typeof item === 'string')
        : [],
      kind: 'explore',
      reasoningContent: raw?.reasoningContent ?? raw?.reasoning_content ?? null,
      relatedConcepts: Array.isArray(raw?.relatedConcepts)
        ? raw.relatedConcepts.filter((item: unknown) => typeof item === 'string')
        : [],
    };
  }

  return null;
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
  const presentation = normalizeLearningPresentation(
    turn?.presentation ?? turn?.metadata?.presentation
  );
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
        { citations, presentation }
      )
    );
  }

  return messages;
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

function normalizeSseChunk(chunk: string) {
  return chunk.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function decodeSseFrames(chunk: string) {
  const normalized = normalizeSseChunk(chunk);
  const segments = normalized.split('\n\n');
  const remainder = normalized.endsWith('\n\n') ? '' : (segments.pop() ?? '');

  return {
    frames: segments.map((frame) => frame.trim()).filter(Boolean),
    remainder,
  };
}

function parseSsePayload(frame: string) {
  let eventName: string | undefined;
  const payload = normalizeSseChunk(frame)
    .split('\n')
    .reduce<string[]>((lines, line) => {
      if (line.startsWith('event:')) {
        const nextEventName = line.slice(6).trim();
        eventName = nextEventName.length > 0 ? nextEventName : undefined;
        return lines;
      }

      if (line.startsWith('data:')) {
        lines.push(line.slice(5).trimStart());
      }

      return lines;
    }, [])
    .join('\n');

  if (!payload) {
    return null;
  }

  if (payload === '[DONE]') {
    return null;
  }

  const parsed = JSON.parse(payload) as { data?: any; event?: string } | Record<string, unknown>;
  if (parsed && typeof parsed === 'object' && typeof (parsed as { type?: unknown }).type === 'string') {
    return {
      data: parsed,
      event: eventName,
    };
  }
  if (parsed && typeof parsed === 'object' && ('event' in parsed || 'data' in parsed)) {
    return {
      data: 'data' in parsed ? parsed.data : parsed,
      event:
        typeof (parsed as { event?: unknown }).event === 'string'
          ? (parsed as { event: string }).event
          : eventName,
    };
  }

  return {
    data: parsed,
    event: eventName,
  } as { data?: any; event?: string };
}

function normalizeLearningFinalMessage(raw: any): LearningSessionMessage {
  const turn = raw?.turn ?? raw?.message ?? raw ?? {};

  return normalizeLearningSessionMessage(
    {
      content: turn?.assistantContent ?? turn?.content ?? '',
      createdAt:
        turn?.createdAt ?? turn?.created_at ?? raw?.createdAt ?? raw?.created_at ?? nowIso(),
      id: Number(turn?.id ?? 0),
      intentKind: turn?.intentKind ?? turn?.intent_kind ?? null,
      role: 'assistant',
      redirectedSessionId:
        turn?.redirectedSessionId ?? turn?.redirected_session_id ?? null,
      responseMode: turn?.responseMode ?? turn?.response_mode ?? null,
      sessionId:
        turn?.sessionId ?? turn?.session_id ?? raw?.sessionId ?? raw?.session_id ?? 0,
    },
    {
      citations: turn?.citations ?? raw?.citations,
      presentation: turn?.presentation ?? raw?.presentation ?? turn?.metadata?.presentation,
    }
  );
}

function normalizeAiSdkLearningStreamEvents(part: any): LearningStreamEvent[] {
  switch (part?.type) {
    case 'data-user-message': {
      const message = part.data?.message ?? {};
      const parts = Array.isArray(message.parts) ? message.parts : [];
      const text = parts
        .map((item: any) =>
          item && typeof item === 'object' && (item.type === 'text' || item.type === 'input_text')
            ? String(item.text ?? '')
            : ''
        )
        .join('')
        .trim();
      if (!text) {
        return [];
      }
      return [
        {
          messageId: typeof message.id === 'string' ? message.id : null,
          text,
          type: 'resume.user_message',
        },
      ];
    }
    case 'data-status':
      return [
        {
          phase: part.data?.phase ?? null,
          type: 'status',
        },
      ];
    case 'data-evidence':
      return [
        {
          items: Array.isArray(part.data?.items)
            ? part.data.items.map((item: any) => normalizeLearningCitation(item))
            : [],
          type: 'evidence.items',
        },
      ];
    case 'data-followups':
      return [
        {
          items: Array.isArray(part.data?.items)
            ? part.data.items.filter((item: unknown) => typeof item === 'string')
            : [],
          type: 'followups.items',
        },
      ];
    case 'data-bridge-actions':
      return [
        {
          actions: Array.isArray(part.data?.items)
            ? part.data.items.map((item: any) => normalizeLearningBridgeAction(item))
            : [],
          type: 'bridge.actions',
        },
      ];
    case 'data-related-concepts':
      return [
        {
          items: Array.isArray(part.data?.items)
            ? part.data.items.filter((item: unknown) => typeof item === 'string')
            : [],
          type: 'explore.related_concepts',
        },
      ];
    case 'reasoning-delta':
      return [
        {
          delta: String(part.delta ?? part.text ?? ''),
          type: 'explore.reasoning.delta',
        },
      ];
    case 'text-delta':
      return [
        {
          delta: String(part.delta ?? part.text ?? ''),
          type: 'explore.answer.delta',
        },
      ];
    case 'data-learning-final':
      return [
        {
          message: normalizeLearningFinalMessage(part.data),
          type: 'assistant.final',
        },
      ];
    case 'error':
      return [
        {
          code: 'learning_model_request_error',
          message: typeof part.errorText === 'string' ? part.errorText : '模型请求错误',
          type: 'error',
        },
      ];
    default:
      return [];
  }
}

async function* streamLearningEventsFromResponse(
  response: Response
): AsyncGenerator<LearningStreamEvent, void, void> {
  if (!response.ok) {
    throw new LibraryApiError('learning_stream_http_error', {
      code: `http_${response.status}`,
      status: response.status,
    });
  }

  if (response.status === 204) {
    return;
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
    const { frames, remainder } = decodeSseFrames(buffer);
    buffer = remainder;

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

function normalizeLearningStreamEvents(raw: { data?: any; event?: string }): LearningStreamEvent[] {
  if (!raw.event && raw.data && typeof raw.data === 'object' && typeof raw.data.type === 'string') {
    return normalizeAiSdkLearningStreamEvents(raw.data);
  }

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
      return [
        {
          delta: String(raw.data?.delta ?? ''),
          type: 'assistant.delta',
        },
      ];
    case 'teacher.delta':
      return [
        {
          delta: String(raw.data?.delta ?? ''),
          type: 'teacher.delta',
        },
      ];
    case 'peer.delta':
      return [
        {
          delta: String(raw.data?.delta ?? ''),
          type: 'peer.delta',
        },
      ];
    case 'explore.answer.delta':
      return [
        {
          delta: String(raw.data?.delta ?? ''),
          type: 'explore.answer.delta',
        },
      ];
    case 'explore.reasoning.delta':
      return [
        {
          delta: String(raw.data?.delta ?? ''),
          type: 'explore.reasoning.delta',
        },
      ];
    case 'evaluation':
    case 'examiner.result':
      return [
        {
          evaluation: normalizeLearningEvaluation(raw.data),
          type: 'evaluation',
        },
      ];
    case 'evidence.items':
      return [
        {
          items: Array.isArray(raw.data?.items)
            ? raw.data.items.map((item: any) => normalizeLearningCitation(item))
            : [],
          type: 'evidence.items',
        },
      ];
    case 'followups.items':
      return [
        {
          items: Array.isArray(raw.data?.items)
            ? raw.data.items.filter((item: unknown) => typeof item === 'string')
            : [],
          type: 'followups.items',
        },
      ];
    case 'bridge.actions':
      return [
        {
          actions: Array.isArray(raw.data?.items)
            ? raw.data.items.map((item: any) => normalizeLearningBridgeAction(item))
            : [],
          type: 'bridge.actions',
        },
      ];
    case 'guide.intent':
      return [
        {
          kind: String(raw.data?.kind ?? ''),
          source: raw.data?.source ?? null,
          stepIndex:
            typeof raw.data?.stepIndex === 'number'
              ? raw.data.stepIndex
              : typeof raw.data?.step_index === 'number'
                ? raw.data.step_index
                : null,
          type: 'guide.intent',
        },
      ];
    case 'explore.related_concepts':
      return [
        {
          items: Array.isArray(raw.data?.items)
            ? raw.data.items.filter((item: unknown) => typeof item === 'string')
            : [],
          type: 'explore.related_concepts',
        },
      ];
    case 'session.redirect':
      return raw.data?.targetSession
        ? [
            {
              bridgeAction:
                raw.data?.bridgeAction && typeof raw.data.bridgeAction === 'object'
                  ? raw.data.bridgeAction
                  : null,
              recommendedPrompts: Array.isArray(raw.data?.recommendedPrompts)
                ? raw.data.recommendedPrompts.filter((item: unknown) => typeof item === 'string')
                : [],
              session: normalizeLearningSession(raw.data.targetSession),
              targetMode: raw.data?.targetMode === 'explore' ? 'explore' : 'explore',
              type: 'session.redirect',
            },
          ]
        : [];
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
          code: typeof raw.data?.code === 'string' ? raw.data.code : undefined,
          message: raw.data?.message ?? '导学回复失败，请稍后重试。',
          type: 'error',
        },
      ];
    case 'retrieval.evidence':
    case 'agent.examiner.result':
    case 'agent.teacher.delta':
    case 'agent.peer.delta':
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

  const parts = (formData as FormData & { _parts?: [string, unknown][] })._parts;
  if (!Array.isArray(parts)) {
    return null;
  }

  const entry = parts.find(([name]) => name === fieldName)?.[1];
  return typeof entry === 'string' && entry.trim().length > 0 ? entry.trim() : null;
}

async function triggerProfileGeneration(
  profileId: number,
  token?: string | null,
  options?: { background?: boolean }
) {
  const query = options?.background ? '?background=1' : '';
  return strictLibraryRequest<{ jobs?: any[]; ok: boolean; triggered: boolean }>(
    `/api/v2/learning/profiles/${profileId}/generate${query}`,
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
  return triggerProfileGeneration(profileId, token, { background: true }).then((payload: any) => ({
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

  return normalizeLearningProfile((created as any)?.profile ?? {}, {
    assets: Array.isArray((created as any)?.assets) ? (created as any).assets : [],
    jobs: Array.isArray((created as any)?.jobs) ? (created as any).jobs : [],
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

  return normalizeLearningProfile((created as any)?.profile ?? {}, {
    assets: Array.isArray((created as any)?.assets) ? (created as any).assets : [],
    jobs: Array.isArray((created as any)?.jobs) ? (created as any).jobs : [],
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
    response = await expoFetch(`${baseUrl}/api/v2/learning/sessions/${sessionId}/stream`, {
      body: JSON.stringify({
        content: input.content,
        id: `learning-session-${sessionId}`,
        message: {
          id: `user-${Date.now()}`,
          parts: [{ text: input.content, type: 'text' }],
          role: 'user',
        },
      }),
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

  yield* streamLearningEventsFromResponse(response);
}

export async function* resumeLearningSessionReply(
  sessionId: number,
  token?: string | null
): AsyncGenerator<LearningStreamEvent, void, void> {
  const baseUrl = getLibraryServiceBaseUrl();
  if (!baseUrl) {
    learningServiceNotConfigured();
  }

  let response: Response;
  try {
    response = await expoFetch(`${baseUrl}/api/v2/learning/sessions/${sessionId}/stream`, {
      headers: {
        Accept: 'text/event-stream',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      method: 'GET',
    });
  } catch {
    throw new LibraryApiError('library_network_error', {
      code: 'network_error',
    });
  }

  yield* streamLearningEventsFromResponse(response);
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
  }).then((payload: any) => ({
    ...payload,
    session: payload?.session ? normalizeLearningSession(payload.session) : null,
  }));
}

export async function getLearningGraph(
  profileId: number,
  token?: string | null
): Promise<LearningGraph> {
  return strictLibraryRequest(`/api/v2/learning/profiles/${profileId}/graph`, {
    method: 'GET',
    token,
  }).then((payload: any) => normalizeLearningGraph(payload?.graph ?? payload));
}

export async function getLearningReport(sessionId: number, token?: string | null): Promise<any> {
  return strictLibraryRequest(`/api/v2/learning/sessions/${sessionId}/report`, {
    method: 'GET',
    token,
  });
}
