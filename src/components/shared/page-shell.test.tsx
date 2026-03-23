import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { PageShell } from '@/components/shared/page-shell'

describe('PageShell', () => {
  it('renders the poster hero as a single two-line copy block', () => {
    render(
      <PageShell title="测试页面" description="用于检查布局间距" statusLine="布局状态">
        <div>第一个区块</div>
        <div>第二个区块</div>
      </PageShell>,
    )

    const content = screen.getByTestId('page-shell-content')
    expect(content).toHaveClass('space-y-6')
    expect(content).toHaveClass('lg:space-y-8')
    expect(screen.getByTestId('page-shell-title-panel')).toBeInTheDocument()
    expect(screen.getByTestId('page-shell-title-band')).toBeInTheDocument()
    expect(screen.getByText('测试页面')).toBeInTheDocument()
    expect(screen.getByText('用于检查布局间距')).toBeInTheDocument()
    expect(screen.queryByText('知序')).not.toBeInTheDocument()
    expect(screen.queryByTestId('page-shell-meta-band')).not.toBeInTheDocument()
    expect(screen.queryByTestId('page-shell-status-chip')).not.toBeInTheDocument()
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

  it('keeps stacked hero copy on the same two-line contract', () => {
    render(
      <PageShell
        eyebrow="测试眉标"
        title="测试页面"
        description="只保留一行标题和一行小标题"
        heroLayout="stacked"
        statusLine="不应显示"
      >
        <div>第一个区块</div>
      </PageShell>,
    )

    expect(screen.queryByText('测试眉标')).not.toBeInTheDocument()
    expect(screen.getByTestId('page-shell-title-panel')).toHaveClass('mt-auto')
    expect(screen.getByText('测试页面')).toBeInTheDocument()
    expect(screen.getByText('只保留一行标题和一行小标题')).toBeInTheDocument()
    expect(screen.queryByTestId('page-shell-meta-band')).not.toBeInTheDocument()
    expect(screen.queryByTestId('page-shell-status-chip')).not.toBeInTheDocument()
  })
})
