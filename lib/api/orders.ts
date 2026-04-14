import type { BorrowOrderView, ReturnRequestDetail, ReturnRequestSummary } from '@/lib/api/types';
import {
  createMockBorrowOrder,
  getMockOrder,
  listMockOrders,
  renewMockOrder,
} from '@/lib/api/mock';
import { libraryRequest } from '@/lib/api/client';
import { normalizeBookCard } from '@/lib/api/catalog';

const readerFacingStatusLabelByCode: Record<string, BorrowOrderView['statusLabel']> = {
  active: '进行中',
  cancelled: '已取消',
  completed: '已完成',
  dueSoon: '即将到期',
  manual_review: '待馆员确认',
  overdue: '已逾期',
  renewable: '可续借',
};

const readerFacingNoteByCode: Record<string, string> = {
  manual_review: '需要馆员确认后继续处理',
  overdue: '已超过应还时间，请尽快处理归还或续借。',
};

function normalizeFulfillmentPhase(raw: any): BorrowOrderView['fulfillmentPhase'] {
  const phase = raw?.fulfillmentPhase ?? raw?.fulfillment_phase ?? null;

  if (
    phase === 'dispatch_started' ||
    phase === 'in_transit' ||
    phase === 'pickup_pending' ||
    phase === 'delivered' ||
    phase === 'completed'
  ) {
    return phase;
  }

  return null;
}

function normalizeReaderOrderStatus(rawStatus: unknown): BorrowOrderView['status'] {
  switch (rawStatus) {
    case 'cancelled':
      return 'cancelled';
    case 'completed':
    case 'returned':
      return 'completed';
    case 'overdue':
      return 'overdue';
    case 'renewable':
      return 'renewable';
    case 'dueSoon':
      return 'dueSoon';
    default:
      return 'active';
  }
}

function resolveReaderStatusLabel(
  raw: any,
  normalizedStatus: BorrowOrderView['status'],
  fulfillmentPhase: BorrowOrderView['fulfillmentPhase']
): string {
  if (fulfillmentPhase === 'dispatch_started' || fulfillmentPhase === 'in_transit') {
    return '正在配送';
  }

  if (fulfillmentPhase === 'pickup_pending') {
    return '待取书';
  }

  if (fulfillmentPhase === 'delivered') {
    return '已送达';
  }

  if (fulfillmentPhase === 'completed') {
    return '已完成';
  }

  return (
    raw.statusLabel ??
    raw.status_label ??
    (typeof raw.status === 'string' ? readerFacingStatusLabelByCode[raw.status] : undefined) ??
    readerFacingStatusLabelByCode[normalizedStatus] ??
    '进行中'
  );
}

export async function listActiveOrders(token?: string | null): Promise<BorrowOrderView[]> {
  return libraryRequest('/api/v1/orders/me/active', {
    fallback: async () => listMockOrders().filter((order) => order.status !== 'completed'),
    method: 'GET',
    token,
  }).then((payload: any) => normalizeOrderList(payload));
}

export async function listOrderHistory(token?: string | null): Promise<BorrowOrderView[]> {
  return libraryRequest('/api/v1/orders/me/history', {
    fallback: async () => listMockOrders().filter((order) => order.status === 'completed'),
    method: 'GET',
    token,
  }).then((payload: any) => normalizeOrderList(payload));
}

export async function listBorrowOrders(
  filters: {
    activeOnly?: boolean;
    status?: string | null;
  } = {},
  token?: string | null
): Promise<BorrowOrderView[]> {
  const search = new URLSearchParams();
  if (filters.status) {
    search.set('status', filters.status);
  }
  if (filters.activeOnly) {
    search.set('active_only', 'true');
  }
  const suffix = search.size ? `?${search.toString()}` : '';

  return libraryRequest(`/api/v1/orders/borrow-orders${suffix}`, {
    fallback: async () => listMockOrders(),
    method: 'GET',
    token,
  }).then((payload: any) => normalizeOrderList(payload));
}

export async function getOrder(orderId: number, token?: string | null): Promise<BorrowOrderView> {
  return libraryRequest(`/api/v1/orders/borrow-orders/${orderId}`, {
    fallback: () => getMockOrder(orderId),
    method: 'GET',
    token,
  }).then((payload: any) => normalizeOrder(payload));
}

export async function createBorrowOrder(
  input: number | { bookId: number; deliveryTarget?: string; mode?: BorrowOrderView['mode'] },
  token?: string | null
): Promise<BorrowOrderView> {
  const payload = typeof input === 'number' ? { bookId: input } : input;

  return libraryRequest('/api/v1/orders/borrow-orders', {
    body: JSON.stringify({
      book_id: payload.bookId,
      delivery_target: payload.deliveryTarget,
      order_mode: payload.mode ?? 'robot_delivery',
    }),
    fallback: () => createMockBorrowOrder(payload.bookId, { deliveryTarget: payload.deliveryTarget, mode: payload.mode }),
    method: 'POST',
    token,
  }).then((payload: any) => normalizeOrder(payload));
}

export async function renewBorrowOrder(orderId: number, token?: string | null): Promise<BorrowOrderView> {
  return libraryRequest(`/api/v1/orders/borrow-orders/${orderId}/renew`, {
    fallback: () => renewMockOrder(orderId),
    method: 'POST',
    token,
  }).then((payload: any) => normalizeOrder(payload));
}

export async function createReturnRequest(orderId: number, token?: string | null) {
  return libraryRequest(`/api/v1/orders/borrow-orders/${orderId}/return-requests`, {
    body: JSON.stringify({ note: '稍后归还' }),
    fallback: async () => ({ return_request: { id: Date.now(), borrow_order_id: orderId, status: 'created' } }),
    method: 'POST',
    token,
  });
}

export async function listReturnRequests(token?: string | null): Promise<ReturnRequestSummary[]> {
  return libraryRequest('/api/v1/orders/return-requests', {
    fallback: async () => [],
    method: 'GET',
    token,
  }).then((payload: any) => normalizeReturnRequestList(payload));
}

export async function getReturnRequest(
  returnRequestId: number,
  token?: string | null
): Promise<ReturnRequestDetail> {
  return libraryRequest(`/api/v1/orders/return-requests/${returnRequestId}`, {
    fallback: async () => ({
      order: getMockOrder(returnRequestId),
      return_request: {
        borrow_order_id: returnRequestId,
        id: returnRequestId,
        status: 'created',
      },
    }),
    method: 'GET',
    token,
  }).then((payload: any) => normalizeReturnRequestDetail(payload));
}

export async function cancelBorrowOrder(orderId: number, token?: string | null): Promise<BorrowOrderView> {
  return libraryRequest(`/api/v1/orders/borrow-orders/${orderId}/cancel`, {
    fallback: () => ({
      ...getMockOrder(orderId),
      status: 'cancelled',
      statusLabel: '已取消',
      timeline: [{ completed: true, label: '已取消' }],
    }),
    method: 'POST',
    token,
  }).then((payload: any) => normalizeOrder(payload));
}

function normalizeOrderList(payload: any): BorrowOrderView[] {
  if (Array.isArray(payload?.items)) {
    return payload.items.map(normalizeOrder);
  }

  if (Array.isArray(payload)) {
    return payload.map(normalizeOrder);
  }

  return listMockOrders();
}

export function normalizeOrder(raw: any): BorrowOrderView {
  if (!raw) {
    throw new Error('order_not_found');
  }

  const rawOrder = raw.order ?? raw.borrow_order ?? raw.borrowOrder ?? raw;
  const rawBook = raw.book ?? rawOrder.book ?? raw.borrow_order?.book ?? raw.borrowOrder?.book;
  const bookId = raw.book_id ?? raw.bookId ?? rawOrder.requestedBookId ?? rawOrder.bookId ?? raw.borrow_order?.book_id ?? raw.borrowOrder?.book_id;
  const dueLabel =
    raw.dueDateLabel ??
    raw.due_date_label ??
    raw.due_at ??
    rawOrder.dueAt ??
    raw.borrow_order?.due_at ??
    raw.borrowOrder?.due_at ??
    '7 天后到期';
  const rawStatus = raw.status ?? rawOrder.status ?? raw.borrow_order?.status ?? raw.borrowOrder?.status;
  const rawNote =
    raw.note ??
    rawOrder.failureReason ??
    raw.failure_reason ??
    raw.borrow_order?.failure_reason ??
    '';
  const fulfillmentPhase = normalizeFulfillmentPhase(raw);
  const normalizedStatus = normalizeReaderOrderStatus(rawStatus);

  return {
    actionableLabel: raw.actionableLabel ?? raw.actionable_label ?? '查看借阅',
    book: rawBook ? normalizeBookCard(rawBook) : bookId ? getMockBookForOrder(bookId) : getMockBookForOrder(1),
    cancellable: raw.cancellable ?? false,
    dueDateLabel: typeof dueLabel === 'string' ? dueLabel : '7 天后到期',
    fulfillmentPhase,
    id: raw.id ?? rawOrder.id ?? raw.borrow_order?.id ?? raw.borrowOrder?.id ?? Date.now(),
    mode:
      raw.mode ??
      rawOrder.fulfillmentMode ??
      raw.order_mode ??
      raw.borrow_order?.order_mode ??
      'robot_delivery',
    note:
      typeof rawNote === 'string'
        ? readerFacingNoteByCode[rawNote] ?? rawNote
        : '',
    renewable: raw.renewable ?? rawOrder.renewable ?? raw.borrow_order?.renewable ?? false,
    returnable: raw.returnable ?? false,
    status: normalizedStatus,
    statusLabel: resolveReaderStatusLabel(raw, normalizedStatus, fulfillmentPhase),
    timeline: raw.timeline ?? raw.delivery_timeline ?? [{ completed: true, label: '已完成' }],
  };
}

function normalizeReturnRequestList(payload: any): ReturnRequestSummary[] {
  if (!Array.isArray(payload?.items)) {
    return [];
  }

  return payload.items.map(normalizeReturnRequestSummary);
}

function normalizeReturnRequestDetail(payload: any): ReturnRequestDetail {
  return {
    order: normalizeOrder(payload?.order),
    returnRequest: normalizeReturnRequestSummary(payload?.return_request ?? payload?.returnRequest ?? payload),
  };
}

function normalizeReturnRequestSummary(raw: any): ReturnRequestSummary {
  return {
    borrowOrderId: raw?.borrow_order_id ?? raw?.borrowOrderId ?? 0,
    borrowOrderStatus: raw?.borrow_order_status ?? raw?.borrowOrderStatus ?? null,
    id: raw?.id ?? 0,
    note: raw?.note ?? null,
    readerId: raw?.reader_id ?? raw?.readerId ?? null,
    status: raw?.status ?? 'created',
  };
}

function getMockBookForOrder(bookId: number) {
  return {
    id: bookId,
    author: '佚名',
    availabilityLabel: '馆藏充足 · 可立即借阅',
    cabinetLabel: '默认书柜',
    category: null,
    coverTone: 'blue' as const,
    coverUrl: null,
    deliveryAvailable: true,
    etaLabel: '可送达',
    etaMinutes: 15,
    matchedFields: ['title'],
    recommendationReason: null,
    shelfLabel: '主馆 2 楼',
    stockStatus: 'available',
    summary: '本地兜底图书卡片。',
    tags: [],
    title: `图书 ${bookId}`,
  };
}
