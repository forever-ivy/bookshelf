export type SearchFilter = 'all' | 'ready' | `category:${string}`;

export const borrowNowSearchFilters = [{ key: 'ready' as const, label: '只看可借可送' }];

function isImmediatelyBorrowableResult(item: {
  availabilityLabel?: string | null;
  stockStatus?: string | null;
}) {
  return item.stockStatus === 'available' || Boolean(item.availabilityLabel?.includes('可立即借阅'));
}

function supportsDeliveryResult(item: {
  deliveryAvailable?: boolean | null;
  etaLabel?: string | null;
}) {
  return item.deliveryAvailable === true || Boolean(item.etaLabel?.includes('可送达'));
}

export function isBorrowReadyResult(item: {
  availabilityLabel?: string | null;
  deliveryAvailable?: boolean | null;
  etaLabel?: string | null;
  stockStatus?: string | null;
}) {
  return isImmediatelyBorrowableResult(item) && supportsDeliveryResult(item);
}
