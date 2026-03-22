import { http } from '@/lib/http'
import type { OrderBundle, RobotEvent, RobotTask, RobotUnit } from '@/types/domain'

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

export async function getAdminTasks() {
  const response = await http.get<{ items: RobotTask[] }>('/api/v1/admin/tasks')
  return response.data.items
}

export async function getAdminRobots() {
  const response = await http.get<{ items: RobotUnit[] }>('/api/v1/admin/robots')
  return response.data.items
}

export async function getAdminEvents(limit = 50) {
  const response = await http.get<{ items: RobotEvent[] }>('/api/v1/admin/events', { limit })
  return response.data.items
}
