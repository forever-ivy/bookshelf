import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { StatusBadge } from '@/components/shared/status-badge'

describe('StatusBadge', () => {
  it('renders active states with a vivid success-green badge', () => {
    render(<StatusBadge status="active" label="启用" />)

    const badge = screen.getByText('启用').closest('div')

    expect(badge).not.toBeNull()
    expect(badge).toHaveClass('bg-[rgba(18,180,104,0.16)]')
    expect(badge).toHaveClass('text-[#0c8f54]')
  })
})
