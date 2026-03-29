import { Skeleton } from '@/components/ui/skeleton'

export function LoadingState({ label = '正在载入' }: { label?: string }) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center gap-4 rounded-[1.5rem] border border-[rgba(193,198,214,0.2)] bg-white/70 px-6 py-10 text-sm text-[var(--muted-foreground)]">
      <div className="w-full max-w-sm space-y-3">
        <Skeleton className="h-4 w-24 rounded-full bg-[var(--surface-container-high)]" />
        <Skeleton className="h-12 w-full rounded-2xl bg-[var(--surface-container-high)]" />
        <Skeleton className="h-12 w-5/6 rounded-2xl bg-[var(--surface-container-high)]" />
      </div>
      <p>{label}</p>
    </div>
  )
}
