import type { AppTheme, StatusFilterValue } from './types';

const READING_EVENT_LABELS: Record<string, string> = {
  borrow: '借阅记录已同步',
  borrow_order_created: '已创建借阅订单',
  borrow_order_renewed: '借阅已续借',
  browse: '浏览记录已同步',
  reading_session: '阅读记录已同步',
  recommend: '推荐记录已同步',
  return: '归还记录已同步',
  return_request_created: '已发起归还请求',
};

export function isActiveOrderStatus(status: string) {
  return ['active', 'dueSoon', 'overdue', 'renewable'].includes(status);
}

export function resolveBorrowingFilterPalette(theme: AppTheme, value: StatusFilterValue) {
  switch (value) {
    case 'renewable':
      return {
        backgroundColor: theme.colors.successSoft,
        color: theme.colors.success,
      };
    case 'dueSoon':
      return {
        backgroundColor: theme.colors.warningSoft,
        color: theme.colors.warning,
      };
    case 'completed':
      return {
        backgroundColor: theme.colors.primarySoft,
        color: theme.colors.primaryStrong,
      };
    case 'cancelled':
      return {
        backgroundColor: theme.colors.surfaceMuted,
        color: theme.colors.textSoft,
      };
    case 'active':
      return {
        backgroundColor: theme.colors.availabilityPickupSoft,
        color: theme.colors.availabilityPickup,
      };
    default:
      return {
        backgroundColor: theme.colors.accentLavender,
        color: theme.colors.primaryStrong,
      };
  }
}

export function describeReadingEvent(event: Record<string, unknown>) {
  const metadata = event.metadata_json;
  if (metadata && typeof metadata === 'object') {
    const title = (metadata as Record<string, unknown>).title;
    if (typeof title === 'string' && title.trim()) {
      return title;
    }
  }

  const eventType = event.event_type;
  if (typeof eventType === 'string' && eventType.trim()) {
    return READING_EVENT_LABELS[eventType] ?? '最近有新的学习记录';
  }

  return '最近有新的学习记录';
}
