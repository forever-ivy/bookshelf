import * as React from 'react'
import * as RechartsPrimitive from 'recharts'

import { cn } from '@/lib/utils'

export type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode
    color?: string
  }
>

type ChartContextValue = {
  config: ChartConfig
}

const ChartContext = React.createContext<ChartContextValue | null>(null)

function useChart() {
  const context = React.useContext(ChartContext)

  if (!context) {
    throw new Error('Chart components must be used within <ChartContainer />')
  }

  return context
}

type ChartStyle = React.CSSProperties & Record<`--color-${string}`, string>

export function ChartContainer({
  config,
  className,
  children,
}: {
  config: ChartConfig
  className?: string
  children: React.ReactNode
}) {
  const style = Object.entries(config).reduce<ChartStyle>((accumulator, [key, value]) => {
    if (value.color) {
      accumulator[`--color-${key}`] = value.color
    }

    return accumulator
  }, {})

  const isJsdom =
    typeof window !== 'undefined' &&
    typeof window.navigator !== 'undefined' &&
    window.navigator.userAgent.includes('jsdom')

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-testid="chart-container"
        className={cn(
          'relative isolate h-[320px] w-full min-w-0 overflow-hidden rounded-[1.35rem] border border-white/65 bg-[linear-gradient(180deg,rgba(255,255,255,0.58)_0%,rgba(255,255,255,0.24)_100%)] p-4 backdrop-blur-[18px]',
          'shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_18px_40px_-30px_rgba(57,99,187,0.35)]',
          'before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_top_left,rgba(74,141,255,0.16),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(255,122,89,0.14),transparent_38%)] before:content-[\'\']',
          '[&_.recharts-cartesian-axis-line]:stroke-[var(--line-subtle)]',
          '[&_.recharts-cartesian-axis-tick_line]:stroke-[var(--line-subtle)]',
          '[&_.recharts-polar-grid_concentric-circle]:stroke-[var(--line-subtle)]',
          '[&_.recharts-polar-grid-angle-line]:stroke-[var(--line-subtle)]',
          '[&_.recharts-text]:fill-[var(--muted-foreground)]',
          className,
        )}
        style={style}
      >
        {isJsdom && React.isValidElement(children)
          ? React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
              width: 640,
              height: 320,
            })
          : (
              <RechartsPrimitive.ResponsiveContainer width="100%" height="100%">
                {children}
              </RechartsPrimitive.ResponsiveContainer>
            )}
      </div>
    </ChartContext.Provider>
  )
}

export const ChartTooltip = RechartsPrimitive.Tooltip
export const ChartLegend = RechartsPrimitive.Legend

type ChartPayloadItem = {
  color?: string
  dataKey?: string | number
  name?: string
  value?: number | string
  payload?: Record<string, unknown>
}

export function ChartTooltipContent({
  active,
  payload,
  label,
  hideLabel = false,
  indicator = 'dot',
  labelFormatter,
  formatter,
}: {
  active?: boolean
  payload?: ChartPayloadItem[]
  label?: string | number
  hideLabel?: boolean
  indicator?: 'dot' | 'line'
  labelFormatter?: (label: string | number | undefined, payload: ChartPayloadItem[]) => React.ReactNode
  formatter?: (
    value: number | string | undefined,
    name: string,
    item: ChartPayloadItem,
    index: number,
  ) => React.ReactNode
}) {
  const { config } = useChart()

  if (!active || !payload?.length) {
    return null
  }

  const rows = payload.filter((item) => item?.value !== undefined && item?.value !== null)

  if (!rows.length) {
    return null
  }

  return (
    <div className="grid min-w-[180px] gap-2 rounded-[1rem] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.86)_0%,rgba(255,255,255,0.64)_100%)] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_16px_40px_-28px_rgba(44,79,145,0.34)] backdrop-blur-[16px]">
      {!hideLabel ? (
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
          {labelFormatter ? labelFormatter(label, rows) : label}
        </p>
      ) : null}
      <div className="grid gap-1.5">
        {rows.map((item, index) => {
          const key = String(item.dataKey ?? item.name ?? `item-${index}`)
          const itemConfig = config[key]
          const accent = item.color ?? itemConfig?.color ?? 'var(--primary)'
          const itemLabel = itemConfig?.label ?? item.name ?? key
          const formattedValue = formatter ? formatter(item.value, String(itemLabel), item, index) : item.value

          return (
            <div key={key} className="flex items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
                <span
                  className={cn(
                    'shrink-0 rounded-full',
                    indicator === 'dot' ? 'size-2.5' : 'h-0.5 w-3',
                  )}
                  style={{ backgroundColor: accent }}
                />
                <span>{itemLabel}</span>
              </div>
              <span className="font-semibold text-[var(--foreground)]">{formattedValue}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function ChartLegendContent({
  payload,
  className,
}: {
  payload?: Array<{ color?: string; dataKey?: string | number; value?: string }>
  className?: string
}) {
  const { config } = useChart()

  if (!payload?.length) {
    return null
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-3 pt-2', className)}>
      {payload.map((item, index) => {
        const key = String(item.dataKey ?? item.value ?? `legend-${index}`)
        const itemConfig = config[key]
        const accent = item.color ?? itemConfig?.color ?? 'var(--primary)'
        const label = itemConfig?.label ?? item.value ?? key

        return (
          <div key={key} className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: accent }} />
            <span>{label}</span>
          </div>
        )
      })}
    </div>
  )
}
