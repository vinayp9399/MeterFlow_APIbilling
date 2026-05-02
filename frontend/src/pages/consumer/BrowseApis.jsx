import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import { BookOpen, Zap, Globe, CheckCircle, Plus } from 'lucide-react'

const PRESET_ICONS = { pokemon: '⚡', placeholder: '📋', weather: '🌤', crypto: '₿', products: '📦', custom: '🔧' }

export default function BrowseApis() {
  const [subscribing, setSubscribing] = useState(null)
  const [success, setSuccess] = useState(null)
  const queryClient = useQueryClient()

  const { data: apis, isLoading } = useQuery({
    queryKey: ['consumer-browse'],
    queryFn: async () => { const { data } = await api.get('/consumer/apis'); return data.data.apis },
  })

  const { data: subs } = useQuery({
    queryKey: ['my-subscriptions'],
    queryFn: async () => { const { data } = await api.get('/consumer/subscriptions'); return data.data.subscriptions },
  })

  const subscribedApiIds = new Set(subs?.filter(s => s.status === 'active').map(s => s.apiId?._id || s.apiId))

  const subscribeMutation = useMutation({
    mutationFn: (apiId) => api.post(`/consumer/apis/${apiId}/subscribe`),
    onSuccess: (res, apiId) => {
      setSuccess(res.data.data.apiKey)
      queryClient.invalidateQueries({ queryKey: ['my-subscriptions'] })
      queryClient.invalidateQueries({ queryKey: ['consumer-browse'] })
    },
    onSettled: () => setSubscribing(null),
  })

  return (
    <div className="p-8 animate-fade-in">
      <div className="mb-7">
        <h1 className="text-2xl font-display font-bold text-white">Browse APIs</h1>
        <p className="text-slate-400 text-sm mt-1">Subscribe to APIs to start making requests through the gateway</p>
      </div>

      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 mb-6 animate-slide-up">
          <p className="text-emerald-400 font-medium text-sm mb-2 flex items-center gap-2">
            <CheckCircle size={15} /> Subscribed! Your API key — copy it now
          </p>
          <code className="text-emerald-300 font-mono text-xs block bg-surface-700 px-3 py-2 rounded-lg break-all">{success.key}</code>
          <button onClick={() => setSuccess(null)} className="text-xs text-slate-500 hover:text-slate-300 mt-2 transition-colors">Dismiss</button>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="card h-44 animate-pulse" />)}
        </div>
      ) : apis?.length === 0 ? (
        <div className="card p-16 text-center">
          <BookOpen size={40} className="text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">No APIs available yet</p>
          <p className="text-slate-600 text-sm mt-1">Providers haven't listed any APIs yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {apis?.map(item => {
            const isSubscribed = subscribedApiIds.has(item._id)
            return (
              <div key={item._id} className="card p-5 flex flex-col hover:border-white/10 transition-all duration-200">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 bg-brand-600/10 rounded-lg flex items-center justify-center text-xl flex-shrink-0">
                    {PRESET_ICONS[item.category] || '🔧'}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-sm">{item.name}</h3>
                    <p className="text-xs text-slate-500">by {item.userId?.name}</p>
                  </div>
                </div>

                <p className="text-xs text-slate-500 mb-3 flex-1 line-clamp-2">{item.description || 'No description'}</p>

                <div className="flex items-center gap-1.5 text-xs text-slate-600 font-mono mb-4">
                  <Globe size={11} />
                  <span className="truncate">{item.baseUrl.replace('https://', '')}</span>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-500 mb-4">
                  <span className="flex items-center gap-1"><Zap size={11} /> {item.rateLimit?.requestsPerMinute}/min</span>
                  <span className="text-slate-700">·</span>
                  <span>{item.pricing?.freeRequestsPerMonth?.toLocaleString()} free/mo</span>
                </div>

                {isSubscribed ? (
                  <div className="flex items-center justify-center gap-2 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium">
                    <CheckCircle size={14} /> Subscribed
                  </div>
                ) : (
                  <button
                    onClick={() => { setSubscribing(item._id); subscribeMutation.mutate(item._id) }}
                    disabled={subscribeMutation.isPending && subscribing === item._id}
                    className="btn-primary flex items-center justify-center gap-2 text-sm"
                  >
                    {subscribeMutation.isPending && subscribing === item._id
                      ? <><span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" /> Subscribing...</>
                      : <><Plus size={14} /> Subscribe</>
                    }
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
