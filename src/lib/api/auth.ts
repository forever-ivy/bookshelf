import { http } from '@/lib/http'
import type { AuthPayload, IdentityPayload, LoginPayload } from '@/types/domain'

export async function loginAsAdmin(payload: Omit<LoginPayload, 'role'>) {
  const response = await http.post<AuthPayload>('/api/v1/auth/login', {
    ...payload,
    role: 'admin',
  })
  return response.data
}

export async function refreshAdminSession(refreshToken: string) {
  const response = await http.post<AuthPayload>('/api/v1/auth/refresh', {
    refresh_token: refreshToken,
  })
  return response.data
}

export async function fetchAdminIdentity() {
  const response = await http.get<IdentityPayload>('/api/v1/auth/admin/me')
  return response.data
}
