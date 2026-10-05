import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import type { Role } from '@/lib/types'
import { Button } from './UI'

interface NavItem {
  to: string
  label: string
  roles: Role[]
}

const NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', roles: ['staff', 'manager', 'auditor', 'admin'] },
  { to: '/register', label: 'Register Receipt', roles: ['staff', 'manager', 'admin'] },
  { to: '/returns', label: 'Returns', roles: ['staff', 'manager', 'admin'] },
  { to: '/reconciliation', label: 'Reconciliation', roles: ['manager', 'auditor', 'admin'] },
  { to: '/draw', label: 'Draw', roles: ['admin'] },
  { to: '/export', label: 'Export', roles: ['manager', 'auditor', 'admin'] },
]

export function Layout() {
  const { session, signOut } = useAuth()
  const { data: profile } = useProfile(session?.user.id)
  const navigate = useNavigate()

  const allowed = NAV.filter((item) => profile && item.roles.includes(profile.role))

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-brand text-white flex flex-col">
        <div className="px-5 py-5 border-b border-white/10">
          <div className="font-bold text-lg">Festive Raffle</div>
          <div className="text-xs text-white/60">Fiesta 2026</div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {allowed.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-md text-sm transition ${
                  isActive ? 'bg-white/15 text-white' : 'text-white/80 hover:bg-white/10'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10">
          <div className="text-xs text-white/60 mb-1">{profile?.full_name}</div>
          <div className="text-xs text-white/40 mb-3 uppercase">{profile?.role}</div>
          <Button
            variant="ghost"
            className="w-full !text-white hover:!bg-white/10"
            onClick={async () => {
              await signOut()
              navigate('/login')
            }}
          >
            Sign Out
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <header className="h-14 bg-white border-b border-gray-200 flex items-center px-6">
          <div className="text-sm text-gray-500">
            {profile?.branch_id ? 'Branch User' : 'Head Office'}
          </div>
        </header>
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
