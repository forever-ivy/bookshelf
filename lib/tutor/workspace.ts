import type {
  TutorCompletedStep,
  TutorProfile,
  TutorSession,
  TutorSessionMessage,
} from '@/lib/api/types';

export type TutorWorkspaceSourceCard = {
  excerpt: string;
  id: string;
  meta: string;
  title: string;
};

export type TutorWorkspaceInsightCard = {
  body: string;
  id: string;
  title: string;
  tone: 'info' | 'success' | 'warning';
};

export type TutorWorkspaceRenderedMessage = {
  id: string;
  role: 'assistant' | 'user';
  streaming: boolean;
  text: string;
};

export type TutorWorkspaceStatusSignal = {
  label: string;
  tone: 'info' | 'success' | 'warning';
};

export type TutorWorkspaceSessionSignal = {
  completedStepsCount: number;
  currentStepIndex: number;
  currentStepTitle: string | null;
  progressLabel: string;
  status: TutorSession['status'];
  transitionLabel?: string | null;
};

export function resolveTutorWorkspaceSourceSummary(profile: TutorProfile) {
  if (profile.sourceSummary?.trim()) {
    return profile.sourceSummary;
  }

  return profile.sourceType === 'book'
    ? '来源于当前馆藏书。后续会逐步补充更细的章节级上下文。'
    : '来源于你上传的学习资料。解析完成后会围绕这份资料建立导学路径。';
}

export function createTutorRenderedMessages(
  historyMessages: TutorSessionMessage[] = []
): TutorWorkspaceRenderedMessage[] {
  return [...historyMessages]
    .sort((left, right) => {
      const timeDelta = new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
      return timeDelta === 0 ? left.id - right.id : timeDelta;
    })
    .map((message) => ({
      id: `message-${message.id}`,
      role: message.role,
      streaming: false,
      text: message.content,
    }));
}

export function buildTutorWorkspaceSources(profile: TutorProfile): TutorWorkspaceSourceCard[] {
  const sources = profile.sources ?? [];
  if (sources.length === 0) {
    return [
      {
        excerpt: resolveTutorWorkspaceSourceSummary(profile),
        id: `source-summary-${profile.id}`,
        meta: profile.sourceType === 'book' ? 'BOOK' : 'UPLOAD',
        title: profile.title,
      },
    ];
  }

  return sources.map((source, index) => {
    const parseStatus = source.parseStatus === 'parsed' ? '已解析' : source.parseStatus ?? '处理中';
    const metaParts = [source.kind === 'book_synthetic' ? 'BOOK' : 'FILE', parseStatus];
    const metadataTitle =
      typeof source.metadata?.bookTitle === 'string' && source.metadata.bookTitle.trim().length > 0
        ? source.metadata.bookTitle.trim()
        : null;

    return {
      excerpt: index === 0 ? resolveTutorWorkspaceSourceSummary(profile) : metadataTitle ?? profile.title,
      id: `source-${source.id}`,
      meta: metaParts.join(' · '),
      title: source.fileName || metadataTitle || profile.title,
    };
  });
}

export function buildTutorWorkspaceHighlights(
  profile: TutorProfile,
  session: TutorSession
): TutorWorkspaceInsightCard[] {
  const currentStep = profile.curriculum[session.currentStepIndex] ?? null;
  const nextStep = profile.curriculum[session.currentStepIndex + 1] ?? null;

  return [
    {
      body:
        profile.persona.coachingFocus ?? '先把当前步骤讲清楚，再继续推进下一步。',
      id: `highlight-focus-${profile.id}`,
      title: '这位导师正在盯什么',
      tone: 'info',
    },
    {
      body:
        currentStep?.successCriteria ??
        currentStep?.goal ??
        '先用自己的话说明关键概念、判断依据或下一步打算。',
      id: `highlight-criteria-${profile.id}`,
      title: '本步通过标准',
      tone: 'success',
    },
    {
      body: nextStep
        ? `如果这一轮通过，下一步会进入“${nextStep.title}”，重点是：${nextStep.guidingQuestion ?? nextStep.goal ?? '继续往下拆。'}`
        : '这是当前导学本的最后一步，通过后就会进入整体复盘。',
      id: `highlight-next-${profile.id}`,
      title: '接下来会推进到哪里',
      tone: nextStep ? 'info' : 'warning',
    },
  ];
}

export function resolveTutorStreamStatusSignal(phase?: string | null): TutorWorkspaceStatusSignal {
  if (phase === 'retrieving') {
    return {
      label: '正在检索当前步骤相关资料…',
      tone: 'info',
    };
  }

  return {
    label: '导师正在组织这一轮回应…',
    tone: 'info',
  };
}

export function buildTutorSessionTransitionLabel(
  previousSession: TutorSession | null,
  nextSession: TutorSession
) {
  if (!previousSession) {
    return null;
  }

  if (nextSession.status === 'completed' && previousSession.status !== 'completed') {
    return '当前导学本的所有步骤都已完成。';
  }

  if (nextSession.currentStepIndex > previousSession.currentStepIndex) {
    return `已推进到“${nextSession.currentStepTitle ?? '下一步'}”。`;
  }

  return `这一轮仍停留在“${nextSession.currentStepTitle ?? '当前步骤'}”。`;
}

export function buildSyntheticCompletedSteps(count: number): TutorCompletedStep[] {
  return Array.from({ length: Math.max(count, 0) }, (_, index) => ({
    completedAt: new Date().toISOString(),
    confidence: 1,
    stepIndex: index,
  }));
}
