import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/AuthProvider'
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
  { to: '/register', label: 'Register Ticket', roles: ['staff', 'manager', 'admin'] },
  { to: '/returns', label: 'Returns', roles: ['staff', 'manager', 'admin'] },
  { to: '/reconciliation', label: 'Reconciliation', roles: ['manager', 'auditor', 'admin'] },
  { to: '/draw', label: 'Draw', roles: ['admin'] },
  { to: '/export', label: 'Export', roles: ['manager', 'auditor', 'admin'] },
]

export function Layout() {
  const { session, signOut } = useAuth()
  const { data: profile } = useProfile(session?.user.id)
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const allowed = NAV.filter((item) => profile && item.roles.includes(profile.role))

  const closeMenu = () => setOpen(false)

  return (
    <div className="min-h-screen flex">
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={closeMenu}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-64 bg-brand text-white flex flex-col
          transition-transform duration-200 ease-in-out
          ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="px-5 py-5 border-b border-white/10 flex items-center justify-between">
          <div>
            <div className="font-bold text-lg">Festive Raffle</div>
            <div className="text-xs text-white/60">Fiesta 2026</div>
          </div>
          <button
            onClick={closeMenu}
            className="lg:hidden text-white/70 hover:text-white p-1"
            aria-label="Close menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {allowed.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={closeMenu}
              className={({ isActive }) =>
                `block px-3 py-2.5 rounded-md text-sm transition ${
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

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-white border-b border-gray-200 flex items-center px-4 lg:px-6 gap-3">
          <button
            onClick={() => setOpen(true)}
            className="lg:hidden p-2 -ml-2 text-gray-700 hover:bg-gray-100 rounded"
            aria-label="Open menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <div className="text-sm text-gray-500 truncate">
            {profile?.branch_id ? 'Branch User' : 'Head Office'}
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 lg:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
