import { http } from '@/lib/http'
import type { AdminReturnRequest, OrderBundle, RobotEvent, RobotTask, RobotUnit } from '@/types/domain'

export async function getAdminOrders() {
  const response = await http.get<{ items: OrderBundle[] }>('/api/v1/admin/orders')
  return response.data.items
}

export async function getAdminOrder(orderId: number) {
  const response = await http.get<OrderBundle>(`/api/v1/admin/orders/${orderId}`)
  return response.data
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
  const response = await http.patch<OrderBundle>(`/api/v1/admin/orders/${orderId}/state`, payload)
  return response.data
}

export async function prioritizeAdminOrder(orderId: number, priority: string) {
  const response = await http.post<OrderBundle>(`/api/v1/admin/orders/${orderId}/priority`, { priority })
  return response.data
}

export async function interveneAdminOrder(
  orderId: number,
  payload: {
    intervention_status: string
    failure_reason?: string
  },
) {
  const response = await http.post<OrderBundle>(`/api/v1/admin/orders/${orderId}/intervene`, payload)
  return response.data
}

export async function retryAdminOrder(orderId: number, note?: string) {
  const response = await http.post<OrderBundle>(`/api/v1/admin/orders/${orderId}/retry`, note ? { note } : {})
  return response.data
}

export async function getAdminReturnRequests(params?: { borrow_order_id?: number; status?: string }) {
  const response = await http.get<{ items: AdminReturnRequest[]; total: number; page: number; page_size: number }>(
    '/api/v1/admin/return-requests',
    params,
  )
  return response.data
}

export async function receiveAdminReturnRequest(returnRequestId: number, note?: string) {
  const response = await http.post<{ return_request: AdminReturnRequest }>(
    `/api/v1/admin/return-requests/${returnRequestId}/receive`,
    note ? { note } : {},
  )
  return response.data.return_request
}

export async function completeAdminReturnRequest(
  returnRequestId: number,
  payload: {
    cabinet_id: string
    slot_code?: string
    note?: string
  },
) {
  const response = await http.post<{ return_request: AdminReturnRequest }>(
    `/api/v1/admin/return-requests/${returnRequestId}/complete`,
    payload,
  )
  return response.data.return_request
}

export async function getAdminTasks() {
  const response = await http.get<{ items: RobotTask[] }>('/api/v1/admin/tasks')
  return response.data.items
}

export async function getAdminRobots() {
  const response = await http.get<{ items: RobotUnit[] }>('/api/v1/admin/robots')
  return response.data.items
}

export async function reassignAdminTask(
  taskId: number,
  payload: {
    robot_id: number
    reason?: string
  },
) {
  const response = await http.post<{ task: RobotTask; robot: RobotUnit }>(`/api/v1/admin/tasks/${taskId}/reassign`, payload)
  return response.data
}

export async function getAdminEvents(limit = 50) {
  const response = await http.get<{ items: RobotEvent[] }>('/api/v1/admin/events', { limit })
  return response.data.items
}
