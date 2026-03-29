import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'

import { STORAGE_KEYS } from '@/constants/constant'
import { SessionProvider } from '@/providers/session-provider'
import { AppLayout } from '@/routes/app-layout'

function renderLayout(account?: Record<string, unknown>) {
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
    <MemoryRouter initialEntries={['/dashboard']}>
      <SessionProvider>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<div>dashboard-content</div>} />
            <Route path="/books" element={<div>books-content</div>} />
            <Route path="/alerts" element={<div>alerts-content</div>} />
            <Route path="/analytics" element={<div>analytics-content</div>} />
            <Route path="/system" element={<div>system-content</div>} />
          </Route>
        </Routes>
      </SessionProvider>
    </MemoryRouter>,
  )
}

describe('AppLayout sidebar', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('collapses the desktop sidebar and persists the preference', async () => {
    const user = userEvent.setup()
    renderLayout()

    expect(screen.getByText('首页')).toBeVisible()

    await user.click(screen.getByRole('button', { name: '收起菜单' }))

    await waitFor(() => {
      expect(screen.queryByText('首页')).not.toBeInTheDocument()
    })
    expect(window.localStorage.getItem(STORAGE_KEYS.SIDEBAR_COLLAPSED)).toBe('true')
    expect(screen.getByRole('button', { name: '展开菜单' })).toBeVisible()
  })

  it('shows the logo again after collapsing the sidebar a second time', async () => {
    const user = userEvent.setup()
    renderLayout()

    await user.click(screen.getByRole('button', { name: '收起菜单' }))

    const collapsedToggle = screen.getByRole('button', { name: '展开菜单' })
    fireEvent.mouseEnter(collapsedToggle)
    await user.click(collapsedToggle)
    await user.click(screen.getByRole('button', { name: '收起菜单' }))

    expect(screen.getByAltText('知序')).toBeVisible()
  })

  it('switches from the logo to the expand hint when hovering the collapsed sidebar header', async () => {
    const user = userEvent.setup()
    renderLayout()

    await user.click(screen.getByRole('button', { name: '收起菜单' }))

    const collapsedToggle = screen.getByRole('button', { name: '展开菜单' })
    const collapsedLogo = screen.getByTestId('collapsed-sidebar-logo')
    const expandHint = screen.getByTestId('collapsed-sidebar-open-icon')

    expect(collapsedLogo).not.toHaveClass('opacity-0')
    expect(expandHint).toHaveClass('opacity-0')

    fireEvent.mouseEnter(collapsedToggle)

    expect(collapsedLogo).toHaveClass('opacity-0')
    expect(expandHint).toHaveClass('opacity-100')

    fireEvent.mouseLeave(collapsedToggle)

    expect(collapsedLogo).not.toHaveClass('opacity-0')
    expect(expandHint).toHaveClass('opacity-0')
  })

  it('shows the upgraded admin navigation entries', () => {
    renderLayout()

    expect(screen.getByPlaceholderText('搜索图书、订单、读者与告警')).toBeVisible()
    expect(screen.getByText('图书馆管理后台')).toBeVisible()
    expect(screen.getByText('图书')).toBeVisible()
    expect(screen.getByText('异常')).toBeVisible()
    expect(screen.queryByText('推荐运营台')).not.toBeInTheDocument()
    expect(screen.getByText('统计')).toBeVisible()
    expect(screen.queryByText('系统配置')).not.toBeInTheDocument()
  })

  it('renders the desktop navigation with shadcn sidebar primitives', () => {
    const { container } = renderLayout()

    const sidebar = container.querySelector('[data-sidebar="sidebar"]')
    const menuButtons = container.querySelectorAll('[data-sidebar="menu-button"]')

    expect(sidebar).toBeTruthy()
    expect(menuButtons.length).toBeGreaterThan(0)
  })

  it('waits for the previous route scene to exit before showing the next page', async () => {
    const user = userEvent.setup()
    renderLayout()

    await user.click(screen.getByRole('link', { name: '图书' }))

    expect(await screen.findByText('books-content')).toBeInTheDocument()
    expect(screen.queryByText('dashboard-content')).not.toBeInTheDocument()
  })

  it('keeps a single active route scene mounted after navigation settles', async () => {
    const user = userEvent.setup()
    renderLayout()

    await user.click(screen.getByRole('link', { name: '图书' }))

    const sceneStage = screen.getByTestId('route-scene-stage')
    await screen.findByText('books-content')
    const scenes = screen.getAllByTestId('route-scene')
    const activeScene = scenes[0]

    expect(sceneStage).toBeVisible()
    expect(scenes).toHaveLength(1)
    expect(activeScene).toHaveAttribute('data-route-scene-state', 'active')
    expect(activeScene).toHaveClass('relative')
    expect(activeScene).not.toHaveClass('absolute')
  })

  it('does not render a transition veil while routes hand off in wait mode', async () => {
    const user = userEvent.setup()
    renderLayout()

    await user.click(screen.getByRole('link', { name: '图书' }))

    expect(await screen.findByText('books-content')).toBeInTheDocument()
    expect(screen.queryByTestId('route-transition-veil')).not.toBeInTheDocument()
  })

  it('resets the scroll container to the top on route changes so the next page does not jump mid-scroll', async () => {
    const user = userEvent.setup()
    renderLayout()

    const main = screen.getByTestId('app-layout-main')
    Object.defineProperty(main, 'scrollTop', {
      value: 420,
      writable: true,
      configurable: true,
    })

    await user.click(screen.getByRole('link', { name: '图书' }))

    await waitFor(() => {
      expect(main.scrollTop).toBe(0)
    })
  })

  it('avoids animating sidebar width so collapse does not reflow the whole workspace continuously', () => {
    renderLayout()

    const sidebar = screen.getByAltText('知序').closest('[data-sidebar="sidebar"]')
    expect(sidebar).not.toHaveClass('transition-[width]')
  })

  it('only shows routes that the current admin can access', () => {
    renderLayout({
      id: 2,
      username: 'dashboard-viewer',
      role_codes: ['dashboard-viewer'],
      permission_codes: ['dashboard.view'],
    })

    expect(screen.getByText('首页')).toBeVisible()
    expect(screen.queryByText('图书')).not.toBeInTheDocument()
    expect(screen.queryByText('推荐运营台')).not.toBeInTheDocument()
    expect(screen.queryByText('系统配置')).not.toBeInTheDocument()
  })

  it('keeps hybrid navigation entries visible when the admin has one of the accepted permissions', () => {
    renderLayout({
      id: 3,
      username: 'governance-admin',
      role_codes: ['audit-admin'],
      permission_codes: ['system.audit.view', 'system.roles.manage'],
    })

    expect(screen.getByText('异常')).toBeVisible()
    expect(screen.queryByText('系统配置')).not.toBeInTheDocument()
    expect(screen.queryByText('推荐运营台')).not.toBeInTheDocument()
  })
})
