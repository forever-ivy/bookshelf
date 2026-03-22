import { Search } from 'lucide-react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { useSession } from '@/providers/session-provider'

export function Topbar() {
  const { account } = useSession()
  const initials = account?.username ? account.username.slice(0, 2).toUpperCase() : 'AD'

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/40 bg-white/60 px-5 py-4 shadow-[0_4px_32px_rgba(0,0,0,0.02)] backdrop-blur-2xl lg:px-8">
      <div className="relative hidden w-full max-w-xl items-center md:flex">
        <Search className="pointer-events-none absolute left-4 size-4 text-[var(--muted-foreground)]" />
        <Input className="pl-10" placeholder="全局搜索订单、读者、图书、事件…" />
      </div>
      <div className="ml-auto flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-medium text-[var(--foreground)]">{account?.username ?? '管理员'}</p>
          <p className="text-xs text-[var(--muted-foreground)]">后台运营席</p>
        </div>
        <Avatar>
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
