import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import { Plus, Zap, ExternalLink, Trash2, Globe, ChevronRight, Package } from 'lucide-react'

const PRESET_ICONS = {
  pokemon: '⚡',
  placeholder: '📋',
  weather: '🌤',
  crypto: '₿',
  products: '📦',
  custom: '🔧',
}

const CreateApiModal = ({ onClose, onSuccess }) => {
  const [form, setForm] = useState({
    name: '', description: '', baseUrl: '', category: 'custom',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { data: presets } = useQuery({
    queryKey: ['presets'],
    queryFn: async () => { const { data } = await api.get('/apis/presets'); return data.data.presets },
  })

  const handlePreset = (preset) => {
    setForm({ name: preset.name, description: preset.description, baseUrl: preset.baseUrl, category: preset.category })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/apis', form)
      onSuccess()
      onClose()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create API')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="card w-full max-w-lg p-6 animate-slide-up" onClick={e => e.stopPropagation()}>
        <h2 className="font-display font-bold text-white text-lg mb-1">Add New API</h2>
        <p className="text-slate-400 text-sm mb-5">Choose a preset or configure a custom API</p>

        {/* Presets */}
        {presets && (
          <div className="mb-5">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-medium">Quick presets</p>
            <div className="grid grid-cols-2 gap-2">
              {presets.map(p => (
                <button key={p.category} onClick={() => handlePreset(p)}
                  className="text-left p-3 rounded-lg bg-surface-600 hover:bg-surface-500 border border-white/5 hover:border-brand-500/30 transition-all duration-150 group">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{PRESET_ICONS[p.category]}</span>
                    <div>
                      <p className="text-xs font-medium text-slate-200">{p.name}</p>
                      <p className="text-[10px] text-slate-500 truncate">{p.baseUrl.replace('https://', '')}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {error && <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-4">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">API Name *</label>
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="My Awesome API" required className="input" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Base URL *</label>
            <input value={form.baseUrl} onChange={e => setForm(p => ({ ...p, baseUrl: e.target.value }))} placeholder="https://api.example.com" required className="input" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Description</label>
            <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Optional description" className="input" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Creating...' : 'Create API'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ApisPage() {
  const [showModal, setShowModal] = useState(false)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['apis'],
    queryFn: async () => { const { data } = await api.get('/apis'); return data.data.apis },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/apis/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['apis'] }),
  })

  return (
    <div className="p-8 animate-fade-in">
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">My APIs</h1>
          <p className="text-slate-400 text-sm mt-1">Manage your registered APIs and their keys</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          Add API
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="card h-40 animate-pulse" />)}
        </div>
      ) : data?.length === 0 ? (
        <div className="card p-16 text-center">
          <Package size={40} className="text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">No APIs yet</p>
          <p className="text-slate-600 text-sm mt-1">Add your first API to start tracking usage</p>
          <button onClick={() => setShowModal(true)} className="btn-primary mt-5 inline-flex items-center gap-2">
            <Plus size={15} /> Add your first API
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {data?.map(item => (
            <div key={item._id} className="card p-5 hover:border-white/10 transition-all duration-200 group flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 bg-brand-600/10 rounded-lg flex items-center justify-center text-lg">
                    {PRESET_ICONS[item.category] || '🔧'}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-sm">{item.name}</h3>
                    <span className={item.isActive ? 'badge-active' : 'badge-revoked'}>{item.isActive ? 'Active' : 'Inactive'}</span>
                  </div>
                </div>
                <button
                  onClick={() => { if (confirm('Delete this API?')) deleteMutation.mutate(item._id) }}
                  className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all"
                >
                  <Trash2 size={15} />
                </button>
              </div>

              <p className="text-xs text-slate-500 mb-2 line-clamp-2 flex-1">{item.description || 'No description'}</p>

              <div className="flex items-center gap-1.5 text-xs text-slate-600 mb-4 font-mono">
                <Globe size={11} />
                <span className="truncate">{item.baseUrl.replace('https://', '')}</span>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
                <span className="flex items-center gap-1"><Zap size={11} /> {item.rateLimit?.requestsPerMinute}/min</span>
                <span className="text-slate-700">·</span>
                <span>{item.pricing?.freeRequestsPerMonth?.toLocaleString()} free req</span>
              </div>

              <Link to={`/provider/apis/${item._id}`}
                className="flex items-center justify-center gap-2 btn-secondary text-sm py-2">
                Manage API <ChevronRight size={14} />
              </Link>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <CreateApiModal
          onClose={() => setShowModal(false)}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['apis'] })}
        />
      )}
    </div>
  )
}
