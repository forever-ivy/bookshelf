import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { PageShell } from '@/components/shared/page-shell'

describe('PageShell', () => {
  it('adds vertical spacing between stacked workspace sections', () => {
    render(
      <PageShell title="测试页面" description="用于检查布局间距" statusLine="布局状态">
        <div>第一个区块</div>
        <div>第二个区块</div>
      </PageShell>,
    )

    const content = screen.getByTestId('page-shell-content')
    expect(content).toHaveClass('space-y-6')
    expect(content).toHaveClass('lg:space-y-8')
  })

  it('renders a masked hero backdrop when a page image is provided', () => {
    render(
      <PageShell
        title="测试页面"
        description="用于检查头图遮罩"
        statusLine="布局状态"
        heroImage="/dashboard/dashboard-1.jpg"
        heroPosition="center 35%"
      >
        <div>第一个区块</div>
      </PageShell>,
    )

    const hero = screen.getByTestId('page-shell-hero')
    expect(hero).toBeInTheDocument()
    expect(hero).toHaveStyle({
      backgroundImage: 'url(/dashboard/dashboard-1.jpg)',
      backgroundPosition: 'center 35%',
    })
  })
})
