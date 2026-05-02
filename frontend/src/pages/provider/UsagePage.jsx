import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { Activity, CheckCircle, XCircle, Clock } from 'lucide-react'

const StatusBadge = ({ code }) => {
  if (code < 300) return <span className="badge-active">{code}</span>
  if (code < 400) return <span className="badge-pending">{code}</span>
  return <span className="badge-revoked">{code}</span>
}

export default function UsagePage() {
  const { data: logs, isLoading: logsLoading } = useQuery({
    queryKey: ['usage-logs'],
    queryFn: async () => { const { data } = await api.get('/usage/logs?limit=50'); return data.data },
    refetchInterval: 15000,
  })

  const { data: chartData } = useQuery({
    queryKey: ['usage-by-day-30'],
    queryFn: async () => { const { data } = await api.get('/usage/by-day?days=30'); return data.data.usage },
  })

  const { data: summary } = useQuery({
    queryKey: ['usage-summary'],
    queryFn: async () => { const { data } = await api.get('/usage/summary'); return data.data },
  })

  return (
    <div className="p-8 space-y-7 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-white">Usage Analytics</h1>
        <p className="text-slate-400 text-sm mt-1">Detailed request logs and analytics</p>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Requests', value: summary?.totalRequests, icon: Activity, color: 'text-brand-400 bg-brand-500/10' },
          { label: 'Monthly', value: summary?.monthlyRequests, icon: Activity, color: 'text-brand-400 bg-brand-500/10' },
          { label: 'Successful', value: summary?.successRequests, icon: CheckCircle, color: 'text-emerald-400 bg-emerald-500/10' },
          { label: 'Errors', value: summary?.errorRequests, icon: XCircle, color: 'text-red-400 bg-red-500/10' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-4">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
                <Icon size={15} />
              </div>
              <div>
                <p className="text-xs text-slate-500">{label}</p>
                <p className="text-lg font-display font-bold text-white">{value?.toLocaleString() ?? '0'}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="card p-5">
        <h2 className="font-display font-semibold text-white mb-1">Daily Requests (30 days)</h2>
        <p className="text-xs text-slate-500 mb-5">Requests and errors per day</p>
        {chartData?.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={v => v.slice(5)} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
              <Tooltip
                contentStyle={{ background: '#1e2035', border: '1px solid #ffffff10', borderRadius: '8px', fontSize: '12px' }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Bar dataKey="requests" fill="#6171f3" radius={[3, 3, 0, 0]} name="Requests" />
              <Bar dataKey="errors" fill="#f87171" radius={[3, 3, 0, 0]} name="Errors" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-48 flex items-center justify-center text-slate-600 text-sm">No data yet</div>
        )}
      </div>

      {/* Request logs table */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-white">Recent Requests</h2>
          <span className="text-xs text-slate-500">{logs?.pagination?.total?.toLocaleString() || 0} total</span>
        </div>

        {logsLoading ? (
          <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-surface-600 rounded animate-pulse" />)}</div>
        ) : logs?.logs?.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Activity size={32} className="mx-auto mb-2 text-slate-700" />
            <p className="text-sm">No requests yet. Use the Gateway Tester to make requests.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-left">
                  <th className="pb-3 text-xs text-slate-500 font-medium">Endpoint</th>
                  <th className="pb-3 text-xs text-slate-500 font-medium">API</th>
                  <th className="pb-3 text-xs text-slate-500 font-medium">Status</th>
                  <th className="pb-3 text-xs text-slate-500 font-medium">Latency</th>
                  <th className="pb-3 text-xs text-slate-500 font-medium">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {logs?.logs?.map(log => (
                  <tr key={log._id} className="hover:bg-white/2 transition-colors">
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-surface-600 text-slate-400 px-1.5 py-0.5 rounded font-mono">{log.method}</span>
                        <span className="font-mono text-xs text-slate-400 truncate max-w-xs">{log.endpoint.replace('https://', '').slice(0, 50)}…</span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-4 text-xs text-slate-400">{log.apiId?.name || '—'}</td>
                    <td className="py-2.5 pr-4"><StatusBadge code={log.statusCode} /></td>
                    <td className="py-2.5 pr-4">
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <Clock size={10} />{log.latency}ms
                      </span>
                    </td>
                    <td className="py-2.5 text-xs text-slate-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
