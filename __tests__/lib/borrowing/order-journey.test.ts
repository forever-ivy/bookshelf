import { buildBorrowOrderJourney } from '@/lib/borrowing/order-journey';

describe('buildBorrowOrderJourney', () => {
  it('maps active-like statuses into the same unified borrowing stage', () => {
    const result = buildBorrowOrderJourney({
      dueDateLabel: '4 月 9 日前归还',
      mode: 'robot_delivery',
      status: 'renewable',
      statusLabel: '可续借',
      timeline: [
        { completed: true, label: '待取书', timestamp: '2026-03-20T12:00:00.000Z' },
        { completed: true, label: '机器人配送中', timestamp: '2026-03-20T12:18:00.000Z' },
        { completed: true, label: '已送达', timestamp: '2026-03-20T12:33:00.000Z' },
      ],
    });

    expect(result.variant).toBe('timeline');
    if (result.variant !== 'timeline') {
      throw new Error('expected timeline journey');
    }

    expect(result.currentStageKey).toBe('active');
    expect(result.currentStageLabel).toBe('借阅中');
    expect(result.currentStageDescription).toContain('4 月 9 日前归还');
    expect(result.stages.map((stage) => stage.label)).toEqual([
      '下单成功',
      '馆内处理中',
      '配送 / 出书中',
      '借阅中',
      '归还完成',
    ]);
    expect(result.stages.map((stage) => stage.state)).toEqual([
      'done',
      'done',
      'done',
      'current',
      'upcoming',
    ]);
  });

  it('turns cancelled orders into a standalone exception state', () => {
    const result = buildBorrowOrderJourney({
      dueDateLabel: '无需归还',
      mode: 'cabinet_pickup',
      status: 'cancelled',
      statusLabel: '已取消',
      timeline: [{ completed: true, label: '已取消' }],
    });

    expect(result).toEqual({
      description: '该借阅订单已取消，没有进入后续借阅与归还流程。',
      label: '借阅已取消',
      tone: 'muted',
      variant: 'exception',
    });
  });

  it('marks completed orders at the return-complete stage', () => {
    const result = buildBorrowOrderJourney({
      dueDateLabel: '已完成',
      mode: 'robot_delivery',
      status: 'completed',
      statusLabel: '已完成',
      timeline: [{ completed: true, label: '已完成' }],
    });

    expect(result.variant).toBe('timeline');
    if (result.variant !== 'timeline') {
      throw new Error('expected timeline journey');
    }

    expect(result.currentStageKey).toBe('returned');
    expect(result.currentStageLabel).toBe('归还完成');
    expect(result.stages.map((stage) => stage.state)).toEqual([
      'done',
      'done',
      'done',
      'done',
      'current',
    ]);
  });

  it('keeps newly dispatched delivery orders in the fulfillment stage', () => {
    const result = buildBorrowOrderJourney({
      dueDateLabel: '4 月 9 日前归还',
      fulfillmentPhase: 'dispatch_started',
      mode: 'robot_delivery',
      status: 'active',
      statusLabel: '正在配送',
      timeline: [{ completed: true, label: '下单成功', timestamp: '2026-03-20T12:00:00.000Z' }],
    });

    expect(result.variant).toBe('timeline');
    if (result.variant !== 'timeline') {
      throw new Error('expected timeline journey');
    }

    expect(result.currentStageKey).toBe('fulfillment');
    expect(result.currentStageLabel).toBe('正在配送');
  });
});
