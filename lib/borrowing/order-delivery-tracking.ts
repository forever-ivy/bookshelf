import type { BorrowOrderView } from '@/lib/api/types';

type MockTrackingState = 'arriving' | 'delivered' | 'inTransit';

export type MockDeliveryTracking = {
  description: string;
  destinationLabel: string;
  distanceLabel: string;
  distanceMeters: number;
  etaLabel: string;
  etaMinutes: number;
  progress: number;
  routeLabel: string;
  state: MockTrackingState;
  title: string;
  vehicleLabel: string;
};

type TrackingInput = Pick<
  BorrowOrderView,
  'dueDateLabel' | 'fulfillmentPhase' | 'id' | 'mode' | 'note' | 'status' | 'statusLabel' | 'timeline'
>;

const trackingPresets: Array<{
  description: string;
  distanceMeters: number;
  etaMinutes: number;
  progress: number;
  state: Extract<MockTrackingState, 'arriving' | 'inTransit'>;
  title: string;
}> = [
  {
    description: '机器人已从馆藏区出发，正在穿过主馆连廊。',
    distanceMeters: 860,
    etaMinutes: 12,
    progress: 0.24,
    state: 'inTransit',
    title: '机器人正在送书中',
  },
  {
    description: '机器人已经进入你所在楼层，正在继续靠近目的地。',
    distanceMeters: 420,
    etaMinutes: 6,
    progress: 0.58,
    state: 'inTransit',
    title: '机器人正在送书中',
  },
  {
    description: '机器人已经到达你所在区域，马上把图书送到你面前。',
    distanceMeters: 120,
    etaMinutes: 2,
    progress: 0.82,
    state: 'arriving',
    title: '机器人即将送达',
  },
];

export function buildMockDeliveryTracking(input: TrackingInput): MockDeliveryTracking | null {
  if (input.mode !== 'robot_delivery' || input.status === 'cancelled') {
    return null;
  }

  const routeLabel = input.note.trim() || '已从主馆配送站出发，正前往你的阅读位。';

  if (isDelivered(input)) {
    return {
      description: '图书已经送达目的地，你可以直接开始阅读。',
      destinationLabel: '我的位置',
      distanceLabel: '0 m',
      distanceMeters: 0,
      etaLabel: '刚刚送达',
      etaMinutes: 0,
      progress: 1,
      routeLabel,
      state: 'delivered',
      title: '图书已送达',
      vehicleLabel: '机器人',
    };
  }

  const preset = trackingPresets[(input.id + 1) % trackingPresets.length];

  return {
    description: preset.description,
    destinationLabel: '我的位置',
    distanceLabel: `${preset.distanceMeters} m`,
    distanceMeters: preset.distanceMeters,
    etaLabel: `约 ${preset.etaMinutes} 分钟`,
    etaMinutes: preset.etaMinutes,
    progress: preset.progress,
    routeLabel,
    state: preset.state,
    title: preset.title,
    vehicleLabel: '送书小车',
  };
}

function isDelivered(input: TrackingInput) {
  if (input.fulfillmentPhase === 'delivered' || input.fulfillmentPhase === 'completed') {
    return true;
  }

  if (input.status === 'renewable' || input.status === 'dueSoon' || input.status === 'overdue' || input.status === 'completed') {
    return true;
  }

  if (input.statusLabel.includes('已送达') || input.statusLabel.includes('可续借')) {
    return true;
  }

  return input.timeline.some((item) => item.label.includes('已送达'));
}
