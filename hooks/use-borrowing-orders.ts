import React from 'react';

import type { BorrowOrderView } from '@/lib/api/types';
import type { StatusFilterValue } from '@/lib/borrowing/types';
import { isActiveOrderStatus } from '@/lib/borrowing/helpers';
import {
  useBorrowOrdersQuery,
  useMyOrdersQuery,
} from '@/hooks/use-library-app-data';

export function useBorrowingOrders() {
  const [statusFilter, setStatusFilter] = React.useState<StatusFilterValue>('active');
  const allOrdersQuery = useBorrowOrdersQuery();
  const myOrdersQuery = useMyOrdersQuery();

  const canonicalOrders: BorrowOrderView[] = myOrdersQuery.data ?? allOrdersQuery.data ?? [];

  const allActiveOrders = canonicalOrders.filter((item) => isActiveOrderStatus(item.status));
  const dueSoonOrders = allActiveOrders.filter((item) => item.status === 'dueSoon' || item.status === 'overdue');
  const renewableOrders = allActiveOrders.filter((item) => item.renewable);

  const visibleOrders = canonicalOrders.filter((item) => {
    if (!statusFilter) return true;
    if (statusFilter === 'active') return isActiveOrderStatus(item.status);
    if (statusFilter === 'dueSoon') return item.status === 'dueSoon' || item.status === 'overdue';
    return item.status === statusFilter;
  });

  const isBorrowingLoading =
    (!myOrdersQuery.data && Boolean(myOrdersQuery.isFetching)) ||
    (!allOrdersQuery.data && Boolean(allOrdersQuery.isFetching));

  const borrowingError = myOrdersQuery.error ?? allOrdersQuery.error;

  return {
    allActiveOrders,
    borrowingError,
    canonicalOrders,
    dueSoonOrders,
    isBorrowingLoading,
    renewableOrders,
    setStatusFilter,
    statusFilter,
    visibleOrders,
  };
}
