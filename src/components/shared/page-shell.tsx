import type { PropsWithChildren, ReactNode } from 'react'

export function PageShell({
  title,
  description,
  actions,
  heroImage,
  heroPosition = 'center',
  heroLayout = 'split',
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
  const isStacked = heroLayout === 'stacked'

  return (
    <div className="space-y-8">
      <div
        className={`relative overflow-hidden rounded-[2rem] border border-[var(--line-subtle)] bg-[var(--surface-panel)] shadow-[0_18px_36px_-34px_rgba(24,24,20,0.4)] ${
          isStacked ? 'min-h-[14rem]' : 'min-h-[20rem]'
        }`}
      >
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

        <div
          className={`relative flex flex-col px-6 py-6 lg:px-8 lg:py-8 ${
            isStacked ? 'min-h-[14rem] justify-end' : 'min-h-[20rem]'
          }`}
        >
          {actions ? (
            <div className="flex justify-end">
              <div className="rounded-[1.5rem] bg-white/44 px-3 py-3 backdrop-blur-sm">{actions}</div>
            </div>
          ) : null}

          <div data-testid="page-shell-title-panel" className={isStacked ? 'mt-auto pt-4' : 'mt-auto pt-10'}>
            <div
              data-testid="page-shell-title-band"
              className={`w-full space-y-4 ${isStacked ? 'max-w-[34rem] lg:max-w-[40rem]' : 'max-w-[36rem] lg:max-w-[44rem]'}`}
            >
              <h1
                className={`font-semibold text-[var(--foreground)] ${
                  isStacked
                    ? 'max-w-[16rem] text-[2.55rem] leading-[0.94] tracking-[-0.07em] sm:max-w-[22rem] sm:text-[3rem] lg:max-w-[28rem] lg:text-[3.8rem]'
                    : 'max-w-[18rem] text-[2.85rem] leading-[0.9] tracking-[-0.085em] sm:max-w-[24rem] sm:text-[3.35rem] lg:max-w-[32rem] lg:text-[4.2rem]'
                }`}
              >
                {title}
              </h1>
              {description ? (
                <p
                  className={`text-[var(--muted-foreground)] ${
                    isStacked
                      ? 'max-w-[32rem] text-sm leading-6 sm:max-w-[36rem] sm:text-base sm:leading-7'
                      : 'max-w-[32rem] text-base leading-7 lg:max-w-[36rem]'
                  }`}
                >
                  {description}
                </p>
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
