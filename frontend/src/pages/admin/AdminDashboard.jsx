import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Users, Zap, Activity, DollarSign, ShieldCheck } from 'lucide-react'

const StatCard = ({ label, value, icon: Icon, color }) => (
  <div className="card p-5">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-display font-bold text-white mt-1">{value ?? '—'}</p>
      </div>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
        <Icon size={18} />
      </div>
    </div>
  </div>
)

export default function AdminDashboard() {
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => { const { data } = await api.get('/admin/stats'); return data.data },
  })

  const { data: chartData } = useQuery({
    queryKey: ['admin-usage-chart'],
    queryFn: async () => { const { data } = await api.get('/admin/usage/by-day?days=14'); return data.data.usage },
  })

  const { data: usersData } = useQuery({
    queryKey: ['admin-users-recent'],
    queryFn: async () => { const { data } = await api.get('/admin/users?limit=5'); return data.data.users },
  })

  return (
    <div className="p-8 space-y-7 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-red-500/10 rounded-lg flex items-center justify-center">
          <ShieldCheck size={18} className="text-red-400" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Admin Dashboard</h1>
          <p className="text-slate-400 text-sm">Platform-wide overview</p>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={stats?.totalUsers?.toLocaleString()} icon={Users} color="bg-brand-500/10 text-brand-400" />
        <StatCard label="Total APIs" value={stats?.totalApis?.toLocaleString()} icon={Zap} color="bg-amber-500/10 text-amber-400" />
        <StatCard label="Total Requests" value={stats?.totalRequests?.toLocaleString()} icon={Activity} color="bg-emerald-500/10 text-emerald-400" />
        <StatCard label="Total Revenue" value={`₹${stats?.totalRevenue?.toFixed(2) || '0.00'}`} icon={DollarSign} color="bg-purple-500/10 text-purple-400" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="card p-5 xl:col-span-2">
          <h2 className="font-display font-semibold text-white mb-1">Platform Request Volume</h2>
          <p className="text-xs text-slate-500 mb-5">All users — last 14 days</p>
          {chartData?.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="adminGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f87171" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={v => v.slice(5)} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                <Tooltip contentStyle={{ background: '#1e2035', border: '1px solid #ffffff10', borderRadius: '8px', fontSize: '12px' }} />
                <Area type="monotone" dataKey="requests" stroke="#f87171" strokeWidth={2} fill="url(#adminGrad)" name="Requests" />
                <Area type="monotone" dataKey="errors" stroke="#fbbf24" strokeWidth={1.5} fill="none" name="Errors" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-600 text-sm">No platform data yet</div>
          )}
        </div>

        <div className="card p-5">
          <h2 className="font-display font-semibold text-white mb-4">Users by Role</h2>
          <div className="space-y-3">
            {[
              { role: 'admin', dot: 'bg-red-500', label: 'Admins' },
              { role: 'provider', dot: 'bg-brand-500', label: 'Providers' },
              { role: 'consumer', dot: 'bg-emerald-500', label: 'Consumers' },
            ].map(({ role, dot, label }) => {
              const found = stats?.usersByRole?.find(r => r._id === role)
              return (
                <div key={role} className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${dot}`} />
                  <span className="text-sm text-slate-400 flex-1">{label}</span>
                  <span className="text-sm font-semibold text-white">{found?.count || 0}</span>
                </div>
              )
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Monthly requests</span>
              <span className="text-white font-semibold">{stats?.monthlyRequests?.toLocaleString() ?? '0'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Active keys</span>
              <span className="text-white font-semibold">{stats?.totalKeys?.toLocaleString() ?? '0'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-display font-semibold text-white mb-4 flex items-center gap-2">
          <Users size={16} /> Recent Users
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-left">
                <th className="pb-3 text-xs text-slate-500 font-medium">Name</th>
                <th className="pb-3 text-xs text-slate-500 font-medium">Email</th>
                <th className="pb-3 text-xs text-slate-500 font-medium">Role</th>
                <th className="pb-3 text-xs text-slate-500 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {usersData?.map(u => (
                <tr key={u._id} className="hover:bg-white/2 transition-colors">
                  <td className="py-3 text-slate-200 font-medium">{u.name}</td>
                  <td className="py-3 text-slate-400">{u.email}</td>
                  <td className="py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                      u.role === 'admin' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                      u.role === 'provider' ? 'bg-brand-500/10 text-brand-400 border-brand-500/20' :
                      'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    }`}>{u.role}</span>
                  </td>
                  <td className="py-3 text-slate-500 text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
