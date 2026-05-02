import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import { Activity, Key, XCircle, BookOpen, CreditCard, AlertCircle, CheckCircle } from 'lucide-react'
import { Link } from 'react-router-dom'

const StatCard = ({ label, value, icon: Icon, color }) => (
  <div className="card p-5">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-display font-bold text-white mt-1">{value ?? '0'}</p>
      </div>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
        <Icon size={18} />
      </div>
    </div>
  </div>
)

const PRESET_ICONS = { pokemon: '⚡', placeholder: '📋', weather: '🌤', crypto: '₿', products: '📦', custom: '🔧' }

export default function ConsumerDashboard() {
  const { user } = useAuth()

  const { data: usage } = useQuery({
    queryKey: ['consumer-usage'],
    queryFn: async () => { const { data } = await api.get('/consumer/usage'); return data.data },
  })

  const { data: subs } = useQuery({
    queryKey: ['my-subscriptions'],
    queryFn: async () => { const { data } = await api.get('/consumer/subscriptions'); return data.data.subscriptions },
  })

  const { data: billing } = useQuery({
    queryKey: ['current-billing'],
    queryFn: async () => { const { data } = await api.get('/billing/current'); return data.data.billing },
  })

  const activeApis = subs?.filter(s => s.status === 'active' && s.apiId?.isActive) || []
  const freeUsagePct = billing ? Math.min(100, (billing.totalRequests / billing.freeRequests) * 100) : 0
  const isOverFree = billing && billing.totalRequests > billing.freeRequests

  return (
    <div className="p-8 space-y-7 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-white">
          Hello, <span className="text-emerald-400">{user?.name?.split(' ')[0]}</span>
        </h1>
        <p className="text-slate-400 text-sm mt-1">Your API consumption overview</p>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Requests" value={usage?.totalRequests?.toLocaleString()} icon={Activity} color="bg-emerald-500/10 text-emerald-400" />
        <StatCard label="This Month"     value={usage?.monthlyRequests?.toLocaleString()} icon={Activity} color="bg-brand-500/10 text-brand-400" />
        <StatCard label="Active APIs"    value={activeApis.length} icon={Key} color="bg-amber-500/10 text-amber-400" />
        <StatCard label="Errors"         value={usage?.errorRequests?.toLocaleString()} icon={XCircle} color="bg-red-500/10 text-red-400" />
      </div>

      {/* Billing status banner */}
      {billing && (
        <div className={`rounded-xl p-4 border flex items-center justify-between gap-4 ${
          billing.status === 'paid'
            ? 'bg-emerald-500/5 border-emerald-500/20'
            : isOverFree
            ? 'bg-red-500/5 border-red-500/20'
            : 'bg-brand-500/5 border-brand-500/20'
        }`}>
          <div className="flex items-center gap-3">
            {billing.status === 'paid' ? (
              <CheckCircle size={18} className="text-emerald-400 flex-shrink-0" />
            ) : isOverFree ? (
              <AlertCircle size={18} className="text-red-400 flex-shrink-0" />
            ) : (
              <CreditCard size={18} className="text-brand-400 flex-shrink-0" />
            )}
            <div>
              <p className={`text-sm font-semibold ${billing.status === 'paid' ? 'text-emerald-400' : isOverFree ? 'text-red-400' : 'text-brand-400'}`}>
                {billing.status === 'paid'
                  ? 'Bill paid for ' + billing.month
                  : isOverFree
                  ? `Free tier exceeded — ₹${billing.amount} due for ${billing.month}`
                  : `${billing.freeRequests - billing.totalRequests} free requests remaining this month`
                }
              </p>
              <div className="mt-1.5 w-48 h-1.5 bg-surface-600 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${freeUsagePct >= 100 ? 'bg-red-500' : freeUsagePct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  style={{ width: `${freeUsagePct}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">{billing.totalRequests} / {billing.freeRequests} free requests used</p>
            </div>
          </div>
          <Link to="/consumer/billing" className={`flex-shrink-0 text-sm font-medium px-4 py-2 rounded-lg border transition-all ${
            isOverFree && billing.status !== 'paid'
              ? 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'
              : 'btn-secondary'
          }`}>
            {isOverFree && billing.status !== 'paid' ? 'Pay Now' : 'View Bill'}
          </Link>
        </div>
      )}

      {/* Subscriptions */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-white flex items-center gap-2">
            <Key size={16} /> My Subscriptions
          </h2>
          <Link to="/consumer/browse" className="btn-primary text-sm flex items-center gap-1.5">
            <BookOpen size={14} /> Browse APIs
          </Link>
        </div>
        {subs?.length === 0 ? (
          <div className="text-center py-10">
            <BookOpen size={36} className="mx-auto mb-3 text-slate-700" />
            <p className="text-slate-400 text-sm font-medium">No subscriptions yet</p>
            <p className="text-slate-600 text-xs mt-1">Browse available APIs and subscribe to start making requests</p>
            <Link to="/consumer/browse" className="btn-primary mt-4 inline-flex items-center gap-2 text-sm">
              <BookOpen size={14} /> Browse APIs
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {subs?.slice(0, 6).map(s => (
              <div key={s._id} className="bg-surface-600/50 border border-white/5 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{PRESET_ICONS[s.apiId?.category] || '🔧'}</span>
                  <div>
                    <p className="text-sm font-medium text-slate-200">{s.apiId?.name || 'Unknown API'}</p>
                    <span className={s.status === 'active' && s.apiId?.isActive ? 'badge-active' : 'badge-revoked'}>
                      {s.status === 'active' && s.apiId?.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mb-2">{s.totalRequests?.toLocaleString()} requests made</p>
                <code className="text-[10px] font-mono text-slate-600 block truncate">
                  {s.key?.slice(0, 14)}••••{s.key?.slice(-6)}
                </code>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent activity */}
      {usage?.recentLogs?.length > 0 && (
        <div className="card p-5">
          <h2 className="font-display font-semibold text-white mb-4">Recent Requests</h2>
          <div className="space-y-0 divide-y divide-white/5">
            {usage.recentLogs.map(log => (
              <div key={log._id} className="flex items-center gap-4 py-2.5 text-sm">
                <span className={`text-xs px-1.5 py-0.5 rounded font-mono flex-shrink-0 ${log.statusCode < 400 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                  {log.statusCode}
                </span>
                <span className="text-slate-400 flex-1 truncate font-mono text-xs">
                  {log.endpoint?.replace('https://', '').slice(0, 55)}
                </span>
                <span className="text-slate-500 text-xs flex-shrink-0">{log.latency}ms</span>
                <span className="text-slate-600 text-xs flex-shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
