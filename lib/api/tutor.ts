import type {
  CreateTutorProfileInput,
  StartTutorSessionResult,
  TutorCompletedStep,
  TutorCurriculumStep,
  TutorDashboard,
  TutorDashboardContinueSession,
  TutorPersona,
  TutorProfile,
  TutorSession,
  TutorSessionMessage,
  TutorStepEvaluation,
  TutorStreamEvent,
} from '@/lib/api/types';
import { libraryRequest } from '@/lib/api/client';
import { getMockBook, getMockBookDetail } from '@/lib/api/mock';

type MockTutorState = {
  messagesBySessionId: Record<number, TutorSessionMessage[]>;
  nextConversationSessionId: number;
  nextMessageId: number;
  nextProfileId: number;
  nextSessionId: number;
  profiles: TutorProfile[];
  sessions: TutorSession[];
};

const defaultBookCurriculum: TutorCurriculumStep[] = [
  {
    goal: '先建立阅读地图，知道这本书想解决什么问题。',
    guidingQuestion: '如果只用一句话介绍这本书，它最核心的任务是什么？',
    id: 'step-1',
    successCriteria: '能说出主题、对象和想学会的能力。',
    title: '建立整体框架',
  },
  {
    goal: '把关键概念说清楚，而不是只记术语。',
    guidingQuestion: '你会怎么向同学解释“监督学习”和“标签数据”？',
    id: 'step-2',
    successCriteria: '能用自己的话解释核心概念，并给出简单例子。',
    title: '用自己的话解释概念',
  },
  {
    goal: '把抽象章节和现实任务连接起来。',
    guidingQuestion: '书里的方法最适合解决什么类型的问题？你能举一个场景吗？',
    id: 'step-3',
    successCriteria: '能把至少一个方法映射到具体任务场景。',
    title: '把方法放回真实场景',
  },
  {
    goal: '形成可复习、可迁移的收尾总结。',
    guidingQuestion: '如果明天复习，你会保留哪三条最关键的线索？',
    id: 'step-4',
    successCriteria: '能总结出自己的复习提纲或下一步阅读建议。',
    title: '沉淀复习提纲',
  },
];

const defaultUploadCurriculum: TutorCurriculumStep[] = [
  {
    goal: '先识别资料的任务结构和关键产出。',
    guidingQuestion: '这份资料最想让你完成什么？实验、证明，还是复习？',
    id: 'step-1',
    successCriteria: '能说清资料目标和使用场景。',
    title: '看清资料任务',
  },
  {
    goal: '把步骤拆成可执行的小块。',
    guidingQuestion: '如果要在 20 分钟内完成预习，你会先看哪两步？',
    id: 'step-2',
    successCriteria: '能分出优先级并指出先后顺序。',
    title: '拆出执行顺序',
  },
  {
    goal: '识别容易卡住的地方，提前准备。',
    guidingQuestion: '你觉得哪一步最容易出错？为什么？',
    id: 'step-3',
    successCriteria: '能指出风险点并给出自检办法。',
    title: '提前处理风险点',
  },
];

const mathTutorCurriculum: TutorCurriculumStep[] = [
  {
    goal: '先判断这组题到底在考什么，不要一上来就套公式。',
    guidingQuestion: '看到这道极限题时，你第一眼应该先辨认哪两个结构？',
    id: 'math-step-1',
    successCriteria: '能指出题型特征和第一步判断。',
    title: '先识别题型结构',
  },
  {
    goal: '把定义、变形和直觉之间的关系说清楚。',
    guidingQuestion: '如果不用公式，你会怎么解释“趋近但不等于”？',
    id: 'math-step-2',
    successCriteria: '能用自己的话解释概念，并说明为什么要做某个变形。',
    title: '用自己的话解释定义',
  },
  {
    goal: '形成一套可以重复调用的解题模板。',
    guidingQuestion: '这类题你以后遇到时，前三步检查顺序会是什么？',
    id: 'math-step-3',
    successCriteria: '能给出稳定的解题顺序，而不是只会这一题。',
    title: '沉淀解题模板',
  },
  {
    goal: '把常见错因显性化，避免下次重复。',
    guidingQuestion: '你最容易在哪一步算对了结果却想错了逻辑？',
    id: 'math-step-4',
    successCriteria: '能说出自己的易错点和自检方法。',
    title: '复盘自己的错因',
  },
];

const osLabCurriculum: TutorCurriculumStep[] = [
  {
    goal: '先辨认实验要观测的系统行为，而不是急着跑命令。',
    guidingQuestion: '这次实验最想让你观察到什么现象：进程关系、通信还是调度？',
    id: 'os-step-1',
    successCriteria: '能明确实验目标和核心观测对象。',
    title: '看清实验目标',
  },
  {
    goal: '把代码步骤和系统调用的因果关系说清楚。',
    guidingQuestion: '如果先 fork 再 pipe，你预期父子进程分别会拿到什么？',
    id: 'os-step-2',
    successCriteria: '能说明关键系统调用之间的先后关系。',
    title: '预测系统行为',
  },
  {
    goal: '提前设计日志和截图，不靠做完后回忆。',
    guidingQuestion: '你准备记录哪三个输出，才能证明你的判断是对的？',
    id: 'os-step-3',
    successCriteria: '能列出验证实验现象所需的日志或截图。',
    title: '设计观察记录',
  },
  {
    goal: '把错误现象和排查路径对应起来。',
    guidingQuestion: '如果结果和预期不一样，你会先查参数、时序还是文件描述符？',
    id: 'os-step-4',
    successCriteria: '能说出一条清晰的排查顺序。',
    title: '收束异常排查',
  },
];

const userResearchCurriculum: TutorCurriculumStep[] = [
  {
    goal: '先确认这次研究要支持的产品决策。',
    guidingQuestion: '这轮研究最后要帮助团队回答什么决策问题？',
    id: 'research-step-1',
    successCriteria: '能说清研究问题和业务场景。',
    title: '锁定研究问题',
  },
  {
    goal: '把访谈题目和信息目标对齐。',
    guidingQuestion: '如果只保留三个访谈问题，你会留下哪些？为什么？',
    id: 'research-step-2',
    successCriteria: '能让问题直接服务于要验证的假设。',
    title: '设计有效提问',
  },
  {
    goal: '从零散表述里提炼出模式。',
    guidingQuestion: '你会如何把一堆原话整理成可行动的洞察？',
    id: 'research-step-3',
    successCriteria: '能给出整理标签、聚类和结论的路径。',
    title: '提炼研究洞察',
  },
];

const modernHistoryCurriculum: TutorCurriculumStep[] = [
  {
    goal: '先建立时间轴，再进入事件意义。',
    guidingQuestion: '如果只保留四个时间节点，你会选哪四个？',
    id: 'history-step-1',
    successCriteria: '能按顺序说出关键节点。',
    title: '先搭时间主线',
  },
  {
    goal: '看清改革、战争与制度变化之间的关联。',
    guidingQuestion: '洋务运动和戊戌变法分别想解决什么问题？',
    id: 'history-step-2',
    successCriteria: '能比较不同事件的目标和局限。',
    title: '比较事件目标',
  },
  {
    goal: '把知识点从孤立记忆变成因果链。',
    guidingQuestion: '一个事件为什么会推着下一个事件发生？',
    id: 'history-step-3',
    successCriteria: '能说出事件之间至少一条因果链。',
    title: '串起历史因果',
  },
  {
    goal: '形成考前可复用的复习讲法。',
    guidingQuestion: '如果让你用 90 秒复述这一段近代史，你会怎么讲？',
    id: 'history-step-4',
    successCriteria: '能产出压缩后的复习版本。',
    title: '压缩成复习表达',
  },
];

function clone<T>(value: T): T {
  return typeof globalThis.structuredClone === 'function'
    ? globalThis.structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}

function nowIso() {
  return new Date().toISOString();
}

function resolveUploadFileName(sourceText?: string | null) {
  const normalized = sourceText?.trim();
  if (!normalized) {
    return null;
  }

  const withoutQuery = normalized.split(/[?#]/, 1)[0] ?? normalized;
  const rawSegment = withoutQuery.split('/').pop() ?? withoutQuery;

  if (!rawSegment) {
    return null;
  }

  try {
    return decodeURIComponent(rawSegment);
  } catch {
    return rawSegment;
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getTutorDataMode() {
  return (process.env.EXPO_PUBLIC_TUTOR_DATA_MODE ?? 'mock').trim().toLowerCase();
}

function shouldUseTutorFrontendMock() {
  return getTutorDataMode() !== 'live';
}

function resolveProgressLabel(completedStepsCount: number, totalSteps: number) {
  return `${completedStepsCount} / ${Math.max(totalSteps, 1)} 步`;
}

function createReadyBookProfile(): TutorProfile {
  const book = getMockBook(1);
  const detail = getMockBookDetail(1);
  const timestamp = '2026-04-08T08:20:00.000Z';

  return {
    bookId: book?.id ?? 1,
    createdAt: '2026-04-08T08:00:00.000Z',
    curriculum: clone(defaultBookCurriculum),
    id: 101,
    persona: {
      coachingFocus: '先搭框架，再逼自己用自己的话解释。',
      greeting: '我们不急着背定义，先把这本书的结构地图搭起来。',
      name: '周老师',
      style: '先追问，再给脚手架提示',
    },
    sourceText: detail?.catalog.summary ?? book?.summary ?? null,
    sourceType: 'book',
    status: 'ready',
    title: book?.title ?? '机器学习从零到一',
    updatedAt: timestamp,
  };
}

function createReadyUploadProfile(): TutorProfile {
  return {
    bookId: null,
    createdAt: '2026-04-08T09:00:00.000Z',
    curriculum: clone(defaultUploadCurriculum),
    id: 102,
    persona: {
      coachingFocus: '实验前先做路径梳理，避免跟着步骤机械操作。',
      greeting: '这份资料适合先做一轮预习，我们先辨认任务和风险点。',
      name: '实验课助教',
      style: '先让你判断，再补充提示',
    },
    sourceText: '实验一：环境配置、设备检查、记录日志与异常排查。',
    sourceType: 'upload',
    status: 'ready',
    title: '实验手册导学',
    updatedAt: '2026-04-08T09:12:00.000Z',
  };
}

function createGeneratingProfile(): TutorProfile {
  return {
    bookId: null,
    createdAt: '2026-04-08T10:15:00.000Z',
    curriculum: [],
    id: 103,
    persona: {
      greeting: '资料正在拆解中，马上就好。',
      name: '资料分析助手',
      style: '生成中',
    },
    sourceText: '课程讲义正在分析。',
    sourceType: 'upload',
    status: 'generating',
    title: '信号与系统讲义',
    updatedAt: '2026-04-08T10:15:00.000Z',
  };
}

function createFailedProfile(): TutorProfile {
  return {
    bookId: null,
    createdAt: '2026-04-07T19:20:00.000Z',
    curriculum: [],
    id: 104,
    persona: {
      greeting: '这份资料需要你补充更清晰的文本后再试一次。',
      name: '恢复助手',
      style: '等待补充资料',
    },
    sourceText: '扫描版 PDF 无法提取正文。',
    sourceType: 'upload',
    status: 'failed',
    title: '电路实验扫描件',
    updatedAt: '2026-04-07T19:22:00.000Z',
  };
}

function createReadyMathProfile(): TutorProfile {
  return {
    bookId: 2,
    createdAt: '2026-04-08T11:00:00.000Z',
    curriculum: clone(mathTutorCurriculum),
    id: 105,
    persona: {
      coachingFocus: '先辨认题型，再解释为什么这样做，最后才谈技巧。',
      greeting: '高数最怕只记步骤不懂判断，我们先把题型识别练出来。',
      name: '陈老师',
      style: '先让你判断，再补一格脚手架',
    },
    sourceText: '本导学本围绕极限、导数与常见错因，强调题型判断与解题模板。',
    sourceType: 'book',
    status: 'ready',
    title: '高等数学题型拆解',
    updatedAt: '2026-04-08T11:18:00.000Z',
  };
}

function createReadyOperatingSystemProfile(): TutorProfile {
  return {
    bookId: null,
    createdAt: '2026-04-08T12:10:00.000Z',
    curriculum: clone(osLabCurriculum),
    id: 106,
    persona: {
      coachingFocus: '实验前先预测系统行为，做完再用日志验证。',
      greeting: '别急着跑程序，我们先预测每个系统调用会造成什么结果。',
      name: '宋助教',
      style: '先让你预测，再对照日志',
    },
    sourceText: '实验三：进程创建、管道通信、信号处理与日志记录规范。',
    sourceType: 'upload',
    status: 'ready',
    title: '操作系统实验导学',
    updatedAt: '2026-04-08T12:28:00.000Z',
  };
}

function createReadyResearchProfile(): TutorProfile {
  return {
    bookId: 3,
    createdAt: '2026-04-08T14:00:00.000Z',
    curriculum: clone(userResearchCurriculum),
    id: 107,
    persona: {
      coachingFocus: '不急着做结论，先确认你到底要支持哪个产品决策。',
      greeting: '用户研究不是做漂亮报告，而是帮团队做更准的判断。',
      name: '吴导师',
      style: '先盯决策问题，再拆研究问题',
    },
    sourceText: '聚焦用户访谈、洞察提炼与产品决策支持的研究方法导读。',
    sourceType: 'book',
    status: 'ready',
    title: '用户研究方法导学',
    updatedAt: '2026-04-08T14:16:00.000Z',
  };
}

function createReadyHistoryProfile(): TutorProfile {
  return {
    bookId: null,
    createdAt: '2026-04-08T16:10:00.000Z',
    curriculum: clone(modernHistoryCurriculum),
    id: 108,
    persona: {
      coachingFocus: '先搭时间主线，再把事件变成因果链。',
      greeting: '近代史最容易碎片化，我们先把时间轴和因果关系搭稳。',
      name: '许老师',
      style: '先问主线，再追问比较和因果',
    },
    sourceText: '晚清改革、列强冲击、制度变迁与近代化道路的复习提纲。',
    sourceType: 'upload',
    status: 'ready',
    title: '近代史复习提纲',
    updatedAt: '2026-04-08T16:24:00.000Z',
  };
}

function createMessage(
  id: number,
  tutorSessionId: number,
  role: TutorSessionMessage['role'],
  createdAt: string,
  content: string
): TutorSessionMessage {
  return {
    content,
    createdAt,
    id,
    role,
    tutorSessionId,
  };
}

function createSessionFromProfile(
  profile: TutorProfile,
  options: {
    completedSteps?: TutorCompletedStep[];
    conversationSessionId: number;
    currentStepIndex?: number;
    id: number;
    lastMessagePreview?: string | null;
    status?: TutorSession['status'];
    updatedAt?: string;
  }
): TutorSession {
  const completedSteps = options.completedSteps ?? [];
  const currentStepIndex = options.currentStepIndex ?? 0;

  return {
    completedSteps: clone(completedSteps),
    completedStepsCount: completedSteps.length,
    conversationSessionId: options.conversationSessionId,
    createdAt: profile.createdAt,
    currentStepIndex,
    currentStepTitle: profile.curriculum[currentStepIndex]?.title ?? null,
    id: options.id,
    lastMessagePreview: options.lastMessagePreview ?? null,
    progressLabel: resolveProgressLabel(completedSteps.length, profile.curriculum.length),
    status: options.status ?? 'active',
    tutorProfileId: profile.id,
    updatedAt: options.updatedAt ?? profile.updatedAt,
  };
}

const initialProfiles = [
  createReadyBookProfile(),
  createReadyUploadProfile(),
  createGeneratingProfile(),
  createFailedProfile(),
  createReadyMathProfile(),
  createReadyOperatingSystemProfile(),
  createReadyResearchProfile(),
  createReadyHistoryProfile(),
];

const initialSessions = [
  createSessionFromProfile(initialProfiles[0], {
    completedSteps: [
      {
        completedAt: '2026-04-08T09:10:00.000Z',
        confidence: 0.81,
        stepIndex: 0,
      },
    ],
    conversationSessionId: 401,
    currentStepIndex: 1,
    id: 301,
    lastMessagePreview: '先试着说说什么是标签数据。',
    updatedAt: '2026-04-08T09:16:00.000Z',
  }),
  createSessionFromProfile(initialProfiles[1], {
    completedSteps: [],
    conversationSessionId: 402,
    currentStepIndex: 0,
    id: 302,
    lastMessagePreview: '先判断这份资料更偏实验还是复习。',
    updatedAt: '2026-04-08T09:20:00.000Z',
  }),
  createSessionFromProfile(initialProfiles[4], {
    completedSteps: [
      {
        completedAt: '2026-04-08T11:20:00.000Z',
        confidence: 0.83,
        stepIndex: 0,
      },
      {
        completedAt: '2026-04-08T11:42:00.000Z',
        confidence: 0.79,
        stepIndex: 1,
      },
    ],
    conversationSessionId: 403,
    currentStepIndex: 2,
    id: 303,
    lastMessagePreview: '再补一句：你怎么判断现在可以用洛必达，而不是只是想偷快？',
    updatedAt: '2026-04-08T11:48:00.000Z',
  }),
  createSessionFromProfile(initialProfiles[5], {
    completedSteps: [
      {
        completedAt: '2026-04-08T12:26:00.000Z',
        confidence: 0.76,
        stepIndex: 0,
      },
    ],
    conversationSessionId: 404,
    currentStepIndex: 1,
    id: 304,
    lastMessagePreview: '如果先 fork 再 pipe，你预期父子进程分别会拿到什么？',
    updatedAt: '2026-04-08T12:31:00.000Z',
  }),
  createSessionFromProfile(initialProfiles[7], {
    completedSteps: [],
    conversationSessionId: 405,
    currentStepIndex: 0,
    id: 305,
    lastMessagePreview: '这条主线是对的。接下来先说说你为什么选它们，它们分别推动了什么变化？',
    updatedAt: '2026-04-08T16:30:00.000Z',
  }),
];

const initialMessages: Record<number, TutorSessionMessage[]> = {
  301: [
    createMessage(
      801,
      301,
      'assistant',
      '2026-04-08T09:00:00.000Z',
      '我们先不急着记算法名。你觉得这本书最先要帮你建立的是什么框架？'
    ),
    createMessage(
      802,
      301,
      'user',
      '2026-04-08T09:04:00.000Z',
      '我觉得它先让我知道数据、目标和模型之间是什么关系。'
    ),
    createMessage(
      803,
      301,
      'assistant',
      '2026-04-08T09:06:00.000Z',
      '很好，这说明你已经有了整体图景。下一步我们试着用自己的话解释监督学习。'
    ),
    createMessage(
      804,
      301,
      'user',
      '2026-04-08T09:10:00.000Z',
      '监督学习就是给模型看已经标好答案的数据，让它学会从输入推出输出。'
    ),
    createMessage(
      805,
      301,
      'assistant',
      '2026-04-08T09:12:00.000Z',
      '这个解释已经很接近了。那你再想一层，什么叫“标签数据”？'
    ),
    createMessage(
      806,
      301,
      'user',
      '2026-04-08T09:14:00.000Z',
      '标签就是训练时已经知道的正确结果，比如邮件是不是垃圾邮件，或者图片是不是猫。'
    ),
    createMessage(
      807,
      301,
      'assistant',
      '2026-04-08T09:15:00.000Z',
      '很好，你已经把标签说到了“正确结果”这一层。再往前一步，如果没有标签，为什么监督学习就难以直接成立？'
    ),
    createMessage(
      808,
      301,
      'user',
      '2026-04-08T09:16:00.000Z',
      '因为模型不知道自己应该学成什么样，就少了一个对照目标。'
    ),
  ],
  302: [
    createMessage(
      809,
      302,
      'assistant',
      '2026-04-08T09:20:00.000Z',
      '欢迎回来。先别看细节步骤，先判断这份实验资料最重要的产出是什么。'
    ),
    createMessage(
      810,
      302,
      'user',
      '2026-04-08T09:22:00.000Z',
      '我觉得不只是跑通实验，更重要的是知道每一步为什么做，还有怎么记录异常。'
    ),
    createMessage(
      811,
      302,
      'assistant',
      '2026-04-08T09:23:00.000Z',
      '这个判断不错。那如果只给你 20 分钟预习，你会先看哪两部分？'
    ),
    createMessage(
      812,
      302,
      'user',
      '2026-04-08T09:25:00.000Z',
      '我会先看实验目标和环境配置，再看数据记录和异常排查。'
    ),
    createMessage(
      813,
      302,
      'assistant',
      '2026-04-08T09:27:00.000Z',
      '很好，因为这会决定你后面是机械照做，还是能看懂结果。现在再往下想：这份资料更偏实验还是更偏复习？'
    ),
    createMessage(
      814,
      302,
      'user',
      '2026-04-08T09:28:00.000Z',
      '更偏实验，因为它一直在强调操作顺序、日志和设备检查。'
    ),
    createMessage(
      815,
      302,
      'assistant',
      '2026-04-08T09:30:00.000Z',
      '对，所以接下来我们会重点拆“执行顺序”和“风险点”。先判断这份资料更偏实验还是复习。'
    ),
  ],
  303: [
    createMessage(
      816,
      303,
      'assistant',
      '2026-04-08T11:10:00.000Z',
      '看到极限题先不要写公式。你第一眼会先辨认哪两个结构？'
    ),
    createMessage(
      817,
      303,
      'user',
      '2026-04-08T11:16:00.000Z',
      '我会先看是代入后得到定值还是未定式，再看有没有分式、根号或三角结构。'
    ),
    createMessage(
      818,
      303,
      'assistant',
      '2026-04-08T11:18:00.000Z',
      '这就是题型判断。那如果不用公式，你会怎么解释“趋近但不等于”？'
    ),
    createMessage(
      819,
      303,
      'user',
      '2026-04-08T11:29:00.000Z',
      '就是变量越来越靠近某个值，但在讨论那个过程时，不一定真的取到那个值。'
    ),
    createMessage(
      820,
      303,
      'assistant',
      '2026-04-08T11:42:00.000Z',
      '很好，这已经不是背定义了。现在进入下一步：把这类极限题的前三步检查顺序说给我听。'
    ),
    createMessage(
      821,
      303,
      'user',
      '2026-04-08T11:47:00.000Z',
      '先判是不是未定式，再选能不能因式分解或有理化，最后再决定要不要用洛必达。'
    ),
    createMessage(
      822,
      303,
      'assistant',
      '2026-04-08T11:48:00.000Z',
      '这个顺序已经很稳了。再补一句：你怎么判断“现在可以用洛必达，而不是你只是想偷快”？'
    ),
  ],
  304: [
    createMessage(
      823,
      304,
      'assistant',
      '2026-04-08T12:16:00.000Z',
      '这次实验最想让你观察到什么现象：进程关系、通信还是调度？'
    ),
    createMessage(
      824,
      304,
      'user',
      '2026-04-08T12:20:00.000Z',
      '我觉得核心是观察父子进程创建后，怎么通过管道交换数据。'
    ),
    createMessage(
      825,
      304,
      'assistant',
      '2026-04-08T12:22:00.000Z',
      '很好，这样你就知道后面日志要盯什么了。那如果先 fork 再 pipe，你预期父子进程分别会拿到什么？'
    ),
    createMessage(
      826,
      304,
      'user',
      '2026-04-08T12:27:00.000Z',
      '如果 pipe 在 fork 之后创建，父子不会天然共享那组描述符，所以通信链路可能跟预期不一样。'
    ),
    createMessage(
      827,
      304,
      'assistant',
      '2026-04-08T12:31:00.000Z',
      '对，这就是顺序影响资源继承。再具体一点：如果你要证明自己的判断是对的，准备记录哪三个输出？'
    ),
  ],
  305: [
    createMessage(
      828,
      305,
      'assistant',
      '2026-04-08T16:20:00.000Z',
      '我们先把这段近代史看成一条会不断推进的主线。近代史最容易碎片化。先别背条目，如果只保留四个时间节点，你会选哪四个？'
    ),
    createMessage(
      829,
      305,
      'user',
      '2026-04-08T16:24:00.000Z',
      '我会先放鸦片战争、洋务运动、戊戌变法和辛亥革命。'
    ),
    createMessage(
      830,
      305,
      'assistant',
      '2026-04-08T16:30:00.000Z',
      '这条主线是对的。接下来我们不急着记细节，先说说你为什么选它们，它们分别推动了什么变化？'
    ),
  ],
};

let mockTutorState: MockTutorState = {
  messagesBySessionId: clone(initialMessages),
  nextConversationSessionId: 500,
  nextMessageId: 900,
  nextProfileId: 200,
  nextSessionId: 400,
  profiles: clone(initialProfiles),
  sessions: clone(initialSessions),
};

function findProfile(profileId: number) {
  return mockTutorState.profiles.find((profile) => profile.id === profileId) ?? null;
}

function findSession(sessionId: number) {
  return mockTutorState.sessions.find((session) => session.id === sessionId) ?? null;
}

function hydrateSession(session: TutorSession): TutorSession {
  const profile = findProfile(session.tutorProfileId);
  const completedSteps = session.completedSteps ?? [];
  const totalSteps = profile?.curriculum.length ?? 0;
  const currentStepTitle = profile?.curriculum[session.currentStepIndex]?.title ?? null;

  return {
    ...session,
    completedSteps: clone(completedSteps),
    completedStepsCount: completedSteps.length,
    currentStepTitle,
    progressLabel: resolveProgressLabel(completedSteps.length, totalSteps),
  };
}

function normalizeTutorPersona(raw: any): TutorPersona {
  return {
    coachingFocus: raw?.coaching_focus ?? raw?.coachingFocus ?? raw?.coaching_focus_text ?? null,
    greeting: raw?.greeting ?? '我们先从你的理解出发。',
    name: raw?.name ?? '学习导师',
    style: raw?.style ?? null,
  };
}

function normalizeTutorCurriculumStep(raw: any, index = 0): TutorCurriculumStep {
  return {
    goal: raw?.goal ?? null,
    guidingQuestion: raw?.guiding_question ?? raw?.guidingQuestion ?? null,
    id: String(raw?.id ?? `step-${index + 1}`),
    successCriteria: raw?.success_criteria ?? raw?.successCriteria ?? null,
    title: raw?.title ?? `步骤 ${index + 1}`,
  };
}

function normalizeTutorProfile(raw: any): TutorProfile {
  const curriculumRaw = raw?.curriculum_json ?? raw?.curriculum ?? [];

  return {
    bookId: raw?.book_id ?? raw?.bookId ?? null,
    createdAt: raw?.created_at ?? raw?.createdAt ?? nowIso(),
    curriculum: Array.isArray(curriculumRaw)
      ? curriculumRaw.map((step: any, index: number) => normalizeTutorCurriculumStep(step, index))
      : [],
    id: raw?.id ?? 0,
    persona: normalizeTutorPersona(raw?.persona_json ?? raw?.persona ?? {}),
    sourceText: raw?.source_text ?? raw?.sourceText ?? null,
    sourceType: raw?.source_type ?? raw?.sourceType ?? 'upload',
    status: raw?.status ?? 'generating',
    title: raw?.title ?? '未命名导师',
    updatedAt: raw?.updated_at ?? raw?.updatedAt ?? raw?.created_at ?? raw?.createdAt ?? nowIso(),
  };
}

function normalizeTutorCompletedStep(raw: any): TutorCompletedStep {
  return {
    completedAt: raw?.completed_at ?? raw?.completedAt ?? nowIso(),
    confidence: Number(raw?.confidence ?? 0),
    stepIndex: Number(raw?.step_index ?? raw?.stepIndex ?? 0),
  };
}

function normalizeTutorSession(raw: any): TutorSession {
  const completedStepsRaw = raw?.completed_steps_json ?? raw?.completedSteps ?? [];
  const completedSteps = Array.isArray(completedStepsRaw)
    ? completedStepsRaw.map((item: any) => normalizeTutorCompletedStep(item))
    : [];
  const explicitCompletedCount =
    raw?.completed_steps_count ?? raw?.completedStepsCount ?? completedSteps.length;
  const progressLabel = raw?.progress_label ?? raw?.progressLabel;

  return {
    completedSteps,
    completedStepsCount: Number(explicitCompletedCount),
    conversationSessionId: raw?.conversation_session_id ?? raw?.conversationSessionId ?? 0,
    createdAt: raw?.created_at ?? raw?.createdAt ?? nowIso(),
    currentStepIndex: Number(raw?.current_step_index ?? raw?.currentStepIndex ?? 0),
    currentStepTitle: raw?.current_step_title ?? raw?.currentStepTitle ?? null,
    id: raw?.id ?? 0,
    lastMessagePreview: raw?.last_message_preview ?? raw?.lastMessagePreview ?? null,
    progressLabel: progressLabel ?? resolveProgressLabel(Number(explicitCompletedCount), completedSteps.length || 1),
    status: raw?.status ?? 'active',
    tutorProfileId: raw?.tutor_profile_id ?? raw?.tutorProfileId ?? 0,
    updatedAt: raw?.updated_at ?? raw?.updatedAt ?? raw?.created_at ?? raw?.createdAt ?? nowIso(),
  };
}

function normalizeTutorSessionMessage(raw: any): TutorSessionMessage {
  return {
    content: raw?.content ?? '',
    createdAt: raw?.created_at ?? raw?.createdAt ?? nowIso(),
    id: raw?.id ?? 0,
    role: raw?.role ?? 'assistant',
    tutorSessionId: raw?.tutor_session_id ?? raw?.tutorSessionId ?? raw?.session_id ?? 0,
  };
}

function normalizeTutorSuggestion(raw: any) {
  return {
    bookId: raw?.book_id ?? raw?.bookId ?? null,
    description: raw?.description ?? '',
    id: String(raw?.id ?? `suggestion-${Math.random()}`),
    kind: raw?.kind ?? 'next_step',
    profileId: raw?.profile_id ?? raw?.profileId ?? null,
    title: raw?.title ?? '继续学习',
  } as TutorDashboard['suggestions'][number];
}

function normalizeTutorDashboardContinueSession(raw: any): TutorDashboardContinueSession | null {
  if (!raw) {
    return null;
  }

  const session = normalizeTutorSession(raw);
  const profile = raw?.tutor_profile ?? raw?.tutorProfile ?? null;
  const profileId = profile?.id ?? raw?.profile_id ?? raw?.profileId ?? session.tutorProfileId;

  return {
    ...session,
    personaName: profile?.persona_json?.name ?? profile?.persona?.name ?? raw?.persona_name ?? null,
    profileId,
    title: profile?.title ?? raw?.title ?? '继续学习',
    tutorProfileId: profileId,
  };
}

function normalizeTutorDashboard(payload: any): TutorDashboard {
  return {
    continueSession: normalizeTutorDashboardContinueSession(
      payload?.continue_session ?? payload?.continueSession ?? null
    ),
    recentProfiles: Array.isArray(payload?.recent_profiles ?? payload?.recentProfiles)
      ? (payload.recent_profiles ?? payload.recentProfiles).map((profile: any) => normalizeTutorProfile(profile))
      : [],
    suggestions: Array.isArray(payload?.suggestions)
      ? payload.suggestions.map((item: any) => normalizeTutorSuggestion(item))
      : [],
  };
}

function normalizeStartTutorSessionResult(payload: any): StartTutorSessionResult {
  return {
    firstStep: payload?.first_step ?? payload?.firstStep
      ? normalizeTutorCurriculumStep(payload?.first_step ?? payload?.firstStep)
      : null,
    session: normalizeTutorSession(payload?.session ?? payload),
    welcomeMessage: payload?.welcome_message ?? payload?.welcomeMessage ?? '我们开始吧。',
  };
}

function listMockTutorProfiles() {
  return clone(mockTutorState.profiles).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

function listMockTutorSessions() {
  return clone(mockTutorState.sessions)
    .map((session) => hydrateSession(session))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

function listMockTutorSessionMessages(sessionId: number) {
  return clone(mockTutorState.messagesBySessionId[sessionId] ?? []);
}

function buildMockTutorDashboard(): TutorDashboard {
  const recentProfiles = listMockTutorProfiles();
  const recentSessions = listMockTutorSessions();
  const activeSession = recentSessions.find((session) => session.status === 'active') ?? null;
  const activeProfile = activeSession ? findProfile(activeSession.tutorProfileId) : null;
  const suggestions = [
    activeSession && activeProfile
      ? {
          description: `现在停在“${activeSession.currentStepTitle ?? '当前步骤'}”，适合继续往下推进。`,
          id: 'suggestion-continue',
          kind: 'next_step' as const,
          profileId: activeProfile.id,
          title: `继续当前书的第 ${activeSession.currentStepIndex + 1} 步`,
        }
      : null,
    {
      bookId: 4,
      description: '把馆藏书变成一个可以持续追问你的学习导师。',
      id: 'suggestion-create-book',
      kind: 'create_from_book' as const,
      title: '从下一本馆藏书开始导学',
    },
    {
      profileId: 102,
      description: '实验资料更适合先看任务、顺序和风险点。',
      id: 'suggestion-review-upload',
      kind: 'review' as const,
      title: '回到实验资料做预习',
    },
  ].filter(Boolean) as TutorDashboard['suggestions'];

  return {
    continueSession: activeSession && activeProfile
      ? {
          ...activeSession,
          personaName: activeProfile.persona.name,
          profileId: activeProfile.id,
          title: activeProfile.title,
        }
      : null,
    recentProfiles,
    suggestions,
  };
}

function createMockTutorProfile(input: CreateTutorProfileInput): TutorProfile {
  const timestamp = nowIso();
  const book = input.bookId ? getMockBook(input.bookId) : null;
  const bookDetail = input.bookId ? getMockBookDetail(input.bookId) : null;
  const isUploadProfile = input.sourceType === 'upload';
  const curriculum = input.sourceType === 'book' ? clone(defaultBookCurriculum) : [];
  const persona =
    input.sourceType === 'book'
      ? {
          coachingFocus: '先搭章节地图，再进入例子和方法。',
          greeting: '这次我们从这本书最值得先抓住的主线开始。',
          name: '馆藏导学老师',
          style: '先提问，再根据你的回答加脚手架',
        }
      : {
          coachingFocus: '先完成文档解析，再为你整理出可推进的导学路径。',
          greeting: '正在解析文档，请稍后',
          name: '资料分析助手',
          style: '解析中',
        };
  const profile: TutorProfile = {
    bookId: input.sourceType === 'book' ? input.bookId ?? book?.id ?? null : null,
    createdAt: timestamp,
    curriculum,
    id: mockTutorState.nextProfileId,
    persona,
    sourceText:
      input.sourceText ??
      bookDetail?.catalog.summary ??
      book?.summary ??
      '这是一份用于 mock 导学体验的学习资料。',
    sourceType: input.sourceType,
    status: isUploadProfile ? 'generating' : 'ready',
    title:
      input.title?.trim() ||
      (input.sourceType === 'book' ? book?.title : resolveUploadFileName(input.sourceText)) ||
      '新建学习导师',
    updatedAt: timestamp,
  };

  mockTutorState = {
    ...mockTutorState,
    nextProfileId: mockTutorState.nextProfileId + 1,
    profiles: [profile, ...mockTutorState.profiles],
  };

  return clone(profile);
}

function ensureSessionForProfile(profileId: number) {
  const existingSession = mockTutorState.sessions.find(
    (session) => session.tutorProfileId === profileId && session.status !== 'completed'
  );

  if (existingSession) {
    return hydrateSession(existingSession);
  }

  const profile = findProfile(profileId);
  if (!profile) {
    throw new Error('tutor_profile_not_found');
  }

  const session = createSessionFromProfile(profile, {
    conversationSessionId: mockTutorState.nextConversationSessionId,
    currentStepIndex: 0,
    id: mockTutorState.nextSessionId,
    lastMessagePreview: profile.persona.greeting,
    updatedAt: nowIso(),
  });
  const welcomeMessage: TutorSessionMessage = {
    content: profile.persona.greeting,
    createdAt: session.createdAt,
    id: mockTutorState.nextMessageId,
    role: 'assistant',
    tutorSessionId: session.id,
  };

  mockTutorState = {
    ...mockTutorState,
    messagesBySessionId: {
      ...mockTutorState.messagesBySessionId,
      [session.id]: [welcomeMessage],
    },
    nextConversationSessionId: mockTutorState.nextConversationSessionId + 1,
    nextMessageId: mockTutorState.nextMessageId + 1,
    nextSessionId: mockTutorState.nextSessionId + 1,
    sessions: [session, ...mockTutorState.sessions],
  };

  return hydrateSession(session);
}

function buildStartTutorSessionResult(profileId: number): StartTutorSessionResult {
  const profile = findProfile(profileId);
  if (!profile) {
    throw new Error('tutor_profile_not_found');
  }

  const session = ensureSessionForProfile(profileId);
  const firstStep = profile.curriculum[0] ?? null;

  return {
    firstStep,
    session,
    welcomeMessage: profile.persona.greeting,
  };
}

function buildUserMessage(sessionId: number, content: string): TutorSessionMessage {
  return {
    content,
    createdAt: nowIso(),
    id: mockTutorState.nextMessageId,
    role: 'user',
    tutorSessionId: sessionId,
  };
}

function buildAssistantMessage(sessionId: number, content: string): TutorSessionMessage {
  return {
    content,
    createdAt: nowIso(),
    id: mockTutorState.nextMessageId + 1,
    role: 'assistant',
    tutorSessionId: sessionId,
  };
}

function detectStepSuccess(step: TutorCurriculumStep | null, userText: string) {
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

function buildAssistantReply(
  profile: TutorProfile,
  session: TutorSession,
  step: TutorCurriculumStep | null,
  userText: string,
  evaluation: TutorStepEvaluation
) {
  const nextStep = profile.curriculum[session.currentStepIndex + (evaluation.meetsCriteria ? 1 : 0)] ?? null;

  if (evaluation.meetsCriteria && nextStep && nextStep.id !== step?.id) {
    return `你的回答已经抓住了“${step?.title ?? '当前步骤'}”的主线。接下来我们进入“${nextStep.title}”。先想一想：${nextStep.guidingQuestion ?? '你会怎么继续往下解释？'}`;
  }

  if (evaluation.meetsCriteria) {
    return `你已经把这一步说清楚了。现在试着把整份资料压缩成 3 条复习线索，看看哪些内容最值得你下次快速回看。`;
  }

  return `先别急着找标准答案。围绕“${step?.guidingQuestion ?? '当前问题'}”，用自己的话多说一点：你觉得最关键的概念、步骤或判断依据分别是什么？`;
}

function updateSessionAfterReply(
  sessionId: number,
  profile: TutorProfile,
  userMessage: TutorSessionMessage,
  assistantMessage: TutorSessionMessage,
  evaluation: TutorStepEvaluation
) {
  const sessionIndex = mockTutorState.sessions.findIndex((item) => item.id === sessionId);
  if (sessionIndex === -1) {
    return null;
  }

  const previousSession = mockTutorState.sessions[sessionIndex];
  const nextCompletedSteps = clone(previousSession.completedSteps);
  let nextCurrentStepIndex = previousSession.currentStepIndex;
  let nextStatus = previousSession.status;

  if (
    evaluation.meetsCriteria &&
    !nextCompletedSteps.some((item) => item.stepIndex === previousSession.currentStepIndex)
  ) {
    nextCompletedSteps.push({
      completedAt: assistantMessage.createdAt,
      confidence: evaluation.confidence,
      stepIndex: previousSession.currentStepIndex,
    });
    nextCurrentStepIndex = Math.min(previousSession.currentStepIndex + 1, profile.curriculum.length);
    if (nextCurrentStepIndex >= profile.curriculum.length) {
      nextStatus = 'completed';
    }
  }

  const rawSession: TutorSession = {
    ...previousSession,
    completedSteps: nextCompletedSteps,
    completedStepsCount: nextCompletedSteps.length,
    currentStepIndex: nextCurrentStepIndex,
    currentStepTitle: profile.curriculum[nextCurrentStepIndex]?.title ?? null,
    lastMessagePreview: assistantMessage.content,
    progressLabel: resolveProgressLabel(nextCompletedSteps.length, profile.curriculum.length),
    status: nextStatus,
    updatedAt: assistantMessage.createdAt,
  };

  const nextMessages = [
    ...(mockTutorState.messagesBySessionId[sessionId] ?? []),
    userMessage,
    assistantMessage,
  ];

  mockTutorState = {
    ...mockTutorState,
    messagesBySessionId: {
      ...mockTutorState.messagesBySessionId,
      [sessionId]: nextMessages,
    },
    nextMessageId: mockTutorState.nextMessageId + 2,
    sessions: mockTutorState.sessions.map((item, index) => (index === sessionIndex ? rawSession : item)),
  };

  return hydrateSession(rawSession);
}

export async function getTutorDashboard(token?: string | null): Promise<TutorDashboard> {
  if (shouldUseTutorFrontendMock()) {
    return buildMockTutorDashboard();
  }

  return libraryRequest('/api/v1/tutor/dashboard', {
    fallback: buildMockTutorDashboard,
    method: 'GET',
    token,
  }).then((payload: any) => normalizeTutorDashboard(payload));
}

export async function listTutorProfiles(token?: string | null): Promise<TutorProfile[]> {
  if (shouldUseTutorFrontendMock()) {
    return listMockTutorProfiles();
  }

  return libraryRequest('/api/v1/tutor/profiles', {
    fallback: listMockTutorProfiles,
    method: 'GET',
    token,
  }).then((payload: any) => {
    const profiles = Array.isArray(payload?.profiles ?? payload) ? (payload?.profiles ?? payload) : [];
    return profiles.map((profile: any) => normalizeTutorProfile(profile));
  });
}

export async function getTutorProfile(profileId: number, token?: string | null): Promise<TutorProfile> {
  if (shouldUseTutorFrontendMock()) {
    return findProfile(profileId) ?? createMockTutorProfile({ sourceType: 'upload', title: '临时导师' });
  }

  return libraryRequest(`/api/v1/tutor/profiles/${profileId}`, {
    fallback: () => findProfile(profileId) ?? createMockTutorProfile({ sourceType: 'upload', title: '临时导师' }),
    method: 'GET',
    token,
  }).then((payload: any) => normalizeTutorProfile(payload?.profile ?? payload));
}

export async function createTutorProfile(
  input: CreateTutorProfileInput,
  token?: string | null
): Promise<TutorProfile> {
  if (shouldUseTutorFrontendMock()) {
    return createMockTutorProfile(input);
  }

  return libraryRequest('/api/v1/tutor/profiles', {
    body: JSON.stringify({
      ...(input.bookId ? { book_id: input.bookId } : null),
      ...(input.sourceText ? { source_text: input.sourceText } : null),
      source_type: input.sourceType,
      ...(input.teachingGoal ? { teaching_goal: input.teachingGoal } : null),
      ...(input.title ? { title: input.title } : null),
    }),
    fallback: () => createMockTutorProfile(input),
    method: 'POST',
    token,
  }).then((payload: any) => normalizeTutorProfile(payload?.profile ?? payload));
}

export async function uploadTutorProfile(formData: FormData, token?: string | null): Promise<TutorProfile> {
  if (shouldUseTutorFrontendMock()) {
    return createMockTutorProfile({
      sourceText: '来自上传资料的 mock 内容。',
      sourceType: 'upload',
      title: '上传资料导学',
    });
  }

  return libraryRequest('/api/v1/tutor/profiles/upload', {
    body: formData,
    fallback: () =>
      createMockTutorProfile({
        sourceText: '来自上传资料的 mock 内容。',
        sourceType: 'upload',
        title: '上传资料导学',
      }),
    method: 'POST',
    token,
  }).then((payload: any) => normalizeTutorProfile(payload?.profile ?? payload));
}

export async function listTutorSessions(token?: string | null): Promise<TutorSession[]> {
  if (shouldUseTutorFrontendMock()) {
    return listMockTutorSessions();
  }

  return libraryRequest('/api/v1/tutor/sessions', {
    fallback: listMockTutorSessions,
    method: 'GET',
    token,
  }).then((payload: any) => {
    const sessions = Array.isArray(payload?.sessions ?? payload) ? (payload?.sessions ?? payload) : [];
    return sessions.map((session: any) => normalizeTutorSession(session));
  });
}

export async function getTutorSession(sessionId: number, token?: string | null): Promise<TutorSession> {
  if (shouldUseTutorFrontendMock()) {
    return hydrateSession(findSession(sessionId) ?? ensureSessionForProfile(101));
  }

  return libraryRequest(`/api/v1/tutor/sessions/${sessionId}`, {
    fallback: () => hydrateSession(findSession(sessionId) ?? ensureSessionForProfile(101)),
    method: 'GET',
    token,
  }).then((payload: any) => normalizeTutorSession(payload?.session ?? payload));
}

export async function listTutorSessionMessages(
  sessionId: number,
  token?: string | null
): Promise<TutorSessionMessage[]> {
  if (shouldUseTutorFrontendMock()) {
    return listMockTutorSessionMessages(sessionId);
  }

  return libraryRequest(`/api/v1/tutor/sessions/${sessionId}/messages`, {
    fallback: () => listMockTutorSessionMessages(sessionId),
    method: 'GET',
    token,
  }).then((payload: any) => {
    const messages = Array.isArray(payload?.messages ?? payload) ? (payload?.messages ?? payload) : [];
    return messages.map((message: any) => normalizeTutorSessionMessage(message));
  });
}

export async function startTutorSession(
  profileId: number,
  token?: string | null
): Promise<StartTutorSessionResult> {
  if (shouldUseTutorFrontendMock()) {
    return buildStartTutorSessionResult(profileId);
  }

  return libraryRequest(`/api/v1/tutor/profiles/${profileId}/sessions`, {
    fallback: () => buildStartTutorSessionResult(profileId),
    method: 'POST',
    token,
  }).then((payload: any) => normalizeStartTutorSessionResult(payload));
}

export async function* streamTutorSessionReply(
  sessionId: number,
  input: { content: string }
): AsyncGenerator<TutorStreamEvent, void, void> {
  const session = findSession(sessionId);
  if (!session) {
    yield {
      message: '会话不存在，无法继续学习。',
      type: 'error',
    };
    return;
  }

  const hydratedSession = hydrateSession(session);
  const profile = findProfile(hydratedSession.tutorProfileId);
  if (!profile) {
    yield {
      message: '导师档案不存在，无法继续学习。',
      type: 'error',
    };
    return;
  }

  const currentStep = profile.curriculum[hydratedSession.currentStepIndex] ?? null;
  const userMessage = buildUserMessage(sessionId, input.content.trim());
  const detected = detectStepSuccess(currentStep, input.content);
  const evaluation: TutorStepEvaluation = {
    confidence: detected.confidence,
    meetsCriteria: detected.meetsCriteria,
    reasoning: detected.meetsCriteria
      ? '回答已经覆盖当前步骤的关键线索。'
      : '回答还偏短，可以继续补充概念、例子或判断依据。',
    stepIndex: hydratedSession.currentStepIndex,
  };
  const assistantText = buildAssistantReply(profile, hydratedSession, currentStep, input.content, evaluation);
  const assistantMessage = buildAssistantMessage(sessionId, assistantText);

  for (const chunk of assistantText.match(/.{1,14}/g) ?? [assistantText]) {
    await sleep(18);
    yield {
      delta: chunk,
      type: 'assistant.delta',
    };
  }

  const updatedSession = updateSessionAfterReply(
    sessionId,
    profile,
    userMessage,
    assistantMessage,
    evaluation
  );

  yield {
    message: assistantMessage,
    type: 'assistant.done',
  };
  yield {
    evaluation,
    type: 'evaluation',
  };
  if (updatedSession) {
    yield {
      session: updatedSession,
      type: 'session.updated',
    };
  }
}
