type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

const hasWindow = typeof window !== 'undefined'

export const storageUtils = {
  get<T = string>(key: string): T | null {
    if (!hasWindow) {
      return null
    }

    const raw = window.localStorage.getItem(key)
    if (raw === null) {
      return null
    }

    try {
      return JSON.parse(raw) as T
    } catch {
      return raw as T
    }
  },

  set(key: string, value: JsonValue | string): void {
    if (!hasWindow) {
      return
    }

    if (typeof value === 'string') {
      window.localStorage.setItem(key, value)
      return
    }

    window.localStorage.setItem(key, JSON.stringify(value))
  },

  remove(key: string): void {
    if (!hasWindow) {
      return
    }

    window.localStorage.removeItem(key)
  },

  clear(): void {
    if (!hasWindow) {
      return
    }

    window.localStorage.clear()
  },
}
