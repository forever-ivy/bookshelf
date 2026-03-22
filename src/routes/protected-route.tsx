import type { PropsWithChildren } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { STORAGE_KEYS } from '@/constants/constant'
import { storageUtils } from '@/utils'

export function ProtectedRoute({ children }: PropsWithChildren) {
  const location = useLocation()
  const token = storageUtils.get<string>(STORAGE_KEYS.TOKEN)

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return children
}
