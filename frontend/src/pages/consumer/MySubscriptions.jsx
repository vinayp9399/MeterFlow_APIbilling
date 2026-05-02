import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'
import { Key, Copy, Check, Globe } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

const PRESET_ICONS = { pokemon: '⚡', placeholder: '📋', weather: '🌤', crypto: '₿', products: '📦', custom: '🔧' }

const CopyButton = ({ text }) => {
  const [copied, setCopied] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      className="text-slate-500 hover:text-slate-300 transition-colors p-1">
      {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
    </button>
  )
}

export default function MySubscriptions() {
  const { data: subs, isLoading } = useQuery({
    queryKey: ['my-subscriptions'],
    queryFn: async () => { const { data } = await api.get('/consumer/subscriptions'); return data.data.subscriptions },
  })

  return (
    <div className="p-8 animate-fade-in">
      <div className="mb-7">
        <h1 className="text-2xl font-display font-bold text-white">My Subscriptions</h1>
        <p className="text-slate-400 text-sm mt-1">{subs?.length || 0} API subscriptions</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="card h-24 animate-pulse" />)}</div>
      ) : subs?.length === 0 ? (
        <div className="card p-16 text-center">
          <Key size={40} className="text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">No subscriptions yet</p>
          <Link to="/consumer/browse" className="btn-primary mt-4 inline-flex items-center gap-2 text-sm">Browse APIs</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {subs?.map(s => (
            <div key={s._id} className="card p-5 flex items-center gap-5">
              <div className="text-2xl flex-shrink-0">{PRESET_ICONS[s.apiId?.category] || '🔧'}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-slate-200 text-sm">{s.apiId?.name || 'Unknown API'}</h3>
                  <span className={s.status === 'active' && s.apiId?.isActive ? 'badge-active' : 'badge-revoked'}>
                    {s.status === 'active' && s.apiId?.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-600 font-mono mb-2">
                  <Globe size={10} />
                  <span className="truncate">{s.apiId?.baseUrl?.replace('https://', '')}</span>
                </div>
                <div className="flex items-center gap-2 bg-surface-600/50 rounded px-2 py-1.5 w-fit">
                  <code className="text-xs font-mono text-slate-400">
                    {s.key?.slice(0, 14)}••••{s.key?.slice(-6)}
                  </code>
                  <CopyButton text={s.key} />
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-slate-500">Requests made</p>
                <p className="text-lg font-display font-bold text-white">{s.totalRequests?.toLocaleString() || 0}</p>
                {s.lastUsedAt && (
                  <p className="text-[10px] text-slate-600 mt-1">Last: {new Date(s.lastUsedAt).toLocaleDateString()}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {subs?.length > 0 && (
        <div className="mt-5 text-center">
          <Link to="/gateway" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
            Use Gateway Tester to make requests →
          </Link>
        </div>
      )}
    </div>
  )
}
