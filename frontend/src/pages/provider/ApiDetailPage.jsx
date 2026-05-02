import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import {
  ArrowLeft, Key, Plus, RefreshCw, Ban, Copy, Check,
  Shield, Zap, Clock, Globe
} from 'lucide-react'

const CopyButton = ({ text }) => {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy} className="text-slate-500 hover:text-slate-300 transition-colors p-1">
      {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
    </button>
  )
}

export default function ApiDetailPage() {
  const { id } = useParams()
  const [keyName, setKeyName] = useState('')
  const [showKeyForm, setShowKeyForm] = useState(false)
  const [newKey, setNewKey] = useState(null)
  const queryClient = useQueryClient()

  const { data: apiData, isLoading } = useQuery({
    queryKey: ['api', id],
    queryFn: async () => { const { data } = await api.get(`/apis/${id}`); return data.data.api },
  })

  const { data: keys, isLoading: keysLoading } = useQuery({
    queryKey: ['api-keys', id],
    queryFn: async () => { const { data } = await api.get(`/apis/${id}/keys`); return data.data.apiKeys },
  })

  const generateMutation = useMutation({
    mutationFn: (name) => api.post(`/apis/${id}/keys`, { name }),
    onSuccess: (res) => {
      setNewKey(res.data.data.apiKey)
      setKeyName('')
      setShowKeyForm(false)
      queryClient.invalidateQueries({ queryKey: ['api-keys', id] })
    },
  })

  const revokeMutation = useMutation({
    mutationFn: (keyId) => api.patch(`/apis/${id}/keys/${keyId}/revoke`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['api-keys', id] }),
  })

  const rotateMutation = useMutation({
    mutationFn: (keyId) => api.post(`/apis/${id}/keys/${keyId}/rotate`),
    onSuccess: (res) => {
      setNewKey(res.data.data.apiKey)
      queryClient.invalidateQueries({ queryKey: ['api-keys', id] })
    },
  })

  if (isLoading) return (
    <div className="p-8 flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-8 animate-fade-in max-w-4xl">
      <Link to="/provider/apis" className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-200 text-sm mb-6 transition-colors">
        <ArrowLeft size={15} /> Back to APIs
      </Link>

      {/* API Info */}
      <div className="card p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-xl font-display font-bold text-white">{apiData?.name}</h1>
            <p className="text-slate-400 text-sm mt-1">{apiData?.description || 'No description'}</p>
          </div>
          <span className={apiData?.isActive ? 'badge-active' : 'badge-revoked'}>
            {apiData?.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-surface-600/50 rounded-lg p-3">
            <div className="flex items-center gap-1.5 text-slate-500 text-xs mb-1"><Globe size={11} /> Base URL</div>
            <p className="text-xs font-mono text-slate-300 truncate">{apiData?.baseUrl}</p>
          </div>
          <div className="bg-surface-600/50 rounded-lg p-3">
            <div className="flex items-center gap-1.5 text-slate-500 text-xs mb-1"><Zap size={11} /> Rate Limit</div>
            <p className="text-sm font-semibold text-white">{apiData?.rateLimit?.requestsPerMinute}<span className="text-xs text-slate-500 font-normal"> /min</span></p>
          </div>
          <div className="bg-surface-600/50 rounded-lg p-3">
            <div className="flex items-center gap-1.5 text-slate-500 text-xs mb-1"><Shield size={11} /> Free Requests</div>
            <p className="text-sm font-semibold text-white">{apiData?.pricing?.freeRequestsPerMonth?.toLocaleString()}<span className="text-xs text-slate-500 font-normal"> /mo</span></p>
          </div>
          <div className="bg-surface-600/50 rounded-lg p-3">
            <div className="flex items-center gap-1.5 text-slate-500 text-xs mb-1"><Clock size={11} /> Price</div>
            <p className="text-sm font-semibold text-white">₹{apiData?.pricing?.pricePerHundredRequests}<span className="text-xs text-slate-500 font-normal"> /100 req</span></p>
          </div>
        </div>
      </div>

      {/* New key revealed */}
      {newKey && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 mb-6 animate-slide-up">
          <p className="text-emerald-400 font-medium text-sm mb-2 flex items-center gap-2">
            <Check size={15} /> API key generated — copy it now, it won't be shown again
          </p>
          <div className="flex items-center gap-2 bg-surface-700 rounded-lg px-3 py-2">
            <code className="text-emerald-300 font-mono text-xs flex-1 break-all">{newKey.key}</code>
            <CopyButton text={newKey.key} />
          </div>
          <button onClick={() => setNewKey(null)} className="text-xs text-slate-500 hover:text-slate-300 mt-2 transition-colors">Dismiss</button>
        </div>
      )}

      {/* API Keys */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-display font-semibold text-white flex items-center gap-2"><Key size={16} /> API Keys</h2>
            <p className="text-xs text-slate-500 mt-0.5">{keys?.length || 0} key(s)</p>
          </div>
          <button onClick={() => setShowKeyForm(!showKeyForm)} className="btn-primary text-sm flex items-center gap-1.5">
            <Plus size={14} /> Generate Key
          </button>
        </div>

        {showKeyForm && (
          <div className="bg-surface-600/50 rounded-lg p-4 mb-5 border border-white/5">
            <p className="text-xs text-slate-400 mb-2 font-medium">Key name (optional)</p>
            <div className="flex gap-2">
              <input
                value={keyName}
                onChange={e => setKeyName(e.target.value)}
                placeholder="e.g. Production, Development..."
                className="input flex-1"
                onKeyDown={e => e.key === 'Enter' && generateMutation.mutate(keyName || 'Default Key')}
              />
              <button
                onClick={() => generateMutation.mutate(keyName || 'Default Key')}
                disabled={generateMutation.isPending}
                className="btn-primary"
              >
                {generateMutation.isPending ? 'Generating...' : 'Generate'}
              </button>
              <button onClick={() => setShowKeyForm(false)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        )}

        {keysLoading ? (
          <div className="space-y-3">{[...Array(2)].map((_, i) => <div key={i} className="h-14 bg-surface-600 rounded-lg animate-pulse" />)}</div>
        ) : keys?.length === 0 ? (
          <div className="text-center py-10 text-slate-500">
            <Key size={32} className="mx-auto mb-2 text-slate-700" />
            <p className="text-sm">No API keys yet. Generate one to get started.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {keys?.map(k => (
              <div key={k._id} className="flex items-center gap-4 bg-surface-600/50 rounded-lg px-4 py-3 border border-white/5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-slate-200">{k.name}</span>
                    <span className={k.status === 'active' ? 'badge-active' : 'badge-revoked'}>{k.status}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono text-slate-500">
                      {k.key.slice(0, 12)}••••••••{k.key.slice(-6)}
                    </code>
                    <CopyButton text={k.key} />
                  </div>
                </div>
                <div className="text-right text-xs text-slate-500 flex-shrink-0">
                  <p>{k.totalRequests.toLocaleString()} requests</p>
                  {k.lastUsedAt && <p>Last: {new Date(k.lastUsedAt).toLocaleDateString()}</p>}
                </div>
                {k.status === 'active' && (
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => { if (confirm('Rotate this key? The old key will be revoked.')) rotateMutation.mutate(k._id) }}
                      className="p-1.5 text-slate-500 hover:text-amber-400 hover:bg-amber-500/10 rounded transition-all"
                      title="Rotate key"
                    >
                      <RefreshCw size={13} />
                    </button>
                    <button
                      onClick={() => { if (confirm('Revoke this key? This cannot be undone.')) revokeMutation.mutate(k._id) }}
                      className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-all"
                      title="Revoke key"
                    >
                      <Ban size={13} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
