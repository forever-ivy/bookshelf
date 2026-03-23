import type { ReactNode } from 'react'
import { Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLocation, useOutlet } from 'react-router-dom'
import { AnimatePresence, motion, useIsPresent, useReducedMotion } from 'framer-motion'

import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'
import { GridPattern } from '@/components/ui/grid-pattern'
import { STORAGE_KEYS } from '@/constants/constant'
import { cn } from '@/lib/utils'
import { storageUtils } from '@/utils'

function RouteScene({ children }: { children: ReactNode }) {
  const isPresent = useIsPresent()
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.div
      data-testid="route-scene"
      data-route-scene-state={isPresent ? 'active' : 'exiting'}
      initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
      animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
      transition={
        prefersReducedMotion
          ? { duration: 0.08 }
          : { duration: 0.2, ease: 'easeOut' }
      }
      className={cn(
        'min-h-full w-full [will-change:transform,opacity]',
        isPresent ? 'relative z-10' : 'absolute inset-0 z-0 pointer-events-none',
      )}
    >
      {children}
    </motion.div>
  )
}


export function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return storageUtils.get<boolean>(STORAGE_KEYS.SIDEBAR_COLLAPSED) ?? false
  })
  const mainRef = useRef<HTMLElement | null>(null)

  const location = useLocation()
  const currentOutlet = useOutlet()

  useLayoutEffect(() => {
    const node = mainRef.current
    if (!node) {
      return
    }

    node.scrollTop = 0

    if (typeof node.scrollTo === 'function') {
      node.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    }
  }, [location.pathname])

  // Proactively preload major route chunks after layout mounts to prevent Suspense lag on first navigation
  useEffect(() => {
    const timer = setTimeout(() => {
      Promise.allSettled([
        import('@/pages/books-page'),
        import('@/pages/inventory-page'),
        import('@/pages/orders-page'),
        import('@/pages/robots-page'),
        import('@/pages/alerts-page'),
        import('@/pages/readers-page'),
        import('@/pages/dashboard-page'),
      ]).catch(() => {})
    }, 1000)
    return () => clearTimeout(timer)
  }, [])


  const handleToggleSidebar = () => {
    setSidebarCollapsed((current) => {
      const next = !current
      storageUtils.set(STORAGE_KEYS.SIDEBAR_COLLAPSED, next)
      return next
    })
  }

  return (
    <div className="h-screen overflow-hidden bg-transparent text-[var(--foreground)]">
      <div className="flex h-screen overflow-hidden">
        <Sidebar collapsed={sidebarCollapsed} onToggle={handleToggleSidebar} />
        <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-transparent">
          <div
            className="pointer-events-none absolute inset-0 z-0"
            style={{
              background: [
                'radial-gradient(circle at top left, rgba(33,73,140,0.08) 0%, transparent 28%)',
                'radial-gradient(circle at bottom right, rgba(138,90,40,0.06) 0%, transparent 22%)',
              ].join(', '),
            }}
          />
          <GridPattern
            width={32}
            height={32}
            x={-1}
            y={-1}
            className="absolute inset-0 z-0 h-full w-full fill-[var(--primary)]/[0.03] stroke-[var(--primary)]/[0.1] [mask-image:linear-gradient(to_bottom,rgba(0,0,0,0.68)_0%,rgba(0,0,0,0.32)_62%,transparent_100%)]"
          />
          <Topbar />
          <main
            ref={mainRef}
            data-testid="app-layout-main"
            className="relative z-10 flex-1 overflow-x-hidden overflow-y-auto px-5 py-6 lg:px-8 lg:py-8"
          >
            <div data-testid="route-scene-stage" className="relative min-h-full w-full overflow-hidden">
              <AnimatePresence initial={false} mode="wait">
                <RouteScene key={location.pathname}>
                  <Suspense fallback={null}>
                    {currentOutlet}
                  </Suspense>
                </RouteScene>
              </AnimatePresence>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
