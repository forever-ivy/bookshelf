import type { PropsWithChildren, ReactNode } from 'react'

export function PageShell({
  eyebrow = '知序',
  title,
  description,
  statusLine,
  actions,
  heroImage,
  heroPosition = 'center',
  children,
}: PropsWithChildren<{
  eyebrow?: string
  title: string
  description?: string
  statusLine?: string
  actions?: ReactNode
  heroImage?: string
  heroPosition?: string
}>) {
  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-[2rem] border border-[var(--line-subtle)] bg-[var(--surface-panel)] shadow-[0_18px_36px_-34px_rgba(24,24,20,0.4)]">
        {heroImage ? (
          <div className="absolute inset-0" aria-hidden="true">
            <div
              data-testid="page-shell-hero"
              className="absolute inset-0 bg-cover bg-no-repeat opacity-[0.92]"
              style={{
                backgroundImage: `url(${heroImage})`,
                backgroundPosition: heroPosition,
              }}
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(120deg, rgba(252,249,243,0.95) 0%, rgba(252,249,243,0.88) 26%, rgba(252,249,243,0.68) 58%, rgba(255,255,255,0.92) 100%)',
              }}
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  'radial-gradient(circle at top right, rgba(33,73,140,0.12) 0%, rgba(33,73,140,0) 42%)',
              }}
            />
          </div>
        ) : null}
        <div className="relative space-y-5 px-6 py-6 lg:px-8 lg:py-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--primary)]/80">
                {eyebrow}
              </p>
              <div className="space-y-2">
                <h1 className="text-[2.25rem] font-semibold tracking-[-0.06em] text-[var(--foreground)]">{title}</h1>
                {description ? <p className="max-w-3xl text-sm leading-7 text-[var(--muted-foreground)]">{description}</p> : null}
              </div>
            </div>
            {actions ? <div className="rounded-[1.5rem] bg-white/48 px-3 py-3 backdrop-blur-sm">{actions}</div> : null}
          </div>
          {statusLine ? (
            <div className="flex items-center gap-3 rounded-[1.1rem] border border-white/55 bg-white/36 px-4 py-3 text-sm text-[var(--muted-foreground)] backdrop-blur-sm">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--foreground)]">
                知序
              </span>
              <span className="h-1 w-1 rounded-full bg-[var(--line-strong)]" />
              <span>{statusLine}</span>
            </div>
          ) : null}
        </div>
      </div>
      <div data-testid="page-shell-content" className="space-y-6 lg:space-y-8">
        {children}
      </div>
    </div>
  )
}
