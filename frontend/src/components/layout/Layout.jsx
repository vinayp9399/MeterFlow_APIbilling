import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  LayoutDashboard, Zap, BarChart3, CreditCard, Globe,
  LogOut, User, ChevronRight, Activity, Users, ShieldCheck,
  BookOpen, Key
} from 'lucide-react'

const NAV_BY_ROLE = {
  admin: [
    { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/users',     icon: Users,           label: 'Users' },
    { to: '/admin/apis',      icon: Zap,             label: 'All APIs' },
  ],
  provider: [
    { to: '/provider/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/provider/apis',      icon: Zap,             label: 'My APIs' },
    { to: '/provider/usage',     icon: BarChart3,        label: 'Usage' },
    { to: '/gateway',            icon: Globe,            label: 'Gateway Tester' },
  ],
  consumer: [
    { to: '/consumer/dashboard',     icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/consumer/browse',        icon: BookOpen,        label: 'Browse APIs' },
    { to: '/consumer/subscriptions', icon: Key,             label: 'My Subscriptions' },
    { to: '/consumer/billing',       icon: CreditCard,      label: 'Billing' },
    { to: '/gateway',                icon: Globe,           label: 'Gateway Tester' },
  ],
}

const ROLE_BADGE = {
  admin:    { label: 'Admin',    className: 'bg-red-500/10 text-red-400 border border-red-500/20' },
  provider: { label: 'Provider', className: 'bg-brand-500/10 text-brand-400 border border-brand-500/20' },
  consumer: { label: 'Consumer', className: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' },
}

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const navItems = NAV_BY_ROLE[user?.role] || NAV_BY_ROLE.consumer
  const badge = ROLE_BADGE[user?.role] || ROLE_BADGE.consumer

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen bg-surface-900">
      <aside className="w-60 flex-shrink-0 bg-surface-800 border-r border-white/5 flex flex-col">
        <div className="p-5 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <Activity size={16} className="text-white" />
            </div>
            <div>
              <span className="font-display font-bold text-white text-lg leading-none">MeterFlow</span>
              <p className="text-[10px] text-slate-500 mt-0.5 leading-none">API Billing Platform</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
                  isActive
                    ? 'bg-brand-600/15 text-brand-400 border border-brand-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`
              }
            >
              <Icon size={16} />
              <span className="flex-1">{label}</span>
              <ChevronRight size={12} className="opacity-0 group-hover:opacity-50 transition-opacity" />
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-white/5">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-surface-600/50 mb-1">
            <div className="w-7 h-7 bg-brand-700 rounded-full flex items-center justify-center flex-shrink-0">
              <User size={13} className="text-brand-300" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-200 truncate">{user?.name}</p>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${badge.className}`}>
                {badge.label}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-slate-500 hover:text-red-400 hover:bg-red-500/5 transition-all duration-150"
          >
            <LogOut size={15} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
