import type { useAppTheme } from '@/hooks/use-app-theme';

export const statusFilters = [
  { label: '全部', value: null },
  { label: '进行中', value: 'active' },
  { label: '可续借', value: 'renewable' },
  { label: '即将到期', value: 'dueSoon' },
  { label: '已完成', value: 'completed' },
  { label: '已取消', value: 'cancelled' },
] as const;

export type StatusFilterValue = (typeof statusFilters)[number]['value'];

export const borrowingTabs = [
  { key: 'borrowing', label: '借阅' },
  { key: 'favorites', label: '收藏' },
  { key: 'activity', label: '动态' },
] as const;

export type BorrowingTabKey = (typeof borrowingTabs)[number]['key'];

export type AppTheme = ReturnType<typeof useAppTheme>['theme'];

export type ActivityTimelineItem = {
  actionLabel?: string;
  category: string;
  description: string;
  id: string;
  onPress?: () => void;
  title: string;
};

export type ActivityTimelineGroup = {
  category: string;
  items: ActivityTimelineItem[];
  totalCount: number;
};
