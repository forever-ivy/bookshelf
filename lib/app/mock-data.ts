export const homeHero = {
  chips: ['今晚待开始', '1 单配送中', '2 条学习记录'],
  eyebrow: 'Tonight',
  meta: '阅读工作区',
  primaryCta: '继续学习',
  secondaryCta: '去找书',
  subtitle:
    '先找到能借到的书，再继续你今晚最该开始的一章，把借阅、配送和学习记录收在同一页里。',
  title: '今晚路径',
} as const;

export const homeLearningFocus = {
  action: '继续学习',
  bullets: [
    '先从《机器学习从零到一》开始，可直接配送到阅览室 A-12',
    '继续上次的第 2 章总结和 5 道练习题',
    '预计 35 分钟可以完成一轮预习',
  ],
  summary: '把今晚要处理的书、配送和 AI 学习动作排成一条最短路径。',
  title: '快速开始',
} as const;

export const homeShelves = [
  {
    items: [
      {
        coverTone: 'blue',
        description: '把考试高频章节、讲义配套读物和历年热门借阅放到一起。',
        kicker: '48 小时热门',
        title: '高数复习提分书单',
      },
      {
        coverTone: 'mint',
        description: '适合先建立框架，再逐步补足研究方法和案例。',
        kicker: '本院热门',
        title: '心理学导论与研究方法',
      },
    ],
    title: '今晚先看的两组推荐',
  },
  {
    items: [
      {
        coverTone: 'apricot',
        description: '适合配合 AI 做章节拆解、概念解释和例题练习。',
        kicker: '期末专区',
        title: '机器学习从零到一',
      },
      {
        coverTone: 'lavender',
        description: '从选题、检索到论证表达，适合写作前先建立路径感。',
        kicker: '论文写作',
        title: '学术表达与信息检索',
      },
    ],
    title: '考试与专题',
  },
] as const;

export const searchFilters = ['可立即借阅', '支持配送', '课程配套', '解释推荐'] as const;

export const searchResults = [
  {
    availability: '馆藏充足 · 可立即借阅',
    author: '周志华',
    coverTone: 'lavender',
    eta: '可送达',
    location: '智能书柜 A-03',
    reason: '与你本周的课程和 AI 学习记录最相关',
    title: '机器学习',
  },
  {
    availability: '剩余 2 本 · 可到柜自取',
    author: 'Ian Goodfellow',
    coverTone: 'blue',
    eta: '到柜自取',
    location: '主馆 2 楼 · 计算机书区',
    reason: '适合先读第 1、2 章，再接 AI 总结',
    title: 'Deep Learning',
  },
  {
    availability: '可调度库存 · 支持预约',
    author: 'Christopher Bishop',
    coverTone: 'mint',
    eta: '可送达',
    location: '共享馆藏 · 南区仓储',
    reason: '如果你要补概率图模型，这本更系统',
    title: 'Pattern Recognition and Machine Learning',
  },
] as const;

export const searchCollections = [
  {
    detail: '优先显示能借到、能送到的书',
    title: '结果排序',
  },
  {
    detail: '把推荐原因直接放进结果行',
    title: '推荐解释',
  },
  {
    detail: '库存、位置和履约方式同一眼看完',
    title: '履约信息',
  },
] as const;

export const borrowingSummary = {
  dueSoonCount: 2,
  focus: '时间简史 · 今天 21:00',
  headline: '借阅任务面板',
  renewableCount: 3,
  subtitle: '先处理会影响今晚学习节奏的事项，再回到阅读本身。',
  totalCount: 6,
} as const;

export const currentBorrowings = [
  {
    actionLabel: '去续借',
    author: 'Ian Goodfellow',
    coverTone: 'blue',
    dueDate: '3 月 29 日',
    note: '配套课程：人工智能导论 · AI 可生成章节摘要',
    status: 'renewable',
    title: 'Deep Learning',
  },
  {
    actionLabel: '查看借阅',
    author: '周志华',
    coverTone: 'lavender',
    dueDate: '4 月 2 日',
    note: '配套课程：机器学习基础 · 适合先看第 3 章',
    status: 'active',
    title: '机器学习',
  },
  {
    actionLabel: '继续阅读',
    author: 'Daniel Kahneman',
    coverTone: 'apricot',
    dueDate: '4 月 5 日',
    note: '兴趣阅读 · 系统建议你补看第 1 章和第 4 章',
    status: 'active',
    title: '思考，快与慢',
  },
] as const;

export const dueSoonBorrowings = [
  {
    actionLabel: '立即续借',
    author: 'Richard Rumelt',
    coverTone: 'mint',
    dueDate: '明天 18:00',
    note: '建议先判断是否继续用于战略管理课程复习',
    status: 'dueSoon',
    title: '好战略，坏战略',
  },
  {
    actionLabel: '处理归还',
    author: 'Stephen Hawking',
    coverTone: 'coral',
    dueDate: '今天 21:00',
    note: '如果今晚不再使用，可直接发起归还请求',
    status: 'overdue',
    title: '时间简史',
  },
] as const;

export const borrowingHistory = [
  {
    meta: '产品设计 · 已归还',
    title: '设计中的设计',
  },
  {
    meta: '表达写作 · 已归还',
    title: '金字塔原理',
  },
  {
    meta: '社会心理 · 已归还',
    title: '乌合之众',
  },
  {
    meta: '人物传记 · 已归还',
    title: '苏东坡传',
  },
] as const;

export const meSummary = {
  aiUsage: '本周 AI 学习 4 次',
  campus: '信息与电气工程学院 · 2023 级',
  interests: ['AI', '心理学', '产品设计'],
  name: '陈知行',
  role: '学生用户',
  streak: '连续学习 9 天',
} as const;

export const meFocus = [
  {
    description: '时间简史 · 今天 21:00',
    title: '1 条借阅提醒',
  },
  {
    description: '2 条待继续',
    title: '2 条 AI 学习记录',
  },
] as const;

export const collectionPreview = [
  { count: '12 本', detail: '收藏与书单', title: '待挑选' },
  { count: '04 条', detail: '通知中心', title: '待查看' },
  { count: '02 单', detail: '配送记录', title: '进行中' },
] as const;

export const meMenus = [
  {
    description: '管理收藏图书、自建书单和课程配套书单',
    icon: 'bookmark',
    title: '收藏与书单',
  },
  {
    description: '查看到期提醒、配送消息和 AI 学习结果更新',
    icon: 'bell',
    title: '通知中心',
  },
  {
    description: '发起还书请求，查看归还与整理记录和取回状态',
    icon: 'package',
    title: '归还与整理请求',
  },
  {
    description: '进入阅读画像、学习偏好线索和成就中心',
    icon: 'profile',
    title: '个人中心',
  },
  {
    description: '查看块状高亮、底部下划线、颜色预设和自定义颜色',
    icon: 'spark',
    title: '文字高亮示例',
  },
] as const;

export const profilePortrait = {
  headline: '阅读与学习画像',
  keywords: ['结构化学习', '课本导读', '考试效率', '知识串联'],
  learningSignals: [
    '更偏好先看章节框架，再进入细节与例题',
    '课程相关图书的借阅完成率高于兴趣阅读',
    '最常使用的 AI 能力是概念拆解与举例说明',
  ],
  rhythm: [
    '本周完成 2 次章节预习',
    'AI 总结 6 次，最常追问“请再举一个例子”',
    '借阅与复习集中在晚间 19:00 - 22:00',
  ],
  subtitle:
    '你更适合从框架入手，再逐层进入细节。借阅和 AI 辅助通常发生在同一段学习时间里。',
} as const;

export const interestTags = [
  '人工智能',
  '课本精读',
  '考试复习',
  '认知心理',
  '产品设计',
  '表达写作',
] as const;

export const achievementStrip = [
  { label: '累计借阅', value: '28 本' },
  { label: 'AI 辅助', value: '14 次' },
  { label: '活跃天数', value: '7 天' },
  { label: '积分', value: '860' },
] as const;
