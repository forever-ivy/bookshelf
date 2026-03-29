import type { PropsWithChildren } from 'react'

import { EmptyState } from '@/components/shared/empty-state'
import { PageShell } from '@/components/shared/page-shell'
import { formatPermissionLabel } from '@/lib/display-labels'
import { hasAdminPermission } from '@/lib/permissions'
import { useSession } from '@/providers/session-provider'

type PermissionRouteProps = PropsWithChildren<{
  permissionCode: string | string[]
}>

export function PermissionRoute({ permissionCode, children }: PermissionRouteProps) {
  const { account } = useSession()
  const permissionLabel = Array.isArray(permissionCode)
    ? permissionCode.map((item) => formatPermissionLabel(item)).join(' / ')
    : formatPermissionLabel(permissionCode)

  if (!hasAdminPermission(account, permissionCode)) {
    return (
      <PageShell
        title="暂时不能查看"
        description="当前账号还不能查看这个页面，请联系管理员处理。"
      >
        <EmptyState
          title="没有查看权限"
          description={`当前账号还不能使用“${permissionLabel}”，请联系管理员处理。`}
        />
      </PageShell>
    )
  }

  return children
}
