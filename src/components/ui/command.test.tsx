import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'

import { Command, CommandInput } from './command'

function ImeCommandInputHarness() {
  const [value, setValue] = useState('')
  const [tick, setTick] = useState(0)

  return (
    <div>
      <button type="button" onClick={() => setTick((current) => current + 1)}>
        rerender {tick}
      </button>
      <div data-testid="committed-value">{value}</div>
      <Command shouldFilter={false}>
        <CommandInput placeholder="搜索内容" value={value} onValueChange={setValue} />
      </Command>
    </div>
  )
}

describe('CommandInput', () => {
  it('keeps composing text visible across rerenders and commits the final value after composition ends', () => {
    render(<ImeCommandInputHarness />)

    const input = screen.getByPlaceholderText('搜索内容')
    const rerenderButton = screen.getByRole('button', { name: /rerender/i })

    fireEvent.compositionStart(input)
    fireEvent.change(input, { target: { value: 'z' } })

    expect(screen.getByTestId('committed-value')).toHaveTextContent('')
    expect(input).toHaveValue('z')

    fireEvent.click(rerenderButton)

    expect(input).toHaveValue('z')

    fireEvent.change(input, { target: { value: '中' } })
    fireEvent.compositionEnd(input)

    expect(screen.getByTestId('committed-value')).toHaveTextContent('中')
    expect(input).toHaveValue('中')
  })
})
