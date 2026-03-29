import { Inbox } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export function EmptyState({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <Alert variant="muted" className="flex min-h-56 flex-col items-center justify-center gap-3 px-6 py-10 text-center">
      <div className="rounded-2xl bg-[var(--surface-container-high)] p-3 text-[var(--primary)]">
        <Inbox className="size-5" />
      </div>
      <div className="space-y-1">
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>{description}</AlertDescription>
      </div>
    </Alert>
  )
}
