import { API_BASE_URL, STORAGE_KEYS } from '@/constants/constant'
import { storageUtils } from '@/utils'

function buildAbsoluteUrl(path: string) {
  if (path.startsWith('http')) {
    return path
  }
  return `${API_BASE_URL}${path}`
}

export async function streamJsonEvents(
  path: string,
  {
    onEvent,
    signal,
  }: {
    onEvent: (event: Record<string, unknown>) => void
    signal: AbortSignal
  },
) {
  const token = storageUtils.get<string>(STORAGE_KEYS.TOKEN)
  const response = await fetch(buildAbsoluteUrl(path), {
    method: 'GET',
    headers: {
      Accept: 'text/event-stream',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    signal,
  })

  if (!response.ok) {
    throw new Error(`SSE request failed with status ${response.status}`)
  }

  if (!response.body) {
    throw new Error('SSE response body is missing')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (!signal.aborted) {
    const { value, done } = await reader.read()
    if (done) {
      break
    }

    buffer += decoder.decode(value, { stream: true })
    const chunks = buffer.split('\n\n')
    buffer = chunks.pop() ?? ''

    for (const chunk of chunks) {
      const payload = chunk
        .split('\n')
        .filter((line) => line.startsWith('data: '))
        .map((line) => line.slice(6))
        .join('\n')

      if (!payload) {
        continue
      }

      try {
        onEvent(JSON.parse(payload) as Record<string, unknown>)
      } catch {
        // Ignore malformed chunks from the stream.
      }
    }
  }
}
