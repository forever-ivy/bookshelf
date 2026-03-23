import type { PropsWithChildren } from 'react'

import { EmptyState } from '@/components/shared/empty-state'
import { PageShell } from '@/components/shared/page-shell'
import { hasAdminPermission } from '@/lib/permissions'
import { useSession } from '@/providers/session-provider'

type PermissionRouteProps = PropsWithChildren<{
  permissionCode: string | string[]
}>

export function PermissionRoute({ permissionCode, children }: PermissionRouteProps) {
  const { account } = useSession()
  const permissionLabel = Array.isArray(permissionCode) ? permissionCode.join(' / ') : permissionCode

  if (!hasAdminPermission(account, permissionCode)) {
    return (
      <PageShell
        title="权限受限"
        description="当前账号未获准访问该模块，请联系治理层调配角色配置。"
      >
        <EmptyState
          title="权限受限"
          description={`当前账号缺少 \`${permissionLabel}\`，请联系治理层开通对应权限。`}
        />
      </PageShell>
    )
  }

  return children
}
