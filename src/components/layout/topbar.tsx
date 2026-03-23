import { Search } from 'lucide-react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { useSession } from '@/providers/session-provider'

export function Topbar() {
  const { account } = useSession()
  const initials = account?.username ? account.username.slice(0, 2).toUpperCase() : 'AD'

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[var(--line-subtle)] bg-[rgba(247,244,238,0.78)] px-5 py-4 backdrop-blur-md lg:px-8">
      <div className="relative hidden w-full max-w-xl items-center md:flex">
        <Search className="pointer-events-none absolute left-4 size-4 text-[var(--muted-foreground)]" />
        <Input className="h-12 rounded-full border-[var(--line-subtle)] bg-[rgba(255,251,244,0.78)] pl-10 pr-20" placeholder="搜索图书、订单、读者与告警" />
        <span className="pointer-events-none absolute right-3 rounded-full border border-[var(--line-subtle)] px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
          Cmd K
        </span>
      </div>
      <div className="ml-auto flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-medium text-[var(--foreground)]">{account?.username ?? '治理员'}</p>
          <p className="text-xs text-[var(--muted-foreground)]">当班治理席</p>
        </div>
        <Avatar>
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
