import type { UIMessage } from 'ai';

import type {
  TutorCurriculumStep,
  TutorProfile,
  TutorSession,
  TutorSessionMessage,
  TutorSessionStatus,
} from '@/lib/api/types';

export type TutorChatStatusPart = {
  label: string;
  tone: 'info' | 'success' | 'warning';
};

export type TutorChatThinkingPart = {
  label: string;
  phase: 'done' | 'revealing' | 'thinking';
};

export type TutorChatEvaluationPart = {
  confidence: number;
  meetsCriteria: boolean;
  reasoning: string;
  stepIndex: number;
};

export type TutorChatSessionPart = {
  completedStepsCount: number;
  currentStepIndex: number;
  currentStepTitle: string | null;
  progressLabel: string;
  status: TutorSessionStatus;
  transitionLabel?: string | null;
};

export type TutorUIMessage = UIMessage<
  never,
  {
    tutorEvaluation: TutorChatEvaluationPart;
    tutorThinking: TutorChatThinkingPart;
    tutorSession: TutorChatSessionPart;
    tutorStatus: TutorChatStatusPart;
  }
>;

export const TUTOR_ONE_TIME_DEMO_MODE = 'book-summary-once';
export const TUTOR_ONE_TIME_DEMO_PROMPT = '简述这本书的主要内容';

export function isTutorOneTimeDemoPrompt(text: string) {
  return text.trim() === TUTOR_ONE_TIME_DEMO_PROMPT;
}

export function buildTutorBookSummaryMarkdown(
  profile: TutorProfile,
  session: TutorSession
) {
  const currentStep = profile.curriculum[session.currentStepIndex] ?? null;
  const title = profile.title.trim() || '这本书';
  const coachingFocus =
    profile.persona.coachingFocus?.trim() ?? '先搭整体地图，再顺着关键概念慢慢往下拆。';
  const currentQuestion =
    currentStep?.guidingQuestion?.trim() ?? '先想清它最核心的问题是什么。';

  return [
    '## 主要内容',
    '',
    `${title} 主要不是在堆概念，而是在帮你建立一张可复述的理解地图：先知道它想解决什么问题，再理解关键概念之间如何接起来，最后才回到具体方法和判断。`,
    '',
    '### 可以先抓住这 3 条线',
    '',
    '- 它先定义这本书真正要处理的问题，以及为什么这个问题值得学。',
    '- 它再把核心概念按因果顺序串起来，而不是零散地背名词。',
    '- 它最后才落到方法、例子和应用场景，帮助你把抽象内容说成人话。',
    '',
    `> 如果只做第一轮复盘，可以优先围绕“${currentQuestion}”来回忆；你会更容易把目录、概念和例子连成一条线。`,
    '',
    `补一句更贴近这位导师的讲法：${coachingFocus}`,
  ].join('\n');
}

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

export function createInitialTutorChatMessages(
  profile: TutorProfile,
  session: TutorSession,
  historyMessages: TutorSessionMessage[] = []
): TutorUIMessage[] {
  if (historyMessages.length > 0) {
    return [...historyMessages]
      .sort((left, right) => {
        const timeDelta =
          new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();

        return timeDelta === 0 ? left.id - right.id : timeDelta;
      })
      .map((message) => ({
        id: `history-${message.id}`,
        parts: [{ text: message.content, type: 'text' }],
        role: message.role,
      }));
  }

  const currentStep = profile.curriculum[session.currentStepIndex] ?? null;
  const welcomeText = profile.persona.greeting.trim();
  const guidingText =
    currentStep?.guidingQuestion ??
    '先用自己的话说说你现在理解到了哪一步，我们从你的理解继续追问。';
  const previewText = session.lastMessagePreview?.trim() ?? '';
  const mergedPrompt = [guidingText.trim(), previewText]
    .filter((item, index, all) => item.length > 0 && all.indexOf(item) === index)
    .join(' ');
  const seedMessages = [welcomeText, mergedPrompt].filter(Boolean);

  return seedMessages.map((text, index) => ({
    id: index === 0 ? `assistant-welcome-${profile.id}` : `assistant-step-${session.id}`,
    parts: [{ text, type: 'text' }],
    role: 'assistant',
  }));
}

export function buildTutorWorkspaceSources(
  profile: TutorProfile,
  session: TutorSession
): TutorWorkspaceSourceCard[] {
  const currentStep = profile.curriculum[session.currentStepIndex] ?? null;
  const sourceText = profile.sourceText?.trim() || '资料摘要正在补充中。';

  if (profile.sourceType === 'book') {
    return [
      {
        excerpt: sourceText,
        id: `source-overview-${profile.id}`,
        meta: '馆藏摘要',
        title: '这本书的切入点',
      },
      {
        excerpt:
          currentStep?.guidingQuestion ??
          '先用一句话说清这本书最核心的问题，再往后拆具体概念。',
        id: `source-step-${profile.id}`,
        meta: '当前导学问题',
        title: currentStep?.title ?? '继续当前主题',
      },
      {
        excerpt:
          profile.persona.coachingFocus ??
          '先搭知识框架，再逼自己用自己的话解释概念和场景。',
        id: `source-persona-${profile.id}`,
        meta: '导师关注点',
        title: `${profile.persona.name} 会重点追问什么`,
      },
    ];
  }

  return [
    {
      excerpt: sourceText,
      id: `source-upload-${profile.id}`,
      meta: '上传资料节选',
      title: '资料正文',
    },
    {
      excerpt:
        currentStep?.goal ??
        '先看清资料要完成什么，再拆成可执行的小块和自检点。',
      id: `source-goal-${profile.id}`,
      meta: '当前学习目标',
      title: currentStep?.title ?? '本轮任务',
    },
    {
      excerpt:
        currentStep?.successCriteria ??
        '能说清资料目标、优先顺序，以及最容易出错的地方。',
      id: `source-criteria-${profile.id}`,
      meta: '通过标准',
      title: '导师如何判断你已经理解',
    },
  ];
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
        profile.persona.coachingFocus ?? '先搭框架，再逼自己用自己的话解释。',
      id: `highlight-focus-${profile.id}`,
      title: '这位导师正在盯什么',
      tone: 'info',
    },
    {
      body:
        currentStep?.successCriteria ??
        '能用自己的话说明关键概念，并给出判断依据或例子。',
      id: `highlight-criteria-${profile.id}`,
      title: '本步通过标准',
      tone: 'success',
    },
    {
      body: nextStep
        ? `如果这一轮通过，下一步会进入“${nextStep.title}”，重点是：${nextStep.guidingQuestion ?? nextStep.goal ?? '继续往下拆。'}`
        : '这是当前导学本的最后一段主题，通过后就进入复习和收束。',
      id: `highlight-next-${profile.id}`,
      title: '接下来会推进到哪里',
      tone: nextStep ? 'info' : 'warning',
    },
  ];
}

export function extractTextFromUIMessage(message: {
  parts?: { text?: string; type?: string }[];
}) {
  return (message.parts ?? [])
    .filter((part) => part.type === 'text' && typeof part.text === 'string')
    .map((part) => part.text)
    .join('');
}

export function detectTutorStepSuccess(step: TutorCurriculumStep | null, userText: string) {
  const normalized = userText.trim();
  const tokenCount = normalized
    .split(/[\s，。！？,.!?；、]+/)
    .map((item) => item.trim())
    .filter(Boolean).length;
  const keywords = [step?.title, step?.guidingQuestion, step?.successCriteria]
    .filter(Boolean)
    .join(' ')
    .replace(/[？?]/g, ' ')
    .split(/[\s，。！？,.!?；、]+/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 2);
  const keywordMatched = keywords.some((item) => normalized.includes(item));
  const confidence = Math.min(
    0.92,
    tokenCount >= 12 ? 0.86 : tokenCount >= 8 ? 0.74 : keywordMatched ? 0.71 : 0.58
  );

  return {
    confidence,
    meetsCriteria: confidence >= 0.7,
  };
}

export function buildTutorAssistantReply(
  profile: TutorProfile,
  session: TutorSession,
  step: TutorCurriculumStep | null,
  evaluation: TutorChatEvaluationPart
) {
  const nextStep = profile.curriculum[session.currentStepIndex + (evaluation.meetsCriteria ? 1 : 0)] ?? null;

  if (evaluation.meetsCriteria && nextStep && nextStep.id !== step?.id) {
    return `你的回答已经抓住了“${step?.title ?? '当前步骤'}”的主线。接下来我们进入“${nextStep.title}”。先想一想：${nextStep.guidingQuestion ?? '你会怎么继续往下解释？'}`;
  }

  if (evaluation.meetsCriteria) {
    return '你已经把这一步说清楚了。现在试着把整份资料压缩成 3 条复习线索，看看哪些内容最值得你下次快速回看。';
  }

  return `先别急着找标准答案。围绕“${step?.guidingQuestion ?? '当前问题'}”，用自己的话多说一点：你觉得最关键的概念、步骤或判断依据分别是什么？`;
}

function resolveProgressLabel(completedStepsCount: number, totalSteps: number) {
  return `${completedStepsCount} / ${Math.max(totalSteps, 1)} 步`;
}

export function buildNextTutorSession(
  session: TutorSession,
  profile: TutorProfile,
  evaluation: TutorChatEvaluationPart
): TutorChatSessionPart {
  const alreadyCompletedCurrentStep = session.completedSteps.some(
    (item) => item.stepIndex === session.currentStepIndex
  );
  const completedStepsCount =
    evaluation.meetsCriteria && !alreadyCompletedCurrentStep
      ? session.completedStepsCount + 1
      : session.completedStepsCount;
  const nextCurrentStepIndex =
    evaluation.meetsCriteria && !alreadyCompletedCurrentStep
      ? Math.min(session.currentStepIndex + 1, profile.curriculum.length)
      : session.currentStepIndex;
  const nextStatus =
    nextCurrentStepIndex >= profile.curriculum.length ? 'completed' : session.status;
  const nextStepTitle = profile.curriculum[nextCurrentStepIndex]?.title ?? null;
  const transitionLabel =
    evaluation.meetsCriteria && nextStepTitle
      ? `你已经抓住这一节的主线，现在进入“${nextStepTitle}”。`
      : evaluation.meetsCriteria
        ? '这一步已经通过，你可以开始收束整份资料的关键线索了。'
        : '还留在当前步骤，导师会继续追问和补提示。';

  return {
    completedStepsCount,
    currentStepIndex: nextCurrentStepIndex,
    currentStepTitle: nextStepTitle,
    progressLabel: resolveProgressLabel(completedStepsCount, profile.curriculum.length),
    status: nextStatus,
    transitionLabel,
  };
}

export function chunkText(text: string, size = 14) {
  return text.match(new RegExp(`[\\s\\S]{1,${size}}`, 'g')) ?? [text];
}
