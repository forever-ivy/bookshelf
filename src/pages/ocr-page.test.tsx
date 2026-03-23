import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { OcrPage } from '@/pages/ocr-page'

vi.mock('@/lib/api/inventory', () => ({
  submitOcrIngest: vi.fn(),
}))

function TestProviders({ children }: PropsWithChildren) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('ocr page', () => {
  it('renders the redesigned ocr workspace shell', () => {
    render(
      <TestProviders>
        <OcrPage />
      </TestProviders>,
    )

    expect(screen.getByText('图像入柜')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '识别工作区' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '识别结果台' })).toBeInTheDocument()
  })
})
