import { useEffect, useState } from 'react'
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'framer-motion'
import { BookCopy, Bot, ChartColumnIncreasing, LayoutDashboard, LibraryBig, PackageSearch, PanelLeftClose, PanelLeftOpen, ScrollText, Settings2, ShieldCheck, Sparkles, Users } from 'lucide-react'
import { NavLink } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { STORAGE_KEYS } from '@/constants/constant'
import { hasAdminPermission } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import type { AuthAccount } from '@/types/domain'
import { storageUtils } from '@/utils'

const items = [
  { to: '/dashboard', label: '首页总览', icon: LayoutDashboard, permission: 'dashboard.view' },
  { to: '/books', label: '图书管理', icon: LibraryBig, permission: 'books.manage' },
  { to: '/inventory', label: '库存作业', icon: BookCopy, permission: 'inventory.manage' },
  { to: '/ocr', label: '感知落位', icon: PackageSearch, permission: 'inventory.manage' },
  { to: '/orders', label: '履约链路', icon: ScrollText, permission: 'orders.manage' },
  { to: '/robots', label: '运力调度', icon: Bot, permission: 'robots.manage' },
  { to: '/alerts', label: '告警中心', icon: ShieldCheck, permission: ['alerts.manage', 'system.audit.view'] },
  { to: '/readers', label: '读者画像', icon: Users, permission: 'readers.manage' },
  { to: '/recommendation', label: '推荐运营', icon: Sparkles, permission: 'recommendation.manage' },
  { to: '/analytics', label: '数据分析', icon: ChartColumnIncreasing, permission: 'analytics.view' },
  { to: '/system', label: '系统配置', icon: Settings2, permission: ['system.settings.manage', 'system.roles.manage'] },
]

type SidebarProps = {
  collapsed: boolean
  onToggle: () => void
}

const COLLAPSED_WIDTH = 96
const EXPANDED_WIDTH = 288

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const [isCollapsedHeaderHovered, setIsCollapsedHeaderHovered] = useState(false)
  const prefersReducedMotion = useReducedMotion()
  const account = storageUtils.get<AuthAccount>(STORAGE_KEYS.ACCOUNT)
  const visibleItems = items.filter((item) => hasAdminPermission(account, item.permission))

  useEffect(() => {
    if (!collapsed) {
      setIsCollapsedHeaderHovered(false)
    }
  }, [collapsed])

  const sidebarWidth = collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH
  const activeItemTransition = prefersReducedMotion
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 560, damping: 54, mass: 0.6 }

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarWidth }}
      transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', bounce: 0, duration: 0.5 }}
      className={cn(
        'hidden h-screen shrink-0 overflow-hidden border-r border-[var(--line-subtle)] bg-[rgba(252,249,243,0.9)] py-6 lg:flex lg:flex-col [contain:layout_paint]',
      )}
    >
      <div className="relative mb-8 flex h-14 items-center px-5">
        {collapsed ? (
          <motion.button
            type="button"
            className="relative flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-2xl"
            aria-label="展开侧边栏"
            onClick={() => {
              setIsCollapsedHeaderHovered(false)
              onToggle()
            }}
            onMouseEnter={() => setIsCollapsedHeaderHovered(true)}
            onMouseLeave={() => setIsCollapsedHeaderHovered(false)}
            whileTap={prefersReducedMotion ? undefined : { scale: 0.97 }}
          >
            <motion.img
              data-testid="collapsed-sidebar-logo"
              src="/logo.svg"
              alt="知序"
              className={cn('size-12 transition-opacity duration-150', isCollapsedHeaderHovered ? 'opacity-0' : 'opacity-100')}
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
                'absolute inset-0 flex items-center justify-center text-[var(--primary)] transition-opacity duration-150',
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

        {/* Brand Text */}
        <motion.div
          initial={false}
          animate={{
            opacity: collapsed ? 0 : 1,
            x: collapsed ? -10 : 0,
            width: collapsed ? 0 : 160,
          }}
          transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.22, ease: 'easeOut' }}
          className={cn(
            'ml-3 flex flex-col whitespace-nowrap overflow-hidden',
            collapsed ? 'pointer-events-none' : 'pointer-events-auto',
          )}
        >
          <p className="text-sm font-semibold tracking-[-0.03em] text-[var(--foreground)]">知序</p>
          <p className="text-xs text-[var(--muted-foreground)]">馆藏运营控制台</p>
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
            aria-label="收起侧边栏"
            onClick={onToggle}
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
        <nav className="space-y-1 overflow-hidden flex flex-col px-3">
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                cn(
                  'relative flex items-center rounded-2xl py-3 text-sm font-medium transition-colors',
                  collapsed ? 'justify-center px-0' : 'px-3',
                  isActive ? 'text-[var(--foreground)]' : 'text-[var(--muted-foreground)] hover:bg-[rgba(33,73,140,0.05)] hover:text-[var(--foreground)]',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive ? (
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
                        className="relative z-10 ml-3 overflow-hidden whitespace-nowrap"
                      >
                        {item.label}
                      </motion.span>
                    ) : null}
                  </AnimatePresence>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </LayoutGroup>
    </motion.aside>
  )
}
