import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import { beforeEach, vi } from 'vitest'

import { useSession } from '@/providers/session-provider'
import { ProtectedRoute } from '@/routes/protected-route'

vi.mock('@/providers/session-provider', () => ({
  useSession: vi.fn(),
}))

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.mocked(useSession).mockReturnValue({
      token: null,
      refreshToken: null,
      account: null,
      status: 'unauthenticated',
      isAuthenticated: false,
      setSession: vi.fn(),
      clearSession: vi.fn(),
    })
  })

  it('redirects guests to the login page', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/login" element={<div>login page</div>} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <div>dashboard page</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('login page')).toBeInTheDocument()
  })

  it('renders children when a token is present', () => {
    vi.mocked(useSession).mockReturnValue({
      token: 'access-token',
      refreshToken: 'refresh-token',
      account: {
        id: 1,
        username: 'admin',
        role: 'admin',
      },
      status: 'authenticated',
      isAuthenticated: true,
      setSession: vi.fn(),
      clearSession: vi.fn(),
    })

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/login" element={<div>login page</div>} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <div>dashboard page</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('dashboard page')).toBeInTheDocument()
  })

  it('renders a bootstrap loading state while the session is being verified', () => {
    vi.mocked(useSession).mockReturnValue({
      token: 'access-token',
      refreshToken: 'refresh-token',
      account: null,
      status: 'bootstrapping',
      isAuthenticated: false,
      setSession: vi.fn(),
      clearSession: vi.fn(),
    })

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/login" element={<div>login page</div>} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <div>dashboard page</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('正在核对登录信息')).toBeInTheDocument()
    expect(screen.queryByText('dashboard page')).not.toBeInTheDocument()
    expect(screen.queryByText('login page')).not.toBeInTheDocument()
  })
})
