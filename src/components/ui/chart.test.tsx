import { render, screen } from '@testing-library/react'
import { Area, AreaChart } from 'recharts'
import { describe, expect, it } from 'vitest'

import { ChartContainer } from '@/components/ui/chart'

describe('ChartContainer', () => {
  it('exposes theme variables and glass surface styling for charts', () => {
    render(
      <ChartContainer
        config={{
          series: {
            label: '借阅量',
            color: '#ff7a59',
          },
        }}
      >
        <AreaChart data={[{ label: '03-23', series: 5 }]}>
          <Area dataKey="series" />
        </AreaChart>
      </ChartContainer>,
    )

    const chartContainer = screen.getByTestId('chart-container')

    expect(chartContainer).toHaveStyle('--color-series: #ff7a59')
    expect(chartContainer.className).toContain('backdrop-blur')
    expect(chartContainer.className).toContain('bg-[linear-gradient')
  })
})
