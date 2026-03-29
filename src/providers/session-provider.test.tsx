import { render, screen, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { STORAGE_KEYS } from '@/constants/constant'
import { SessionProvider, useSession } from '@/providers/session-provider'
import { storageUtils } from '@/utils'

const authApi = vi.hoisted(() => ({
  fetchAdminIdentity: vi.fn(),
}))

vi.mock('@/lib/api/auth', () => authApi)

function SessionProbe({ children }: PropsWithChildren) {
  const session = useSession()

  return (
    <div>
      <p data-testid="session-status">{session.status}</p>
      <p data-testid="session-username">{session.account?.username ?? 'guest'}</p>
      {children}
    </div>
  )
}

describe('SessionProvider', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.clearAllMocks()
  })

  it('hydrates the admin identity on startup when a token is present', async () => {
    storageUtils.set(STORAGE_KEYS.TOKEN, 'access-token')
    storageUtils.set(STORAGE_KEYS.REFRESH_TOKEN, 'refresh-token')
    storageUtils.set(STORAGE_KEYS.ACCOUNT, {
      id: 1,
      username: 'stale-admin',
      role: 'admin',
    })
    authApi.fetchAdminIdentity.mockResolvedValue({
      account_id: 1,
      role: 'admin',
      account: {
        id: 1,
        username: 'admin',
        role: 'admin',
        permission_codes: ['dashboard.view'],
      },
    })

    render(
      <SessionProvider>
        <SessionProbe />
      </SessionProvider>,
    )

    expect(screen.getByTestId('session-status')).toHaveTextContent('bootstrapping')
    await waitFor(() => {
      expect(screen.getByTestId('session-status')).toHaveTextContent('authenticated')
    })
    expect(screen.getByTestId('session-username')).toHaveTextContent('admin')
    expect(storageUtils.get(STORAGE_KEYS.ACCOUNT)).toEqual(
      expect.objectContaining({
        username: 'admin',
        permission_codes: ['dashboard.view'],
      }),
    )
  })

  it('clears the local session when identity hydration fails', async () => {
    storageUtils.set(STORAGE_KEYS.TOKEN, 'access-token')
    storageUtils.set(STORAGE_KEYS.REFRESH_TOKEN, 'refresh-token')
    storageUtils.set(STORAGE_KEYS.ACCOUNT, {
      id: 1,
      username: 'stale-admin',
      role: 'admin',
    })
    authApi.fetchAdminIdentity.mockRejectedValue(new Error('expired'))

    render(
      <SessionProvider>
        <SessionProbe />
      </SessionProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('session-status')).toHaveTextContent('unauthenticated')
    })
    expect(screen.getByTestId('session-username')).toHaveTextContent('guest')
    expect(storageUtils.get(STORAGE_KEYS.TOKEN)).toBeNull()
    expect(storageUtils.get(STORAGE_KEYS.REFRESH_TOKEN)).toBeNull()
    expect(storageUtils.get(STORAGE_KEYS.ACCOUNT)).toBeNull()
  })
})
