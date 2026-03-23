import type { AuthAccount } from '@/types/domain'

export function hasAdminPermission(account: AuthAccount | null | undefined, permissionCode: string | string[]) {
  if (!account || account.role !== 'admin') {
    return true
  }

  const requiredPermissions = Array.isArray(permissionCode) ? permissionCode : [permissionCode]
  const roleCodes = account.role_codes ?? []
  const permissionCodes = account.permission_codes ?? []
  if (roleCodes.length === 0 && permissionCodes.length === 0) {
    return true
  }

  return requiredPermissions.some((code) => permissionCodes.includes(code))
}
