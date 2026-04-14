import { http } from '@/lib/http'
import type {
  AdminReturnRequest,
  InventorySnapshot,
  OrderBundle,
  OrderFulfillment,
  PaginatedResponse,
  RobotEvent,
  RobotTask,
  RobotUnit,
} from '@/types/domain'

function normalizeOrder(raw: any) {
  const order = raw?.order ?? raw?.borrow_order ?? raw ?? {}
  const requestedBookId = Number(order?.requestedBookId ?? order?.requested_book_id ?? order?.book_id ?? 0)
  const fulfilledCopyId = order?.fulfilledCopyId ?? order?.fulfilled_copy_id ?? order?.assigned_copy_id ?? null
  const fulfillmentMode = order?.fulfillmentMode ?? order?.fulfillment_mode ?? order?.order_mode ?? 'robot_delivery'

  return {
    assigned_copy_id: fulfilledCopyId == null ? null : Number(fulfilledCopyId),
    attempt_count: order?.attemptCount ?? order?.attempt_count ?? null,
    book_id: requestedBookId,
    completed_at: order?.completedAt ?? order?.completed_at ?? null,
    created_at: order?.createdAt ?? order?.created_at ?? null,
    due_at: order?.dueAt ?? order?.due_at ?? null,
    failure_reason: order?.failureReason ?? order?.failure_reason ?? null,
    fulfilled_copy_id: fulfilledCopyId == null ? null : Number(fulfilledCopyId),
    fulfillment_mode: fulfillmentMode,
    id: Number(order?.id ?? 0),
    intervention_status: order?.interventionStatus ?? order?.intervention_status ?? null,
    order_mode: fulfillmentMode,
    priority: order?.priority ?? null,
    reader_id: Number(order?.readerId ?? order?.reader_id ?? 0),
    renewable: Boolean(order?.renewable ?? raw?.renewable ?? false),
    requested_book_id: requestedBookId,
    status: order?.status ?? 'created',
    updated_at: order?.updatedAt ?? order?.updated_at ?? null,
  }
}

function normalizeFulfillment(raw: any): OrderFulfillment | null {
  if (!raw) {
    return null
  }

  return {
    attempt_count: raw?.attemptCount ?? raw?.attempt_count ?? null,
    borrow_order_id: Number(raw?.orderId ?? raw?.order_id ?? raw?.borrowOrderId ?? raw?.borrow_order_id ?? 0),
    completed_at: raw?.completedAt ?? raw?.completed_at ?? null,
    created_at: raw?.createdAt ?? raw?.created_at ?? null,
    delivered_at: raw?.deliveredAt ?? raw?.delivered_at ?? null,
    delivery_target: raw?.deliveryTarget ?? raw?.delivery_target ?? '柜前自取',
    due_at: raw?.dueAt ?? raw?.due_at ?? null,
    eta_minutes: raw?.etaMinutes ?? raw?.eta_minutes ?? null,
    failure_reason: raw?.failureReason ?? raw?.failure_reason ?? null,
    id: Number(raw?.id ?? 0),
    intervention_status: raw?.interventionStatus ?? raw?.intervention_status ?? null,
    mode: raw?.mode ?? 'robot_delivery',
    order_id: Number(raw?.orderId ?? raw?.order_id ?? raw?.borrowOrderId ?? raw?.borrow_order_id ?? 0),
    picked_at: raw?.pickedAt ?? raw?.picked_at ?? null,
    priority: raw?.priority ?? null,
    source_cabinet_id: raw?.sourceCabinetId ?? raw?.source_cabinet_id ?? null,
    source_slot_id: raw?.sourceSlotId ?? raw?.source_slot_id ?? null,
    status: raw?.status ?? 'awaiting_pick',
    updated_at: raw?.updatedAt ?? raw?.updated_at ?? null,
  }
}

function normalizeRobotUnit(raw: any): RobotUnit | null {
  if (!raw) {
    return null
  }

  return {
    battery_level: raw?.batteryLevel ?? raw?.battery_level ?? null,
    code: raw?.code ?? 'robot',
    current_task: raw?.currentTask ? normalizeRobotTask(raw.currentTask) : raw?.current_task ? normalizeRobotTask(raw.current_task) : null,
    heartbeat_at: raw?.heartbeatAt ?? raw?.heartbeat_at ?? null,
    id: Number(raw?.id ?? 0),
    status: raw?.status ?? 'idle',
  }
}

function normalizeRobotTask(raw: any): RobotTask | null {
  if (!raw) {
    return null
  }

  return {
    attempt_count: raw?.attemptCount ?? raw?.attempt_count ?? null,
    borrow_order_id: raw?.orderId ?? raw?.order_id ?? raw?.borrowOrderId ?? raw?.borrow_order_id ?? null,
    completed_at: raw?.completedAt ?? raw?.completed_at ?? null,
    created_at: raw?.createdAt ?? raw?.created_at ?? null,
    delivery_order_id: raw?.deliveryOrderId ?? raw?.delivery_order_id ?? null,
    failure_reason: raw?.failureReason ?? raw?.failure_reason ?? null,
    fulfillment_id: raw?.fulfillmentId ?? raw?.fulfillment_id ?? null,
    id: Number(raw?.id ?? 0),
    is_current: raw?.isCurrent ?? raw?.is_current ?? null,
    order_id: raw?.orderId ?? raw?.order_id ?? null,
    path_json: raw?.path ?? raw?.path_json ?? null,
    reassigned_from_task_id: raw?.reassignedFromTaskId ?? raw?.reassigned_from_task_id ?? null,
    robot: raw?.robot
      ? {
          battery_level: raw.robot?.batteryLevel ?? raw.robot?.battery_level ?? null,
          code: raw.robot?.code ?? 'robot',
          current_task: null,
          heartbeat_at: raw.robot?.heartbeatAt ?? raw.robot?.heartbeat_at ?? null,
          id: Number(raw.robot?.id ?? 0),
          status: raw.robot?.status ?? 'idle',
        }
      : null,
    robot_id: Number(raw?.robotId ?? raw?.robot_id ?? 0),
    sequence_no: raw?.sequenceNo ?? raw?.sequence_no ?? null,
    status: raw?.status ?? 'assigned',
    superseded_at: raw?.supersededAt ?? raw?.superseded_at ?? null,
    superseded_by_task_id: raw?.supersededByTaskId ?? raw?.superseded_by_task_id ?? null,
    updated_at: raw?.updatedAt ?? raw?.updated_at ?? null,
  }
}

function normalizeReturnRequest(raw: any): AdminReturnRequest {
  return {
    book_id: raw?.bookId ?? raw?.book_id ?? null,
    borrow_order_id: Number(raw?.borrowOrderId ?? raw?.borrow_order_id ?? 0),
    borrow_order_status: raw?.borrowOrderStatus ?? raw?.borrow_order_status ?? null,
    condition_code: raw?.conditionCode ?? raw?.condition_code ?? null,
    copy_id: raw?.copyId ?? raw?.copy_id ?? null,
    created_at: raw?.createdAt ?? raw?.created_at ?? null,
    fulfillment_mode: raw?.fulfillmentMode ?? raw?.fulfillment_mode ?? null,
    id: Number(raw?.id ?? 0),
    note: raw?.note ?? null,
    processed_at: raw?.processedAt ?? raw?.processed_at ?? null,
    processed_by_admin_id: raw?.processedByAdminId ?? raw?.processed_by_admin_id ?? null,
    reader_id: raw?.readerId ?? raw?.reader_id ?? null,
    receive_cabinet_id: raw?.receiveCabinetId ?? raw?.receive_cabinet_id ?? null,
    receive_slot_id: raw?.receiveSlotId ?? raw?.receive_slot_id ?? null,
    received_at: raw?.receivedAt ?? raw?.received_at ?? null,
    result: raw?.result ?? null,
    status: raw?.status ?? 'created',
    updated_at: raw?.updatedAt ?? raw?.updated_at ?? null,
  }
}

function normalizeInventorySnapshot(raw: any): InventorySnapshot | null {
  if (!raw) {
    return null
  }

  return {
    cabinet_id: raw?.cabinetId ?? raw?.cabinet_id ?? null,
    copy_id: raw?.copyId ?? raw?.copy_id ?? null,
    copy_status: raw?.copyStatus ?? raw?.copy_status ?? null,
    slot_code: raw?.slotCode ?? raw?.slot_code ?? null,
    slot_id: raw?.slotId ?? raw?.slot_id ?? null,
  }
}

function normalizeOrderBundle(raw: any): OrderBundle {
  const order = normalizeOrder(raw)
  const fulfillment = normalizeFulfillment(raw?.fulfillment ?? raw?.delivery_order)
  const currentRobotTask = normalizeRobotTask(raw?.currentRobotTask ?? raw?.current_robot_task ?? raw?.robot_task)
  const robot = normalizeRobotUnit(raw?.robot ?? raw?.robot_unit)
  const robotTaskHistory = Array.isArray(raw?.robotTaskHistory ?? raw?.robot_task_history)
    ? (raw?.robotTaskHistory ?? raw?.robot_task_history).map((item: any) => normalizeRobotTask(item)).filter(Boolean)
    : currentRobotTask
      ? [currentRobotTask]
      : []

  return {
    borrow_order: order,
    current_robot_task: currentRobotTask,
    delivery_order: fulfillment,
    fulfillment,
    fulfillment_phase: raw?.fulfillmentPhase ?? raw?.fulfillment_phase ?? null,
    inventory_snapshot: normalizeInventorySnapshot(raw?.inventorySnapshot ?? raw?.inventory_snapshot),
    order,
    return_request: raw?.returnRequest || raw?.return_request ? normalizeReturnRequest(raw?.returnRequest ?? raw?.return_request) : null,
    robot,
    robot_task: currentRobotTask,
    robot_task_history: robotTaskHistory as RobotTask[],
    robot_unit: robot,
  }
}

type AdminOrdersQuery = {
  query?: string
  page?: number
  pageSize?: number
  status?: string
  priority?: string
  interventionStatus?: string
}

export async function getAdminOrders(params: AdminOrdersQuery = {}) {
  const response = await http.get<PaginatedResponse<any>>('/api/v1/admin/orders', {
    query: params.query,
    page: params.page ?? 1,
    page_size: params.pageSize ?? 20,
    status: params.status,
    priority: params.priority,
    intervention_status: params.interventionStatus,
  })
  return {
    ...response.data,
    items: (response.data.items ?? []).map((item) => normalizeOrderBundle(item)),
  }
}

export async function getAdminOrder(orderId: number) {
  const response = await http.get<any>(`/api/v1/admin/orders/${orderId}`)
  return normalizeOrderBundle(response.data)
}

export async function patchAdminOrderState(
  orderId: number,
  payload: {
    borrow_status?: string
    delivery_status?: string
    task_status?: string
    robot_status?: string
  },
) {
  const response = await http.patch<any>(`/api/v1/admin/orders/${orderId}/state`, payload)
  return normalizeOrderBundle(response.data)
}

export async function prioritizeAdminOrder(orderId: number, priority: string) {
  const response = await http.post<any>(`/api/v1/admin/orders/${orderId}/priority`, { priority })
  return normalizeOrderBundle(response.data)
}

export async function interveneAdminOrder(
  orderId: number,
  payload: {
    intervention_status: string
    failure_reason?: string
  },
) {
  const response = await http.post<any>(`/api/v1/admin/orders/${orderId}/intervene`, payload)
  return normalizeOrderBundle(response.data)
}

export async function retryAdminOrder(orderId: number, note?: string) {
  const response = await http.post<any>(`/api/v1/admin/orders/${orderId}/retry`, note ? { note } : {})
  return normalizeOrderBundle(response.data)
}

export async function getAdminReturnRequests(params?: { borrow_order_id?: number; status?: string }) {
  const response = await http.get<{ items: any[]; total: number; page: number; page_size: number }>(
    '/api/v1/admin/return-requests',
    params,
  )
  return {
    ...response.data,
    items: (response.data.items ?? []).map((item) => normalizeReturnRequest(item)),
  }
}

export async function receiveAdminReturnRequest(returnRequestId: number, note?: string) {
  const response = await http.post<{ return_request: any }>(
    `/api/v1/admin/return-requests/${returnRequestId}/receive`,
    note ? { note } : {},
  )
  return normalizeReturnRequest(response.data.return_request)
}

export async function completeAdminReturnRequest(
  returnRequestId: number,
  payload: {
    cabinet_id: string
    slot_code?: string
    note?: string
  },
) {
  const response = await http.post<{ return_request: any }>(
    `/api/v1/admin/return-requests/${returnRequestId}/complete`,
    payload,
  )
  return normalizeReturnRequest(response.data.return_request)
}

export async function getAdminTasks() {
  const response = await http.get<{ items: any[] }>('/api/v1/admin/tasks')
  return (response.data.items ?? []).map((item) => normalizeRobotTask(item)).filter(Boolean) as RobotTask[]
}

export async function getAdminRobots() {
  const response = await http.get<{ items: any[] }>('/api/v1/admin/robots')
  return (response.data.items ?? []).map((item) => normalizeRobotUnit(item)).filter(Boolean) as RobotUnit[]
}

export async function reassignAdminTask(
  taskId: number,
  payload: {
    robot_id: number
    reason?: string
  },
) {
  const response = await http.post<{ task: any; robot: any }>(`/api/v1/admin/tasks/${taskId}/reassign`, payload)
  return {
    robot: normalizeRobotUnit(response.data.robot),
    task: normalizeRobotTask(response.data.task),
  }
}

export async function getAdminEvents(limit = 50) {
  const response = await http.get<{ items: RobotEvent[] }>('/api/v1/admin/events', { limit })
  return response.data.items
}
