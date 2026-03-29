import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { WorkspacePanel } from '@/components/shared/workspace-panel'

describe('WorkspacePanel', () => {
  it('keeps the title block flexible when actions are present', () => {
    const { container } = render(
      <WorkspacePanel
        title="订单列表"
        description="把订单状态、处理信息和重试情况放在一起。"
        action={<div>筛选区</div>}
      >
        <div>内容区</div>
      </WorkspacePanel>,
    )

    const header = container.firstElementChild?.firstElementChild
    const titleBlock = screen.getByText('订单列表').parentElement
    const actionBlock = screen.getByText('筛选区').parentElement

    expect(header).toHaveClass('xl:flex-row')
    expect(titleBlock).toHaveClass('min-w-0')
    expect(titleBlock).toHaveClass('flex-1')
    expect(titleBlock).toHaveClass('xl:min-w-[16rem]')
    expect(actionBlock).toHaveClass('xl:shrink-0')
  })
})
