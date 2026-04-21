import type {
  LearningCompletedStep,
  LearningBridgeAction,
  LearningCitation,
  LearningConversationPresentation,
  LearningGuidePresentation,
  LearningProfile,
  LearningSession,
  LearningSessionMessage,
} from '@/lib/api/types';

export type LearningWorkspaceSourceCard = {
  excerpt: string;
  id: string;
  meta: string;
  title: string;
};

export type LearningWorkspaceInsightCard = {
  body: string;
  id: string;
  title: string;
  tone: 'info' | 'success' | 'warning';
};

export type LearningWorkspaceMessageCard =
  | {
      content: string;
      kind: 'answer' | 'coach' | 'peer' | 'teacher';
      title: string;
    }
  | {
      actions: LearningBridgeAction[];
      kind: 'bridge_actions' | 'redirect';
      title: string;
    }
  | {
      evaluation: LearningGuidePresentation['examiner'];
      kind: 'examiner';
      title: string;
    }
  | {
      items: LearningCitation[];
      kind: 'evidence';
      title: string;
    }
  | {
      items: string[];
      kind: 'followups' | 'related_concepts' | 'remediation';
      title: string;
    };

export type LearningWorkspaceRenderedMessage = {
  cards: LearningWorkspaceMessageCard[];
  id: string;
  presentation?: LearningConversationPresentation | null;
  role: 'assistant' | 'user';
  streaming: boolean;
  text: string;
};

export type LearningWorkspaceStatusSignal = {
  label: string;
  tone: 'info' | 'success' | 'warning';
};

export type LearningWorkspaceSessionSignal = {
  completedStepsCount: number;
  currentStepIndex: number;
  currentStepTitle: string | null;
  progressLabel: string;
  status: LearningSession['status'];
  transitionLabel?: string | null;
};

const GUIDE_QUESTION_PREFIXES = [
  '帮我',
  '请',
  '给我',
  '告诉我',
  '总结',
  '概括',
  '解释',
  '说明',
  '分析',
  '对比',
  '举例',
  '梳理',
  '聊聊',
  '为什么',
  '怎么',
  '如何',
  '什么',
  '哪些',
  '哪一步',
  '能不能',
  '是否',
  '有没有',
];

const GUIDE_QUESTION_CONTAINS = ['是什么意思', '为什么', '怎么', '如何', '哪些', '能不能', '是否', '有没有'];

const GUIDE_ANSWER_PREFIXES = ['我觉得', '我理解', '我认为', '我会', '我先', '因为', '它', '这本书', '这份资料'];

const DOCUMENT_CLASSIFICATION_KEYWORDS = [
  '简历',
  'cv',
  'resume',
  '合同',
  '发票',
  '论文',
  '报告',
  '病历',
  '手册',
  '说明书',
  '课件',
  '试卷',
  '表格',
  '邮件',
  'pdf',
  'word',
  'doc',
  'docx',
];

const PDF_MIME_TYPES = new Set(['application/pdf', 'application/x-pdf']);

export function shouldAutoRouteGuideDraftToExplore(draft: string) {
  const normalized = draft.trim();
  if (!normalized) {
    return false;
  }

  if (/[?？]/.test(normalized)) {
    return true;
  }

  if (GUIDE_QUESTION_PREFIXES.some((prefix) => normalized.startsWith(prefix))) {
    return true;
  }

  if (GUIDE_ANSWER_PREFIXES.some((prefix) => normalized.startsWith(prefix))) {
    return false;
  }

  const lowered = normalized.toLowerCase();
  if (
    normalized.length <= 18 &&
    DOCUMENT_CLASSIFICATION_KEYWORDS.some((keyword) => lowered.includes(keyword))
  ) {
    return true;
  }

  return GUIDE_QUESTION_CONTAINS.some((keyword) => normalized.includes(keyword));
}

export function resolveLearningWorkspaceSourceSummary(profile: LearningProfile) {
  if (profile.sourceSummary?.trim()) {
    return profile.sourceSummary;
  }

  return profile.sourceType === 'book'
    ? '来源于当前馆藏书。后续会逐步补充更细的章节级上下文。'
    : '来源于你上传的学习资料。解析完成后会围绕这份资料建立导学路径。';
}

function isPdfDocumentCandidate(mimeType?: string | null, fileName?: string | null) {
  const normalizedMimeType = (mimeType ?? '').trim().toLowerCase();
  const normalizedFileName = (fileName ?? '').trim().toLowerCase();

  return PDF_MIME_TYPES.has(normalizedMimeType) || normalizedFileName.endsWith('.pdf');
}

export function resolveLearningWorkspaceHasViewableDocument(profile: LearningProfile) {
  if (profile.bookSourceDocumentId != null) {
    return true;
  }

  if (profile.sourceType === 'book' && profile.bookId != null) {
    return true;
  }

  return (profile.sources ?? []).some((source) => {
    if (source.originBookSourceDocumentId != null) {
      return true;
    }

    return Boolean(source.storagePath) && isPdfDocumentCandidate(source.mimeType, source.fileName);
  });
}

export function createLearningRenderedMessages(
  historyMessages: LearningSessionMessage[] = []
): LearningWorkspaceRenderedMessage[] {
  return [...historyMessages]
    .sort((left, right) => {
      const timeDelta = new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
      return timeDelta === 0 ? left.id - right.id : timeDelta;
    })
    .map((message) => ({
      cards: buildLearningWorkspaceMessageCards(message.presentation),
      id: `message-${message.id}`,
      presentation: message.presentation ?? null,
      role: message.role,
      streaming: false,
      text: message.content,
    }));
}

export function buildLearningWorkspaceMessageCards(
  presentation?: LearningConversationPresentation | null
): LearningWorkspaceMessageCard[] {
  if (!presentation) {
    return [];
  }

  if (presentation.kind === 'guide') {
    const cards: LearningWorkspaceMessageCard[] = [];
    const coachContent =
      presentation.teacher.content.trim() ||
      presentation.peer?.content?.trim() ||
      presentation.examiner.reasoning?.trim() ||
      '';
    const hasEvaluation =
      Boolean(presentation.examiner.reasoning?.trim()) ||
      Boolean(presentation.examiner.feedback?.trim()) ||
      Number(presentation.examiner.masteryScore ?? 0) > 0 ||
      Number(presentation.examiner.confidence ?? 0) > 0 ||
      presentation.examiner.passed ||
      presentation.examiner.missingConcepts.length > 0;
    const shouldShowTeacherCard =
      Boolean(presentation.peer?.content?.trim()) || hasEvaluation;

    if (coachContent) {
      cards.push({
        content: coachContent,
        kind: 'coach',
        title: '教练反馈',
      });
    }

    if (shouldShowTeacherCard && presentation.teacher.content.trim()) {
      cards.push({
        content: presentation.teacher.content,
        kind: 'teacher',
        title: '导师主讲',
      });
    }

    if (presentation.peer?.content) {
      cards.push({
        content: presentation.peer.content,
        kind: 'peer',
        title: '学伴追问',
      });
    }

    if (hasEvaluation) {
      cards.push({
        evaluation: presentation.examiner,
        kind: 'examiner',
        title: '考官判断',
      });
    }

    if (presentation.evidence.length > 0) {
      cards.push({
        items: presentation.evidence,
        kind: 'evidence',
        title: '资料依据',
      });
    }

    if (presentation.followups.length > 0) {
      cards.push({
        items: presentation.followups,
        kind: hasEvaluation && !presentation.examiner.passed ? 'remediation' : 'followups',
        title: hasEvaluation && !presentation.examiner.passed ? '补强建议' : '继续推进',
      });
    }

    if ((presentation.relatedConcepts ?? []).length > 0) {
      cards.push({
        items: presentation.relatedConcepts ?? [],
        kind: 'related_concepts',
        title: '相关概念',
      });
    }

    if (presentation.bridgeActions.length > 0) {
      cards.push({
        actions: presentation.bridgeActions,
        kind: 'redirect',
        title: '转向 Explore',
      });
    }

    return cards;
  }

  const cards: LearningWorkspaceMessageCard[] = [
    {
      content: presentation.answer.content,
      kind: 'answer',
      title: '答案',
    },
  ];

  if (presentation.evidence.length > 0) {
    cards.push({
      items: presentation.evidence,
      kind: 'evidence',
      title: '资料依据',
    });
  }

  if (presentation.relatedConcepts.length > 0) {
    cards.push({
      items: presentation.relatedConcepts,
      kind: 'related_concepts',
      title: '相关概念',
    });
  }

  if (presentation.followups.length > 0) {
    cards.push({
      items: presentation.followups,
      kind: 'followups',
      title: '继续追问',
    });
  }

  return cards;
}

export function buildLearningWorkspaceSources(profile: LearningProfile): LearningWorkspaceSourceCard[] {
  const sources = profile.sources ?? [];
  if (sources.length === 0) {
    return [
      {
        excerpt: resolveLearningWorkspaceSourceSummary(profile),
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
      excerpt: index === 0 ? resolveLearningWorkspaceSourceSummary(profile) : metadataTitle ?? profile.title,
      id: `source-${source.id}`,
      meta: metaParts.join(' · '),
      title: source.fileName || metadataTitle || profile.title,
    };
  });
}

export function buildLearningWorkspaceHighlights(
  profile: LearningProfile,
  session: LearningSession
): LearningWorkspaceInsightCard[] {
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

export function resolveLearningStreamStatusSignal(phase?: string | null): LearningWorkspaceStatusSignal {
  if (phase === 'retrieving') {
    return {
      label: '正在检索当前步骤相关资料…',
      tone: 'info',
    };
  }

  if (phase === 'reasoning') {
    return {
      label: '正在梳理这轮问题的回答路径…',
      tone: 'info',
    };
  }

  if (phase === 'finalizing') {
    return {
      label: '正在整理最终回复…',
      tone: 'info',
    };
  }

  if (phase === 'writing') {
    return {
      label: '正在生成这轮回答…',
      tone: 'info',
    };
  }

  return {
    label: '导师正在组织这一轮回应…',
    tone: 'info',
  };
}

export function resolveLearningRedirectStatusSignal(): LearningWorkspaceStatusSignal {
  return {
    label: '已切到 Explore，正在继续这次提问…',
    tone: 'info',
  };
}

export function buildLearningSessionTransitionLabel(
  previousSession: LearningSession | null,
  nextSession: LearningSession
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

export function buildSyntheticCompletedSteps(count: number): LearningCompletedStep[] {
  return Array.from({ length: Math.max(count, 0) }, (_, index) => ({
    completedAt: new Date().toISOString(),
    confidence: 1,
    stepIndex: index,
  }));
}
