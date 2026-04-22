import { useState } from 'react'
import {
  BookCopy,
  Bot,
  ChartColumnIncreasing,
  LayoutDashboard,
  LibraryBig,
  PanelLeftClose,
  PanelLeftOpen,
  ScrollText,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'framer-motion'
import { NavLink, useLocation } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { useSidebar } from '@/components/ui/sidebar'
import { hasAdminPermission } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { useSession } from '@/providers/session-provider'

type NavItem = {
  to: string
  label: string
  icon: typeof LayoutDashboard
  permission: string | string[]
  activePrefixes?: string[]
}

const items: NavItem[] = [
  { to: '/dashboard', label: '首页', icon: LayoutDashboard, permission: 'dashboard.view' },
  { to: '/books', label: '图书', icon: LibraryBig, permission: 'books.manage', activePrefixes: ['/legacy/catalog'] },
  { to: '/inventory', label: '库存', icon: BookCopy, permission: 'inventory.manage', activePrefixes: ['/inventory/cabinets/'] },
  { to: '/orders', label: '订单', icon: ScrollText, permission: 'orders.manage', activePrefixes: ['/orders/'] },
  { to: '/robots', label: '机器人', icon: Bot, permission: 'robots.manage' },
  { to: '/alerts', label: '异常', icon: ShieldCheck, permission: ['alerts.manage', 'system.audit.view'], activePrefixes: ['/events', '/legacy/events'] },
  { to: '/readers', label: '读者', icon: Users, permission: 'readers.manage', activePrefixes: ['/readers/'] },
  { to: '/analytics', label: '统计', icon: ChartColumnIncreasing, permission: 'analytics.view' },
]

function isItemActive(item: NavItem, pathname: string) {
  if (pathname === item.to) {
    return true
  }

  return (item.activePrefixes ?? []).some((prefix) => pathname.startsWith(prefix))
}

export function Sidebar() {
  const location = useLocation()
  const { account } = useSession()
  const { state, toggleSidebar } = useSidebar()
  const collapsed = state === 'collapsed'
  const [isCollapsedHeaderHovered, setIsCollapsedHeaderHovered] = useState(false)
  const prefersReducedMotion = useReducedMotion()

  const visibleItems = items.filter((item) => hasAdminPermission(account, item.permission))
  const activeItemTransition = prefersReducedMotion
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 560, damping: 54, mass: 0.6 }

  return (
    <aside
      data-sidebar="sidebar"
      className={cn(
        'hidden h-screen shrink-0 overflow-hidden border-r border-[var(--line-subtle)] bg-[rgba(252,249,243,0.9)] py-6 lg:flex lg:flex-col [contain:layout_paint]',
        collapsed ? 'w-24' : 'w-72',
      )}
    >
      <div className="relative mb-8 flex h-14 items-center px-5">
        {collapsed ? (
          <motion.button
            type="button"
            className="relative flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-2xl [will-change:transform]"
            aria-label="展开菜单"
            onClick={() => {
              setIsCollapsedHeaderHovered(false)
              toggleSidebar()
            }}
            onMouseEnter={() => setIsCollapsedHeaderHovered(true)}
            onMouseLeave={() => setIsCollapsedHeaderHovered(false)}
            whileTap={prefersReducedMotion ? undefined : { scale: 0.97 }}
          >
            <motion.img
              data-testid="collapsed-sidebar-logo"
              src="/logo.svg"
              alt="知序"
              className={cn(
                'size-12 transition-opacity duration-150 [will-change:transform,opacity]',
                isCollapsedHeaderHovered ? 'opacity-0' : 'opacity-100',
              )}
              initial={false}
              animate={{
                opacity: isCollapsedHeaderHovered ? 0 : 1,
                scale: isCollapsedHeaderHovered ? 0.92 : 1,
              }}
              transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.18, ease: 'easeOut' }}
            />
            <motion.span
              data-testid="collapsed-sidebar-open-icon"
              className={cn(
                'absolute inset-0 flex items-center justify-center text-[var(--primary)] transition-opacity duration-150 [will-change:transform,opacity]',
                isCollapsedHeaderHovered ? 'opacity-100' : 'opacity-0',
              )}
              initial={false}
              animate={{
                opacity: isCollapsedHeaderHovered ? 1 : 0,
                scale: isCollapsedHeaderHovered ? 1 : 0.92,
              }}
              transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.18, ease: 'easeOut' }}
            >
              <PanelLeftOpen className="size-5" />
            </motion.span>
          </motion.button>
        ) : (
          <div className="relative flex size-11 shrink-0 items-center justify-center" role="img">
            <img src="/logo.svg" alt="知序" className="size-11" />
          </div>
        )}

        <motion.div
          initial={false}
          animate={{
            opacity: collapsed ? 0 : 1,
            x: collapsed ? -8 : 0,
            scaleX: collapsed ? 0.96 : 1,
          }}
          transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.22, ease: 'easeOut' }}
          className={cn(
            'ml-3 flex min-w-0 flex-1 flex-col overflow-hidden whitespace-nowrap [transform-origin:left_center] [will-change:transform,opacity]',
            collapsed ? 'pointer-events-none' : 'pointer-events-auto',
          )}
        >
          <p className="text-sm font-semibold tracking-[-0.03em] text-[var(--foreground)]">知序</p>
          <p className="text-xs text-[var(--muted-foreground)]">图书馆管理后台</p>
        </motion.div>

        <motion.div
          initial={false}
          animate={{
            opacity: collapsed ? 0 : 1,
            scale: collapsed ? 0.9 : 1,
          }}
          transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.18, ease: 'easeOut' }}
          className={cn('absolute right-4', collapsed ? 'pointer-events-none' : 'pointer-events-auto')}
        >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-10 rounded-full border border-[var(--line-subtle)] bg-[var(--surface-panel-strong)] text-[var(--foreground)] hover:bg-[var(--surface-bright)]"
            aria-label="收起菜单"
            onClick={toggleSidebar}
          >
            <PanelLeftClose className="size-4" />
          </Button>
        </motion.div>
      </div>

      <div className={cn('px-5 pb-4', collapsed && 'hidden')}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
          Workspace
        </p>
      </div>

      <LayoutGroup id="sidebar-nav">
        <nav className="flex flex-col space-y-1 overflow-hidden px-3">
          {visibleItems.map((item) => {
            const legacyActive = isItemActive(item, location.pathname)

            return (
              <NavLink
                key={item.to}
                to={item.to}
                title={collapsed ? item.label : undefined}
                data-sidebar="menu-button"
                className={({ isActive }) =>
                  cn(
                    'relative flex items-center rounded-2xl py-3 text-sm font-medium transition-colors',
                    collapsed ? 'justify-center px-0' : 'px-3',
                    isActive || legacyActive
                      ? 'text-[var(--foreground)]'
                      : 'text-[var(--muted-foreground)] hover:bg-[rgba(33,73,140,0.05)] hover:text-[var(--foreground)]',
                  )
                }
              >
                {({ isActive }) => {
                  const active = isActive || legacyActive

                  return (
                    <>
                      {active ? (
                        <motion.div
                          aria-hidden="true"
                          layoutId="sidebar-active-item"
                          transition={activeItemTransition}
                          className={cn(
                            'pointer-events-none absolute inset-y-1 rounded-2xl bg-[rgba(33,73,140,0.08)] shadow-[inset_0_0_0_1px_var(--line-subtle)]',
                            collapsed ? 'left-2 right-2' : 'left-1 right-1',
                          )}
                        >
                          {!collapsed ? (
                            <div className="absolute left-0 top-1/2 h-7 w-[3px] -translate-y-1/2 rounded-full bg-[var(--primary)]" />
                          ) : null}
                        </motion.div>
                      ) : null}

                      <div className="relative z-10 flex size-5 shrink-0 items-center justify-center">
                        <item.icon className="size-4" />
                      </div>
                      <AnimatePresence initial={false}>
                        {!collapsed ? (
                          <motion.span
                            initial={prefersReducedMotion ? false : { opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: -8 }}
                            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.18, ease: 'easeOut' }}
                            className="relative z-10 ml-3 overflow-hidden whitespace-nowrap [will-change:transform,opacity]"
                          >
                            {item.label}
                          </motion.span>
                        ) : null}
                      </AnimatePresence>
                    </>
                  )
                }}
              </NavLink>
            )
          })}
        </nav>
      </LayoutGroup>
    </aside>
  )
}
