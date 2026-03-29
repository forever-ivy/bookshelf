import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select'

function SelectHarness() {
  const [value, setValue] = useState('')

  return (
    <div>
      <output data-testid="selected-value">{value}</output>
      <Select value={value} onValueChange={setValue}>
        <SelectTrigger aria-label="状态筛选" className="w-48">
          <SelectValue placeholder="全部状态" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">全部状态</SelectItem>
          <SelectItem value="active">启用</SelectItem>
          <SelectItem value="inactive">停用</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}

describe('Select', () => {
  it('renders the selected label and commits the new value when an option is chosen', async () => {
    const user = userEvent.setup()

    render(<SelectHarness />)

    const trigger = screen.getByRole('combobox', { name: '状态筛选' })
    expect(trigger).toHaveTextContent('全部状态')

    await user.click(trigger)
    await user.click(screen.getByRole('option', { name: '启用' }))

    expect(screen.getByTestId('selected-value')).toHaveTextContent('active')
    expect(screen.getByRole('combobox', { name: '状态筛选' })).toHaveTextContent('启用')
  })
})
