import { Navigate, Outlet } from 'react-router-dom'
import type { Role } from '@/lib/types'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { Spinner } from './UI'

export function AuthGuard() {
  const { session, loading } = useAuth()
  if (loading) return <FullPageLoader />
  if (!session) return <Navigate to="/login" replace />
  return <Outlet />
}

export function RoleGuard({ roles }: { roles: Role[] }) {
  const { session } = useAuth()
  const { data: profile, isLoading } = useProfile(session?.user.id)
  if (isLoading) return <FullPageLoader />
  if (!profile || !profile.is_active) return <Navigate to="/login" replace />
  if (!roles.includes(profile.role)) return <Navigate to="/" replace />
  return <Outlet />
}

function FullPageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center text-brand">
      <Spinner />
    </div>
  )
}
