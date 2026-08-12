import { Navigate, Outlet, useLocation } from 'react-router'

import { Skeleton } from '@/components/ui/skeleton'
import type { Role } from '@/lib/types'

import { useAuth } from './useAuth'

/**
 * These guards decide which screen to *render*, never who is allowed to do what
 * — the API is the authority on that (Non-negotiable I). Routing a player away
 * from /teams saves them a 403 they can't act on; it does not enforce anything.
 */

function RestoringSheet() {
  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-14" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-4 h-9 w-64" />
      <div className="mt-10 space-y-3">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  )
}

export function RequireAuth() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'restoring') return <RestoringSheet />
  if (status === 'anonymous') return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <Outlet />
}

export function RequireRole({ allow }: { allow: readonly Role[] }) {
  const { user } = useAuth()

  if (!user) return <Navigate to="/login" replace />
  if (!allow.includes(user.role)) return <Navigate to="/" replace />
  return <Outlet />
}

/** Where "/" means depends on what you do here. */
export function RoleHome() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={user.role === 'player' ? '/profile' : '/teams'} replace />
}
