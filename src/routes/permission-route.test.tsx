import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'

import { STORAGE_KEYS } from '@/constants/constant'
import { SessionProvider } from '@/providers/session-provider'
import { PermissionRoute } from '@/routes/permission-route'

function renderPermissionRoute(account: Record<string, unknown>) {
  window.localStorage.setItem(
    STORAGE_KEYS.ACCOUNT,
    JSON.stringify({
      id: 1,
      username: 'admin',
      role: 'admin',
      ...account,
    }),
  )

  return render(
    <MemoryRouter>
      <SessionProvider>
        <PermissionRoute permissionCode="system.settings.manage">
          <div>system-content</div>
        </PermissionRoute>
      </SessionProvider>
    </MemoryRouter>,
  )
}

describe('PermissionRoute', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('renders children when the admin has the required permission', () => {
    renderPermissionRoute({
      role_codes: ['system-admin'],
      permission_codes: ['system.settings.manage'],
    })

    expect(screen.getByText('system-content')).toBeInTheDocument()
  })

  it('renders an access denied state when the admin lacks the required permission', () => {
    renderPermissionRoute({
      role_codes: ['dashboard-viewer'],
      permission_codes: ['dashboard.view'],
    })

    expect(screen.queryByText('system-content')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '访问受限', level: 1 })).toBeInTheDocument()
    expect(screen.getByText('当前账号缺少 `system.settings.manage`，请联系超级管理员开通对应权限。')).toBeInTheDocument()
  })

  it('keeps backward compatibility for legacy admins without permission snapshots', () => {
    renderPermissionRoute({})

    expect(screen.getByText('system-content')).toBeInTheDocument()
  })

  it('accepts any matching permission from a permission set', () => {
    window.localStorage.setItem(
      STORAGE_KEYS.ACCOUNT,
      JSON.stringify({
        id: 4,
        username: 'audit-admin',
        role: 'admin',
        role_codes: ['audit-admin'],
        permission_codes: ['system.audit.view'],
      }),
    )

    render(
      <MemoryRouter>
        <SessionProvider>
          <PermissionRoute permissionCode={['alerts.manage', 'system.audit.view']}>
            <div>alerts-content</div>
          </PermissionRoute>
        </SessionProvider>
      </MemoryRouter>,
    )

    expect(screen.getByText('alerts-content')).toBeInTheDocument()
  })
})
