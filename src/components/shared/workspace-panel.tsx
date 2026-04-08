import type { PropsWithChildren, ReactNode } from 'react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

export function WorkspacePanel({
  title,
  description,
  action,
  children,
  className,
  tone = 'default',
}: PropsWithChildren<{
  title: string
  description?: string
  action?: ReactNode
  className?: string
  tone?: 'default' | 'muted'
}>) {
  return (
    <Card
      className={cn(
        'px-0 py-0',
        tone === 'default' ? 'bg-[var(--surface-panel)]' : 'bg-[rgba(255,255,255,0.42)]',
        className,
      )}
    >
      <CardHeader className="gap-3 px-6 py-6 pb-4 xl:flex-row xl:items-start xl:justify-between xl:gap-6">
        <div className="min-w-0 flex-1 space-y-1 xl:min-w-[16rem] xl:w-[18rem] xl:flex-none">
          <CardTitle className="text-2xl lg:text-[2rem]">{title}</CardTitle>
          {description ? <p className="text-sm leading-6 text-[var(--muted-foreground)]">{description}</p> : null}
        </div>
        {action ? <div className="w-full xl:flex xl:min-w-0 xl:flex-1 xl:justify-end">{action}</div> : null}
      </CardHeader>
      <Separator />
      <CardContent className="px-6 py-5">{children}</CardContent>
    </Card>
  )
}
