import { useRouter } from 'expo-router';

import type { BorrowOrderView } from '@/lib/api/types';
import type { ActivityTimelineGroup, ActivityTimelineItem } from '@/lib/borrowing/types';
import { describeReadingEvent } from '@/lib/borrowing/helpers';
import {
  useMyOverviewQuery,
  useOrderHistoryQuery,
  useReturnRequestsQuery,
} from '@/hooks/use-library-app-data';

const CATEGORY_ORDER = ['配送进展', '归还流程', '学习记录', '历史借阅'];

type UseActivityTimelineParams = {
  allActiveOrders: BorrowOrderView[];
  canonicalOrders: BorrowOrderView[];
};

export function useActivityTimeline({ allActiveOrders, canonicalOrders }: UseActivityTimelineParams) {
  const router = useRouter();
  const historyQuery = useOrderHistoryQuery();
  const overviewQuery = useMyOverviewQuery();
  const returnRequestsQuery = useReturnRequestsQuery();

  const overview = overviewQuery.data;
  const returnRequests = returnRequestsQuery.data ?? [];
  const historyOrders =
    historyQuery.data?.length
      ? historyQuery.data
      : canonicalOrders.filter((item) => item.status === 'completed' || item.status === 'cancelled');

  const isDynamicLoading =
    (!overviewQuery.data && Boolean(overviewQuery.isFetching)) ||
    (!historyQuery.data && Boolean(historyQuery.isFetching)) ||
    (!returnRequestsQuery.data && Boolean(returnRequestsQuery.isFetching));

  const allItems: ActivityTimelineItem[] = [
    ...allActiveOrders.map((order) => ({
      actionLabel: '查看状态',
      category: '配送进展',
      description: `${order.statusLabel} · ${order.mode === 'robot_delivery' ? '配送中 / 待送达' : '到柜自取'}`,
      id: `delivery-${order.id}`,
      onPress: () => router.push(`/orders/${order.id}`),
      title: order.book.title,
    })),
    ...returnRequests.map((item) => ({
      actionLabel: '查看详情',
      category: '归还流程',
      description: item.note ?? item.borrowOrderStatus ?? '归还申请已提交，等待馆内处理。',
      id: `return-${item.id}`,
      onPress: () => router.push(`/returns/${item.id}`),
      title: `归还请求 #${item.id}`,
    })),
    ...(overview?.recentReadingEvents ?? []).map((item, index) => ({
      category: '学习记录',
      description: '这条记录来自你的最近学习行为同步。',
      id: `reading-${String(item.id ?? index)}`,
      title: describeReadingEvent(item),
    })),
    ...historyOrders.slice(0, 4).map((item) => ({
      actionLabel: '查看详情',
      category: '历史借阅',
      description: `${item.statusLabel} · ${item.dueDateLabel}`,
      id: `history-${item.id}`,
      onPress: () => router.push(`/orders/${item.id}`),
      title: item.book.title,
    })),
  ];

  const groupMap = new Map<string, ActivityTimelineItem[]>();
  for (const item of allItems) {
    const list = groupMap.get(item.category);
    if (list) {
      list.push(item);
    } else {
      groupMap.set(item.category, [item]);
    }
  }

  const activityGroups: ActivityTimelineGroup[] = CATEGORY_ORDER
    .filter((cat) => groupMap.has(cat))
    .map((cat) => {
      const items = groupMap.get(cat)!;
      return {
        category: cat,
        items,
        totalCount: items.length,
      };
    });

  return {
    activityGroups,
    isDynamicLoading,
  };
}
