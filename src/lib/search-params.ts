import { useState } from 'react'
import { useInRouterContext, useSearchParams } from 'react-router-dom'

export function readSearchParam(searchParams: URLSearchParams, key: string): string {
  return searchParams.get(key)?.trim() ?? ''
}

export function readOptionalSearchParam(searchParams: URLSearchParams, key: string): string | undefined {
  const value = readSearchParam(searchParams, key)
  return value || undefined
}

export function readPositiveIntSearchParam(searchParams: URLSearchParams, key: string): number | undefined {
  const value = Number(readSearchParam(searchParams, key))
  if (!Number.isInteger(value) || value <= 0) {
    return undefined
  }

  return value
}

export function patchSearchParams(
  searchParams: URLSearchParams,
  patch: Record<string, string | number | null | undefined>,
) {
  const nextSearchParams = new URLSearchParams(searchParams)

  for (const [key, value] of Object.entries(patch)) {
    if (value === null || value === undefined || value === '') {
      nextSearchParams.delete(key)
      continue
    }

    nextSearchParams.set(key, String(value))
  }

  return nextSearchParams
}

type SearchParamsOptions = {
  replace?: boolean
}

type SearchParamsSetter = (nextSearchParams: URLSearchParams, options?: SearchParamsOptions) => void

export function useOptionalSearchParams(): [URLSearchParams, SearchParamsSetter] {
  const inRouterContext = useInRouterContext()
  const [fallbackSearchParams, setFallbackSearchParams] = useState(
    () => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search),
  )

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const routerSearchParams = inRouterContext ? useSearchParams() : undefined

  if (routerSearchParams) {
    return routerSearchParams
  }

  return [
    fallbackSearchParams,
    (nextSearchParams) => {
      setFallbackSearchParams(new URLSearchParams(nextSearchParams))
    },
  ]
}
