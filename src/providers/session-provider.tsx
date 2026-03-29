import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react'

import { fetchAdminIdentity } from '@/lib/api/auth'
import {
  clearStoredSession,
  getSessionSnapshot,
  setStoredSession,
  subscribeSession,
  syncStoredIdentity,
  type SessionSnapshot,
} from '@/lib/session-store'
import type { AuthAccount, AuthPayload } from '@/types/domain'

export type SessionStatus = 'bootstrapping' | 'authenticated' | 'unauthenticated'

type SessionContextValue = {
  token: string | null
  refreshToken: string | null
  account: AuthAccount | null
  status: SessionStatus
  isAuthenticated: boolean
  setSession: (payload: AuthPayload) => void
  clearSession: () => void
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({ children }: PropsWithChildren) {
  const [snapshot, setSnapshot] = useState<SessionSnapshot>(() => getSessionSnapshot())
  const [status, setStatus] = useState<SessionStatus>(() => (getSessionSnapshot().token ? 'bootstrapping' : 'unauthenticated'))

  useEffect(() => subscribeSession(setSnapshot), [])

  useEffect(() => {
    if (!snapshot.token) {
      setStatus('unauthenticated')
      return
    }

    setStatus((current) => (current === 'unauthenticated' ? 'authenticated' : current))
  }, [snapshot.token])

  useEffect(() => {
    if (!snapshot.token) {
      return
    }

    let cancelled = false
    setStatus('bootstrapping')
    void fetchAdminIdentity()
      .then((identity) => {
        if (cancelled) {
          return
        }
        syncStoredIdentity(identity)
        setStatus('authenticated')
      })
      .catch(() => {
        if (cancelled) {
          return
        }
        clearStoredSession()
        setStatus('unauthenticated')
      })

    return () => {
      cancelled = true
    }
  }, [snapshot.token])

  const setSession = (payload: AuthPayload) => {
    setStoredSession(payload)
    setStatus('authenticated')
  }

  const clearSession = () => {
    clearStoredSession()
    setStatus('unauthenticated')
  }

  return (
    <SessionContext.Provider
      value={{
        token: snapshot.token,
        refreshToken: snapshot.refreshToken,
        account: snapshot.account,
        status,
        isAuthenticated: status === 'authenticated' && Boolean(snapshot.token),
        setSession,
        clearSession,
      }}
    >
      {children}
    </SessionContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSession() {
  const context = useContext(SessionContext)
  if (!context) {
    throw new Error('useSession must be used within SessionProvider')
  }
  return context
}
