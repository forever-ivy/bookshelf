import type { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'

export function StatCard({
  title,
  value,
  hint,
  icon,
}: {
  title: string
  value: string | number
  hint?: string
  icon?: ReactNode
}) {
  return (
    <Card className="group relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_40px_-12px_rgba(0,91,191,0.15)] hover:border-white/60">
      {/* 极简反光特效点缀 */}
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-[linear-gradient(135deg,var(--primary),var(--primary-container))] opacity-10 blur-2xl transition-opacity duration-300 group-hover:opacity-20" />
      
      <CardContent className="relative p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium tracking-wide text-[var(--muted-foreground)]">{title}</p>
            <h3 className="text-4xl font-bold tracking-tight text-[var(--foreground)]">{value}</h3>
          </div>
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/60 shadow-[inset_0_1px_1px_rgba(255,255,255,1)]">
            {icon}
          </div>
        </div>
        {hint && (
          <div className="mt-4">
            <p className="text-xs font-medium text-[var(--muted-foreground)]/80">{hint}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
