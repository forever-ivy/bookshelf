export function LoadingState({ label = '正在载入' }: { label?: string }) {
  return (
    <div className="flex min-h-56 items-center justify-center rounded-2xl border border-[rgba(193,198,214,0.2)] bg-white/70 text-sm text-[var(--muted-foreground)]">
      {label}
    </div>
  )
}
