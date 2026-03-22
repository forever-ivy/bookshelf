import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { STORAGE_KEYS } from '@/constants/constant'
import { SessionProvider } from '@/providers/session-provider'
import { AppLayout } from '@/routes/app-layout'

function renderLayout() {
  window.localStorage.setItem(
    STORAGE_KEYS.ACCOUNT,
    JSON.stringify({
      id: 1,
      username: 'admin',
      role: 'admin',
    }),
  )

  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <SessionProvider>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<div>dashboard-content</div>} />
          </Route>
        </Routes>
      </SessionProvider>
    </MemoryRouter>,
  )
}

describe('AppLayout sidebar', () => {
  it('collapses the desktop sidebar and persists the preference', async () => {
    const user = userEvent.setup()
    renderLayout()

    expect(screen.getByText('Dashboard')).toBeVisible()

    await user.click(screen.getByRole('button', { name: '收起侧边栏' }))

    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument()
    expect(window.localStorage.getItem(STORAGE_KEYS.SIDEBAR_COLLAPSED)).toBe('true')
    expect(screen.getByRole('button', { name: '展开侧边栏' })).toBeVisible()
  })
})
