import { useCallback, useSyncExternalStore } from 'react'

const STORAGE_KEY = 'sidebar-collapsed'

// Simple external store backed by localStorage
let collapsed = (() => {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
})()

const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return collapsed
}

function setCollapsed(value: boolean) {
  collapsed = value
  try {
    localStorage.setItem(STORAGE_KEY, String(value))
  } catch {
    // ignore
  }
  listeners.forEach((l) => l())
}

export function useSidebar() {
  const isCollapsed = useSyncExternalStore(subscribe, getSnapshot)
  const toggle = useCallback(() => setCollapsed(!collapsed), [])
  return { collapsed: isCollapsed, toggle } as const
}
