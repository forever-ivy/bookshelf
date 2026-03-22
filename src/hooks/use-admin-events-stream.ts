import { useEffect, useEffectEvent } from 'react'

import { streamJsonEvents } from '@/lib/sse'

export function useAdminEventsStream({
  enabled,
  onEvent,
}: {
  enabled: boolean
  onEvent: (event: Record<string, unknown>) => void
}) {
  const handleEvent = useEffectEvent(onEvent)

  useEffect(() => {
    if (!enabled) {
      return
    }

    const controller = new AbortController()
    streamJsonEvents('/api/v1/admin/events/stream', {
      signal: controller.signal,
      onEvent: handleEvent,
    }).catch(() => {
      // The global HTTP layer handles user-facing errors for normal requests.
      // Stream errors are intentionally quiet to avoid toast loops.
    })

    return () => {
      controller.abort()
    }
  }, [enabled])
}
