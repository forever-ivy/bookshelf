import { describeReturnRequestStatus } from '@/lib/borrowing/return-request-status';

describe('describeReturnRequestStatus', () => {
  it('maps created requests into reader-facing copy', () => {
    expect(describeReturnRequestStatus('created')).toEqual({
      description: '馆内已收到你的归还申请，接下来会安排确认与入库处理。',
      label: '已发起归还请求',
      tone: 'warning',
    });
  });

  it('falls back gracefully for unknown statuses', () => {
    expect(describeReturnRequestStatus('mystery_state')).toEqual({
      description: '当前归还请求正在处理中，请稍后查看最新进展。',
      label: '处理中',
      tone: 'neutral',
    });
  });
});
