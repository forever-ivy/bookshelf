import { createContext, useContext, useState, type PropsWithChildren } from 'react'

import { STORAGE_KEYS } from '@/constants/constant'
import type { AuthAccount, AuthPayload } from '@/types/domain'
import { storageUtils } from '@/utils'

type SessionContextValue = {
  token: string | null
  refreshToken: string | null
  account: AuthAccount | null
  isAuthenticated: boolean
  setSession: (payload: AuthPayload) => void
  clearSession: () => void
}

const SessionContext = createContext<SessionContextValue | null>(null)

function getStoredAccount() {
  return storageUtils.get<AuthAccount>(STORAGE_KEYS.ACCOUNT)
}

export function SessionProvider({ children }: PropsWithChildren) {
  const [token, setToken] = useState(() => storageUtils.get<string>(STORAGE_KEYS.TOKEN))
  const [refreshToken, setRefreshToken] = useState(() => storageUtils.get<string>(STORAGE_KEYS.REFRESH_TOKEN))
  const [account, setAccount] = useState<AuthAccount | null>(() => getStoredAccount())

  const setSession = (payload: AuthPayload) => {
    storageUtils.set(STORAGE_KEYS.TOKEN, payload.access_token)
    storageUtils.set(STORAGE_KEYS.REFRESH_TOKEN, payload.refresh_token)
    storageUtils.set(STORAGE_KEYS.ACCOUNT, payload.account)
    setToken(payload.access_token)
    setRefreshToken(payload.refresh_token)
    setAccount(payload.account)
  }

  const clearSession = () => {
    storageUtils.remove(STORAGE_KEYS.TOKEN)
    storageUtils.remove(STORAGE_KEYS.REFRESH_TOKEN)
    storageUtils.remove(STORAGE_KEYS.ACCOUNT)
    setToken(null)
    setRefreshToken(null)
    setAccount(null)
  }

  return (
    <SessionContext.Provider
      value={{
        token,
        refreshToken,
        account,
        isAuthenticated: Boolean(token),
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
