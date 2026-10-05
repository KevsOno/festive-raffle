import { Navigate, Outlet } from 'react-router-dom'
import type { Role } from '@/lib/types'
import { useAuth } from '@/hooks/AuthProvider'
import { useProfile } from '@/hooks/useProfile'
import { Spinner } from './UI'

function FullPageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center text-brand">
      <Spinner />
    </div>
  )
}

export function AuthGuard() {
  const { session, loading } = useAuth()

  if (loading) return <FullPageLoader />
  if (!session) return <Navigate to="/login" replace />
  return <Outlet />
}

export function RoleGuard({ roles }: { roles: Role[] }) {
  const { session, loading: authLoading } = useAuth()
  const { data: profile, isLoading: profileLoading } = useProfile(session?.user.id)

  // Wait for auth to settle before making any routing decision
  if (authLoading) return <FullPageLoader />
  if (!session) return <Navigate to="/login" replace />

  // Wait for profile before checking role
  if (profileLoading) return <FullPageLoader />
  if (!profile || !profile.is_active) return <Navigate to="/login" replace />

  if (!roles.includes(profile.role)) return <Navigate to="/" replace />

  return <Outlet />
}
