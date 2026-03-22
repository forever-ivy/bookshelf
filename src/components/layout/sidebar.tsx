import { useState } from 'react'
import { BookCopy, Bot, LayoutDashboard, LibraryBig, PackageSearch, PanelLeftClose, PanelLeftOpen, ScrollText, ShieldCheck, Users } from 'lucide-react'
import { NavLink } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const items = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/catalog', label: '图书目录', icon: LibraryBig },
  { to: '/inventory', label: '库存与书柜', icon: BookCopy },
  { to: '/ocr', label: 'OCR 入柜', icon: PackageSearch },
  { to: '/orders', label: '借阅订单', icon: ScrollText },
  { to: '/robots', label: '机器人监控', icon: Bot },
  { to: '/events', label: '事件与审计', icon: ShieldCheck },
  { to: '/readers', label: '读者中心', icon: Users },
]

type SidebarProps = {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const [isLogoHovered, setIsLogoHovered] = useState(false)

  return (
    <aside
      className={cn(
        'hidden h-screen shrink-0 overflow-hidden border-r border-white/40 bg-white/40 shadow-[4px_0_24px_rgba(0,0,0,0.02)] backdrop-blur-3xl py-6 lg:flex lg:flex-col transition-[width] duration-300 ease-out',
        collapsed ? 'w-24' : 'w-72',
      )}
    >
      {/* Brand logo & Toggle area */}
      <div className="relative mb-8 flex h-14 items-center px-5">
        
        {/* Logo */}
        <div 
          className={cn(
            'relative flex shrink-0 items-center justify-center transition-[width,height] duration-300',
            collapsed ? 'size-12 cursor-pointer' : 'size-11',
          )}
          onClick={collapsed ? onToggle : undefined}
          onMouseEnter={() => collapsed && setIsLogoHovered(true)}
          onMouseLeave={() => collapsed && setIsLogoHovered(false)}
          role={collapsed ? 'button' : 'img'}
          aria-label={collapsed ? '展开侧边栏' : undefined}
        >
          <img
            src="/logo.svg"
            alt="知序"
            className={cn(
              'transition-opacity duration-200',
              collapsed ? 'size-12' : 'size-11',
              collapsed && isLogoHovered ? 'opacity-0' : 'opacity-100',
            )}
          />
          <PanelLeftOpen
            className={cn(
              'absolute size-6 text-[var(--primary)] transition-opacity duration-200',
              collapsed && isLogoHovered ? 'opacity-100' : 'opacity-0',
            )}
          />
        </div>

        {/* Brand Text */}
        <div
          className={cn(
            'ml-3 flex flex-col whitespace-nowrap overflow-hidden transition-opacity duration-200',
            collapsed ? 'opacity-0 pointer-events-none' : 'opacity-100',
          )}
        >
          <p className="text-sm font-semibold text-[var(--foreground)]">知序</p>
          <p className="text-xs text-[var(--muted-foreground)]">管理终端</p>
        </div>

        {/* Collapse Toggle Button */}
        <div
          className={cn(
            'absolute right-4 transition-opacity duration-200',
            collapsed ? 'opacity-0 pointer-events-none' : 'opacity-100',
          )}
        >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-10 rounded-2xl border border-[rgba(193,198,214,0.18)] bg-[var(--surface-container-high)] text-[var(--foreground)] shadow-sm hover:bg-[var(--surface-container-highest)]"
            aria-label="收起侧边栏"
            onClick={onToggle}
          >
            <PanelLeftClose className="size-4" />
          </Button>
        </div>
      </div>

      {/* Nav */}
      <nav className="space-y-1.5 overflow-hidden flex flex-col px-3">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              cn(
                'flex items-center rounded-2xl py-3 text-sm font-medium text-[var(--muted-foreground)] hover:bg-[var(--surface-container-high)] hover:text-[var(--foreground)]',
                collapsed ? 'justify-center px-0' : 'px-3',
                isActive && 'bg-[var(--surface-container-highest)] text-[var(--foreground)] shadow-[inset_0_0_0_1px_rgba(193,198,214,0.18)]',
              )
            }
          >
            <div className="flex size-5 shrink-0 items-center justify-center">
              <item.icon className="size-4" />
            </div>
            <span
              className={cn(
                'overflow-hidden whitespace-nowrap transition-[max-width,opacity,margin] duration-300',
                collapsed ? 'max-w-0 opacity-0 ml-0' : 'max-w-[180px] opacity-100 ml-3',
              )}
            >
              {item.label}
            </span>
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
