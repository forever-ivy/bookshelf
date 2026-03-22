import { useState } from 'react'
import { useLocation, useOutlet } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'

import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'
import { GridPattern } from '@/components/ui/grid-pattern'
import { STORAGE_KEYS } from '@/constants/constant'
import { storageUtils } from '@/utils'

export function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return storageUtils.get<boolean>(STORAGE_KEYS.SIDEBAR_COLLAPSED) ?? false
  })

  const location = useLocation()
  const currentOutlet = useOutlet()

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
          {/* Ambient Glow Background */}
          <div 
            className="pointer-events-none absolute inset-0 z-0"
            style={{
              background: [
                'linear-gradient(to right, rgba(26,115,232,0.04) 0%, transparent 40%)',
                'linear-gradient(to left, rgba(124,77,255,0.03) 0%, transparent 40%)',
                'linear-gradient(to bottom, rgba(26,115,232,0.03) 0%, transparent 35%)',
                'linear-gradient(to top, rgba(124,77,255,0.025) 0%, transparent 35%)',
              ].join(', '),
            }}
          />
          {/* Grid Pattern Background */}
          <GridPattern
            width={32}
            height={32}
            x={-1}
            y={-1}
            className="absolute inset-0 z-0 h-full w-full fill-[var(--primary)]/[0.04] stroke-[var(--primary)]/[0.12] [mask-image:linear-gradient(to_bottom,rgba(0,0,0,0.8)_0%,rgba(0,0,0,0.4)_60%,transparent_100%)]"
          />
          <Topbar />
          <main className="relative z-10 flex-1 overflow-x-hidden overflow-y-auto px-5 py-6 lg:px-8 lg:py-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="min-h-full w-full"
              >
                {currentOutlet}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  )
}
