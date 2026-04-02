import type { BorrowOrderView, DeliveryStatusTimeline } from '@/lib/api/types';

type UnifiedStageKey = 'requested' | 'processing' | 'fulfillment' | 'active' | 'returned';
type JourneyTone = 'danger' | 'muted' | 'neutral' | 'success' | 'warning';

export type UnifiedJourneyStage = {
  key: UnifiedStageKey;
  label: string;
  state: 'current' | 'done' | 'upcoming';
  timestamp?: string | null;
};

export type UnifiedTimelineJourney = {
  currentStageDescription: string;
  currentStageKey: UnifiedStageKey;
  currentStageLabel: string;
  stages: UnifiedJourneyStage[];
  tone: JourneyTone;
  variant: 'timeline';
};

export type UnifiedExceptionJourney = {
  description: string;
  label: string;
  tone: JourneyTone;
  variant: 'exception';
};

export type BorrowOrderJourney = UnifiedExceptionJourney | UnifiedTimelineJourney;

type JourneyInput = Pick<
  BorrowOrderView,
  'dueDateLabel' | 'mode' | 'status' | 'statusLabel' | 'timeline'
>;

const unifiedStageLabels: Record<UnifiedStageKey, string> = {
  active: '借阅中',
  fulfillment: '配送 / 出书中',
  processing: '馆内处理中',
  requested: '下单成功',
  returned: '归还完成',
};

const stageOrder: UnifiedStageKey[] = ['requested', 'processing', 'fulfillment', 'active', 'returned'];

const timelineTimestampMatchers: Record<UnifiedStageKey, string[]> = {
  active: ['已送达', '借阅中', '已取书', '待归还'],
  fulfillment: ['配送中', '机器人配送中', '书柜出书中', '出书中'],
  processing: ['待取书', '馆内处理中', '馆内处理', '待馆员确认', '处理中'],
  requested: ['下单成功', '已下单', '订单创建'],
  returned: ['已完成', '已归还', '归还完成'],
};

export function buildBorrowOrderJourney(input: JourneyInput): BorrowOrderJourney {
  if (input.status === 'cancelled') {
    return {
      description: '该借阅订单已取消，没有进入后续借阅与归还流程。',
      label: '借阅已取消',
      tone: 'muted',
      variant: 'exception',
    };
  }

  const currentStageKey = getCurrentStageKey(input.status);
  const currentStageLabel = unifiedStageLabels[currentStageKey];
  const stageTimestamps = mapStageTimestamps(input.timeline);
  const tone = getJourneyTone(input.status);
  const currentStageIndex = stageOrder.indexOf(currentStageKey);

  return {
    currentStageDescription: getCurrentStageDescription(input, currentStageKey),
    currentStageKey,
    currentStageLabel,
    stages: stageOrder.map((key, index) => ({
      key,
      label: unifiedStageLabels[key],
      state: index < currentStageIndex ? 'done' : index === currentStageIndex ? 'current' : 'upcoming',
      timestamp: stageTimestamps[key] ?? null,
    })),
    tone,
    variant: 'timeline',
  };
}

function getCurrentStageKey(status: BorrowOrderView['status']): UnifiedStageKey {
  if (status === 'completed') {
    return 'returned';
  }

  return 'active';
}

function getJourneyTone(status: BorrowOrderView['status']): JourneyTone {
  switch (status) {
    case 'renewable':
      return 'success';
    case 'dueSoon':
      return 'warning';
    case 'overdue':
      return 'danger';
    case 'completed':
      return 'success';
    default:
      return 'neutral';
  }
}

function getCurrentStageDescription(input: JourneyInput, key: UnifiedStageKey) {
  if (key === 'returned') {
    return '本次借阅流程已完成，图书已归还入库。';
  }

  switch (input.status) {
    case 'renewable':
      return `图书已进入借阅阶段，${input.dueDateLabel}，如需继续使用可直接续借。`;
    case 'dueSoon':
      return `图书已进入借阅阶段，${input.dueDateLabel}，建议尽快续借或发起归还。`;
    case 'overdue':
      return `图书仍处于借阅阶段，${input.dueDateLabel}，已经超过应还时间，请尽快处理。`;
    default:
      return `图书已进入借阅阶段，${input.dueDateLabel}。`;
  }
}

function mapStageTimestamps(timeline: DeliveryStatusTimeline) {
  const timestamps: Partial<Record<UnifiedStageKey, string | null>> = {};

  for (const item of timeline) {
    const matchedStage = stageOrder.find((stage) =>
      timelineTimestampMatchers[stage].some((pattern) => item.label.includes(pattern))
    );

    if (matchedStage && !timestamps[matchedStage]) {
      timestamps[matchedStage] = item.timestamp ?? null;
    }
  }

  return timestamps;
}
