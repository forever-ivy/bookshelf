import { describeReadingEvent } from '@/lib/borrowing/helpers';

describe('borrowing helpers', () => {
  it.each([
    ['borrow_order_renewed', '借阅已续借'],
    ['return_request_created', '已发起归还请求'],
  ])('maps %s to a localized reading event label', (eventType, expected) => {
    expect(
      describeReadingEvent({
        event_type: eventType,
      })
    ).toBe(expected);
  });

  it('prefers the metadata title when it is available', () => {
    expect(
      describeReadingEvent({
        event_type: 'borrow_order_renewed',
        metadata_json: { title: '晚间阅读 45 分钟' },
      })
    ).toBe('晚间阅读 45 分钟');
  });
});
