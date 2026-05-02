import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Activity, Zap, CheckCircle, XCircle, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'

const StatCard = ({ label, value, icon: Icon, color, sub }) => (
  <div className="card p-5">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-display font-bold text-white mt-1">{value ?? '—'}</p>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
        <Icon size={18} />
      </div>
    </div>
  </div>
)

export default function ProviderDashboard() {
  const { user } = useAuth()

  const { data: summary } = useQuery({
    queryKey: ['usage-summary'],
    queryFn: async () => { const { data } = await api.get('/usage/summary'); return data.data },
  })

  const { data: chartData } = useQuery({
    queryKey: ['usage-by-day'],
    queryFn: async () => { const { data } = await api.get('/usage/by-day?days=14'); return data.data.usage },
  })

  const { data: myApis } = useQuery({
    queryKey: ['apis'],
    queryFn: async () => { const { data } = await api.get('/apis'); return data.data.apis },
  })

  return (
    <div className="p-8 space-y-7 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-white">
          Welcome back, <span className="text-brand-400">{user?.name?.split(' ')[0]}</span>
        </h1>
        <p className="text-slate-400 text-sm mt-1">Your API usage overview</p>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Requests" value={summary?.totalRequests?.toLocaleString()} icon={Activity} color="bg-brand-500/10 text-brand-400" sub="All time" />
        <StatCard label="This Month"     value={summary?.monthlyRequests?.toLocaleString()} icon={TrendingUp} color="bg-brand-500/10 text-brand-400" sub="Last 30 days" />
        <StatCard label="Successful"     value={summary?.successRequests?.toLocaleString()} icon={CheckCircle} color="bg-emerald-500/10 text-emerald-400" sub="2xx responses" />
        <StatCard label="Errors"         value={summary?.errorRequests?.toLocaleString()} icon={XCircle} color="bg-red-500/10 text-red-400" sub="4xx / 5xx" />
      </div>

      {/* Chart — full width since no billing card */}
      <div className="card p-5">
        <h2 className="font-display font-semibold text-white mb-1">Request Volume</h2>
        <p className="text-xs text-slate-500 mb-5">Last 14 days</p>
        {chartData?.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="providerGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6171f3" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#6171f3" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={v => v.slice(5)} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
              <Tooltip contentStyle={{ background: '#1e2035', border: '1px solid #ffffff10', borderRadius: '8px', fontSize: '12px' }} />
              <Area type="monotone" dataKey="requests" stroke="#6171f3" strokeWidth={2} fill="url(#providerGrad)" name="Requests" />
              <Area type="monotone" dataKey="errors" stroke="#f87171" strokeWidth={1.5} fill="none" name="Errors" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-48 flex items-center justify-center text-slate-600 text-sm">
            No usage yet — consumers need to make requests via the Gateway
          </div>
        )}
      </div>

      {/* My APIs */}
      {myApis?.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-white flex items-center gap-2">
              <Zap size={16} /> My APIs
            </h2>
            <Link to="/provider/apis" className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {myApis.slice(0, 3).map(a => (
              <Link
                key={a._id}
                to={`/provider/apis/${a._id}`}
                className="bg-surface-600/50 rounded-lg p-3 border border-white/5 hover:border-brand-500/20 transition-all"
              >
                <p className="text-sm font-medium text-slate-200">{a.name}</p>
                <p className="text-xs text-slate-500 mt-1 truncate">{a.baseUrl.replace('https://', '')}</p>
                <span className={`text-[10px] mt-2 inline-block ${a.isActive ? 'badge-active' : 'badge-revoked'}`}>
                  {a.isActive ? 'Active' : 'Inactive'}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {myApis?.length === 0 && (
        <div className="card p-10 text-center">
          <Zap size={36} className="mx-auto mb-3 text-slate-700" />
          <p className="text-slate-400 font-medium">No APIs yet</p>
          <p className="text-slate-600 text-sm mt-1">Create your first API and generate keys for consumers</p>
          <Link to="/provider/apis" className="btn-primary mt-4 inline-flex items-center gap-2 text-sm">
            <Zap size={14} /> Create API
          </Link>
        </div>
      )}
    </div>
  )
}
