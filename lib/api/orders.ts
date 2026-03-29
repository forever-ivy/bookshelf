import type { BorrowOrderView } from '@/lib/api/types';
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
      delivery_target: payload.deliveryTarget ?? '阅览室座位',
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

function normalizeOrderList(payload: any): BorrowOrderView[] {
  if (Array.isArray(payload?.items)) {
    return payload.items.map(normalizeOrder);
  }

  if (Array.isArray(payload)) {
    return payload.map(normalizeOrder);
  }

  return listMockOrders();
}

function normalizeOrder(raw: any): BorrowOrderView {
  if (!raw) {
    throw new Error('order_not_found');
  }

  const bookId = raw.book_id ?? raw.bookId ?? raw.borrow_order?.book_id ?? raw.borrowOrder?.book_id;
  const dueLabel = raw.dueDateLabel ?? raw.due_date_label ?? raw.due_at ?? raw.borrow_order?.due_at ?? '7 天后到期';
  const rawStatus = raw.status;
  const rawNote = raw.note ?? raw.failure_reason ?? raw.borrow_order?.failure_reason ?? '';
  return {
    actionableLabel: raw.actionableLabel ?? raw.actionable_label ?? '查看借阅',
    book: raw.book ? normalizeBookCard(raw.book) : bookId ? getMockBookForOrder(bookId) : getMockBookForOrder(1),
    dueDateLabel: typeof dueLabel === 'string' ? dueLabel : '7 天后到期',
    id: raw.id ?? raw.borrow_order?.id ?? raw.borrowOrder?.id ?? Date.now(),
    mode: raw.mode ?? raw.order_mode ?? raw.borrow_order?.order_mode ?? 'robot_delivery',
    note:
      typeof rawNote === 'string'
        ? readerFacingNoteByCode[rawNote] ?? rawNote
        : '',
    renewable: raw.renewable ?? raw.borrow_order?.renewable ?? false,
    status:
      rawStatus === 'completed'
        ? 'completed'
        : rawStatus === 'overdue'
          ? 'overdue'
          : rawStatus === 'renewable'
            ? 'renewable'
            : rawStatus === 'dueSoon'
              ? 'dueSoon'
              : 'active',
    statusLabel:
      raw.statusLabel ??
      raw.status_label ??
      (typeof rawStatus === 'string' ? readerFacingStatusLabelByCode[rawStatus] : undefined) ??
      '进行中',
    timeline: raw.timeline ?? raw.delivery_timeline ?? [{ completed: true, label: '已完成' }],
  };
}

function getMockBookForOrder(bookId: number) {
  return {
    id: bookId,
    author: '未知作者',
    availabilityLabel: '馆藏充足 · 可立即借阅',
    cabinetLabel: '默认书柜',
    coverTone: 'blue' as const,
    coverUrl: null,
    deliveryAvailable: true,
    etaLabel: '15 分钟可送达',
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
