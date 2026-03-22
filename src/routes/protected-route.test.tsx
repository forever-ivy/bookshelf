import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { render, screen } from '@testing-library/react'

import { STORAGE_KEYS } from '@/constants/constant'
import { ProtectedRoute } from '@/routes/protected-route'
import { storageUtils } from '@/utils'

describe('ProtectedRoute', () => {
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
    storageUtils.set(STORAGE_KEYS.TOKEN, 'access-token')

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
})
