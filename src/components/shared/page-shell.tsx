import type { PropsWithChildren, ReactNode } from 'react'

export function PageShell({
  title,
  description,
  actions,
  heroImage,
  heroPosition = 'center',
  heroLayout: _heroLayout = 'split',
  children,
}: PropsWithChildren<{
  eyebrow?: string
  title: string
  description?: string
  statusLine?: string
  actions?: ReactNode
  heroImage?: string
  heroPosition?: string
  heroLayout?: 'split' | 'stacked'
}>) {
  return (
    <div className="space-y-8">
      <div className="relative min-h-[20rem] overflow-hidden rounded-[2rem] border border-[var(--line-subtle)] bg-[var(--surface-panel)] shadow-[0_18px_36px_-34px_rgba(24,24,20,0.4)]">
        {heroImage ? (
          <div className="absolute inset-0" aria-hidden="true">
            <div
              data-testid="page-shell-hero"
              className="absolute inset-0 bg-cover bg-no-repeat opacity-[0.94]"
              style={{
                backgroundImage: `url(${heroImage})`,
                backgroundPosition: heroPosition,
              }}
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(120deg, rgba(252,249,243,0.96) 0%, rgba(252,249,243,0.9) 22%, rgba(252,249,243,0.55) 48%, rgba(255,255,255,0.8) 100%)',
              }}
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  'radial-gradient(circle at 14% 78%, rgba(251,248,242,0.95) 0%, rgba(251,248,242,0.78) 20%, rgba(251,248,242,0) 54%), radial-gradient(circle at top right, rgba(33,73,140,0.12) 0%, rgba(33,73,140,0) 42%)',
              }}
            />
          </div>
        ) : null}

        <div className="relative flex min-h-[20rem] flex-col px-6 py-6 lg:px-8 lg:py-8">
          <div className="flex justify-end">
            {actions ? <div className="rounded-[1.5rem] bg-white/44 px-3 py-3 backdrop-blur-sm">{actions}</div> : null}
          </div>

          <div data-testid="page-shell-title-panel" className="mt-auto pt-10">
            <div data-testid="page-shell-title-band" className="max-w-[34rem] space-y-4 lg:max-w-[40rem]">
              <h1 className="max-w-[8ch] text-[3rem] font-semibold leading-[0.9] tracking-[-0.085em] text-[var(--foreground)] sm:text-[3.5rem] lg:text-[4.75rem]">
                {title}
              </h1>
              {description ? (
                <p className="max-w-[28rem] text-base leading-7 text-[var(--muted-foreground)]">{description}</p>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div data-testid="page-shell-content" className="space-y-6 lg:space-y-8">
        {children}
      </div>
    </div>
  )
}
