import type { PropsWithChildren } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { LoadingState } from '@/components/shared/loading-state'
import { useSession } from '@/providers/session-provider'

export function ProtectedRoute({ children }: PropsWithChildren) {
  const location = useLocation()
  const { status } = useSession()

  if (status === 'bootstrapping') {
    return <LoadingState label="正在核对登录信息" />
  }

  if (status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return children
}
