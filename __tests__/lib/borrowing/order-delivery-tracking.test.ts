import { buildMockDeliveryTracking } from '@/lib/borrowing/order-delivery-tracking';

describe('buildMockDeliveryTracking', () => {
  it('builds an in-transit tracking state for robot-delivery orders', () => {
    const result = buildMockDeliveryTracking({
      dueDateLabel: '4 月 9 日前归还',
      fulfillmentPhase: 'in_transit',
      id: 201,
      mode: 'robot_delivery',
      note: '机器人正在前往阅览区',
      status: 'active',
      statusLabel: '正在配送',
      timeline: [{ completed: true, label: '机器人配送中', timestamp: '2026-03-20T12:18:00.000Z' }],
    });

    expect(result).not.toBeNull();
    expect(result?.state).toBe('inTransit');
    expect(result?.title).toBe('机器人正在送书中');
    expect(result?.distanceLabel).toBe('420 m');
    expect(result?.etaLabel).toBe('约 6 分钟');
    expect(result?.progress).toBeCloseTo(0.58);
  });

  it('collapses delivered robot-delivery orders into an arrival state', () => {
    const result = buildMockDeliveryTracking({
      dueDateLabel: '4 月 9 日前归还',
      fulfillmentPhase: 'delivered',
      id: 202,
      mode: 'robot_delivery',
      note: '已送达阅览室',
      status: 'renewable',
      statusLabel: '可续借',
      timeline: [{ completed: true, label: '已送达', timestamp: '2026-03-20T12:33:00.000Z' }],
    });

    expect(result).not.toBeNull();
    expect(result?.state).toBe('delivered');
    expect(result?.title).toBe('图书已送达');
    expect(result?.distanceLabel).toBe('0 m');
    expect(result?.etaLabel).toBe('刚刚送达');
    expect(result?.progress).toBe(1);
  });

  it('returns null for cabinet pickup orders', () => {
    const result = buildMockDeliveryTracking({
      dueDateLabel: '4 月 9 日前归还',
      fulfillmentPhase: 'pickup_pending',
      id: 203,
      mode: 'cabinet_pickup',
      note: '请前往书柜取书',
      status: 'active',
      statusLabel: '待取书',
      timeline: [{ completed: true, label: '待取书', timestamp: '2026-03-20T12:18:00.000Z' }],
    });

    expect(result).toBeNull();
  });
});
