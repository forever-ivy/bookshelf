import { STORAGE_KEYS } from '@/constants/constant'
import type { AuthAccount, AuthPayload, IdentityPayload } from '@/types/domain'
import { storageUtils } from '@/utils'

export type SessionSnapshot = {
  token: string | null
  refreshToken: string | null
  account: AuthAccount | null
}

type SessionListener = (snapshot: SessionSnapshot) => void

const listeners = new Set<SessionListener>()

function emit(snapshot: SessionSnapshot) {
  for (const listener of listeners) {
    listener(snapshot)
  }
}

function writeSnapshot(snapshot: SessionSnapshot) {
  if (snapshot.token) {
    storageUtils.set(STORAGE_KEYS.TOKEN, snapshot.token)
  } else {
    storageUtils.remove(STORAGE_KEYS.TOKEN)
  }

  if (snapshot.refreshToken) {
    storageUtils.set(STORAGE_KEYS.REFRESH_TOKEN, snapshot.refreshToken)
  } else {
    storageUtils.remove(STORAGE_KEYS.REFRESH_TOKEN)
  }

  if (snapshot.account) {
    storageUtils.set(STORAGE_KEYS.ACCOUNT, snapshot.account)
  } else {
    storageUtils.remove(STORAGE_KEYS.ACCOUNT)
  }

  emit(snapshot)
}

export function getSessionSnapshot(): SessionSnapshot {
  return {
    token: storageUtils.get<string>(STORAGE_KEYS.TOKEN),
    refreshToken: storageUtils.get<string>(STORAGE_KEYS.REFRESH_TOKEN),
    account: storageUtils.get<AuthAccount>(STORAGE_KEYS.ACCOUNT),
  }
}

export function setStoredSession(payload: AuthPayload) {
  writeSnapshot({
    token: payload.access_token,
    refreshToken: payload.refresh_token,
    account: payload.account,
  })
}

export function syncStoredIdentity(payload: IdentityPayload) {
  const current = getSessionSnapshot()
  writeSnapshot({
    token: current.token,
    refreshToken: current.refreshToken,
    account: payload.account,
  })
}

export function clearStoredSession() {
  writeSnapshot({
    token: null,
    refreshToken: null,
    account: null,
  })
}

export function subscribeSession(listener: SessionListener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
