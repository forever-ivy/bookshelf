import { http } from '@/lib/http'
import type { InventoryEvent, InventorySlot, InventoryStatus, OcrIngestResult } from '@/types/domain'

export async function getInventoryStatus() {
  const response = await http.get<InventoryStatus>('/api/v1/inventory/status')
  return response.data
}

export async function getInventorySlots() {
  const response = await http.get<{ items: InventorySlot[]; total: number }>('/api/v1/inventory/slots')
  return response.data.items
}

export async function getInventoryEvents(limit = 50) {
  const response = await http.get<{ items: InventoryEvent[]; total: number }>('/api/v1/inventory/events', { limit })
  return response.data.items
}

export async function submitOcrIngest(input: File | FormData, onProgress?: (progress: number) => void) {
  if (input instanceof FormData) {
    const response = await http.upload<OcrIngestResult>('/api/v1/inventory/ocr/ingest', input, onProgress)
    return response.data
  }

  const formData = new FormData()
  formData.append('image', input)
  const response = await http.upload<OcrIngestResult>('/api/v1/inventory/ocr/ingest', formData, onProgress)
  return response.data
}
