import { Inbox } from 'lucide-react'

export function EmptyState({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[rgba(193,198,214,0.35)] bg-[rgba(255,255,255,0.65)] px-6 py-10 text-center">
      <div className="rounded-2xl bg-[var(--surface-container-high)] p-3 text-[var(--primary)]">
        <Inbox className="size-5" />
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-[var(--foreground)]">{title}</h3>
        <p className="text-sm text-[var(--muted-foreground)]">{description}</p>
      </div>
    </div>
  )
}
