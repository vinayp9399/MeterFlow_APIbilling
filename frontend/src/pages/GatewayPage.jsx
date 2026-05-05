import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { usePaymentModal } from '../context/PaymentModalContext'
import api from '../services/api'
import {
  Globe, Send, Key, ChevronDown, CheckCircle,
  XCircle, Clock, Copy, Check, AlertCircle, CreditCard
} from 'lucide-react'

const EXAMPLE_PATHS = {
  pokemon:     ['/pokemon/pikachu', '/pokemon?limit=10', '/type/fire'],
  placeholder: ['/posts', '/posts/1', '/users', '/todos?_limit=5'],
  crypto:      ['/coins/markets?vs_currency=usd&per_page=5', '/simple/price?ids=bitcoin&vs_currencies=usd'],
  products:    ['/products?limit=5', '/products/1', '/products/categories'],
  custom:      ['/'],
}

export default function GatewayPage() {
  const { user } = useAuth()
  const { showPaymentModal } = usePaymentModal()

  const [selectedApiId, setSelectedApiId] = useState('')
  const [selectedKeyId, setSelectedKeyId] = useState('')
  const [path, setPath] = useState('/')
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState(null)
  const [paymentRequired, setPaymentRequired] = useState(null)
  const [copied, setCopied] = useState(false)

  // Providers see their own APIs, consumers see subscribed APIs
  const apisQueryFn = async () => {
    if (user?.role === 'consumer') {
      const { data } = await api.get('/consumer/subscriptions')
      // Map subscriptions to API-like shape
      return data.data.subscriptions
        .filter(s => s.status === 'active' && s.apiId?.isActive)
        .map(s => ({ ...s.apiId, _id: s.apiId._id, keyId: s._id, key: s.key }))
    }
    const { data } = await api.get('/apis')
    return data.data.apis
  }

  const { data: apis } = useQuery({
    queryKey: ['gateway-apis', user?.role],
    queryFn: apisQueryFn,
  })

  const { data: keys } = useQuery({
    queryKey: ['api-keys-for', selectedApiId],
    queryFn: async () => {
      if (user?.role === 'consumer') {
        // Consumer already has key embedded in api object
        const selected = apis?.find(a => a._id === selectedApiId)
        return selected ? [{ _id: selected.keyId, key: selected.key, name: 'My Key', status: 'active' }] : []
      }
      const { data } = await api.get(`/apis/${selectedApiId}/keys`)
      return data.data.apiKeys.filter(k => k.status === 'active')
    },
    enabled: !!selectedApiId && !!apis,
  })

  const selectedApi = apis?.find(a => a._id === selectedApiId)
  const selectedKey = keys?.find(k => k._id === selectedKeyId) || keys?.[0]
  const examples = selectedApi ? EXAMPLE_PATHS[selectedApi.category] || ['/'] : []

  const sendRequest = async () => {
    if (!selectedKey) return
    setLoading(true)
    setResponse(null)
    setPaymentRequired(null)
    const start = Date.now()

    try {
      const cleanPath = path.startsWith('/') ? path.slice(1) : path
      const GATEWAY_BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/gateway` : '/gateway'
      const res = await fetch(`${GATEWAY_BASE}/${cleanPath}`, {
        headers: { 'X-API-Key': selectedKey.key },
      })
      const elapsed = Date.now() - start
      let body
      const text = await res.text()
      try { body = JSON.parse(text) } catch { body = { error: 'Non-JSON response from gateway', raw: text.slice(0, 500) } }

      // Handle 402 Payment Required
      if (res.status === 402) {
        setPaymentRequired(body.data)
        // Also trigger the global modal
        window.dispatchEvent(new CustomEvent('meterflow:payment-required', {
          detail: body.data
        }))
        setLoading(false)
        return
      }

      setResponse({ status: res.status, data: body, latency: elapsed, ok: res.ok })
    } catch (err) {
      setResponse({ status: 0, data: { error: err.message }, latency: Date.now() - start, ok: false })
    } finally {
      setLoading(false)
    }
  }

  const copyKey = () => {
    if (selectedKey) {
      navigator.clipboard.writeText(selectedKey.key)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="p-8 animate-fade-in">
      <div className="mb-7">
        <h1 className="text-2xl font-display font-bold text-white">Gateway Tester</h1>
        <p className="text-slate-400 text-sm mt-1">
          Test your APIs through the MeterFlow gateway — all requests are logged and billed
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Request panel */}
        <div className="space-y-4">
          <div className="card p-5">
            <h2 className="font-display font-semibold text-white mb-4 flex items-center gap-2">
              <Globe size={16} className="text-brand-400" /> Configure Request
            </h2>

            {/* Select API */}
            <div className="mb-4">
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Select API</label>
              <div className="relative">
                <select
                  value={selectedApiId}
                  onChange={e => { setSelectedApiId(e.target.value); setSelectedKeyId(''); setPath('/') }}
                  className="input appearance-none pr-8 cursor-pointer"
                >
                  <option value="">— Choose an API —</option>
                  {apis?.map(a => <option key={a._id} value={a._id}>{a.name}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              </div>
            </div>

            {/* Key display */}
            {selectedApiId && keys?.length === 0 && (
              <div className="mb-4 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                No active keys for this API.
              </div>
            )}

            {selectedKey && (
              <div className="mb-4 bg-surface-600/50 rounded-lg px-3 py-2.5 flex items-center gap-2 border border-white/5">
                <Key size={12} className="text-brand-400 flex-shrink-0" />
                <code className="text-xs font-mono text-slate-400 flex-1 truncate">
                  {selectedKey.key.slice(0, 16)}••••{selectedKey.key.slice(-8)}
                </code>
                <button onClick={copyKey} className="text-slate-500 hover:text-slate-300 transition-colors">
                  {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                </button>
              </div>
            )}

            {/* Path */}
            {selectedApiId && (
              <div className="mb-4">
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">Path</label>
                <div className="flex gap-2 items-center bg-surface-600 border border-white/10 rounded-lg px-3 py-2 focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500/30 transition-all">
                  {selectedApi && (
                    <span className="text-xs text-slate-600 font-mono flex-shrink-0 hidden md:block truncate max-w-[120px]">
                      {selectedApi.baseUrl?.replace('https://', '')}
                    </span>
                  )}
                  <input
                    value={path}
                    onChange={e => setPath(e.target.value)}
                    placeholder="/endpoint"
                    className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none font-mono"
                    onKeyDown={e => e.key === 'Enter' && sendRequest()}
                  />
                </div>
              </div>
            )}

            {/* Example paths */}
            {examples.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-slate-500 mb-2">Quick examples:</p>
                <div className="flex flex-wrap gap-1.5">
                  {examples.map(ex => (
                    <button
                      key={ex}
                      onClick={() => setPath(ex)}
                      className={`text-xs px-2.5 py-1 rounded-md font-mono transition-all ${
                        path === ex
                          ? 'bg-brand-600/20 text-brand-400 border border-brand-500/30'
                          : 'bg-surface-600 text-slate-400 hover:text-slate-200 border border-white/5'
                      }`}
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={sendRequest}
              disabled={!selectedKey || loading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send size={15} />
                  Send Request
                </>
              )}
            </button>
          </div>

          {/* How it works */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-white mb-3">How the Gateway Works</h3>
            <ol className="space-y-2 text-xs text-slate-400">
              {[
                'Select an API and active key',
                'Enter an endpoint path',
                'Click Send — request goes through /gateway',
                'MeterFlow validates key & checks rate limits',
                'After 50 free requests, payment is required',
                'Request forwarded to real API, usage logged',
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="w-4 h-4 bg-brand-600/20 text-brand-400 rounded text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Response panel */}
        <div className="card p-5 flex flex-col min-h-96">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-white">Response</h2>
            {response && (
              <div className="flex items-center gap-3">
                <span className={`flex items-center gap-1.5 text-xs font-medium ${response.ok ? 'text-emerald-400' : 'text-red-400'}`}>
                  {response.ok ? <CheckCircle size={12} /> : <XCircle size={12} />}
                  {response.status}
                </span>
                <span className="flex items-center gap-1 text-xs text-slate-500">
                  <Clock size={11} /> {response.latency}ms
                </span>
              </div>
            )}
          </div>

          {/* Payment required state */}
          {paymentRequired && !response && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-xs">
                <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle size={28} className="text-amber-400" />
                </div>
                <h3 className="font-display font-bold text-white text-lg mb-2">Free Tier Exhausted</h3>
                <p className="text-slate-400 text-sm mb-1">
                  You've used <span className="text-white font-semibold">{paymentRequired.totalRequests}</span> of your{' '}
                  <span className="text-white font-semibold">{paymentRequired.freeRequests}</span> free requests.
                </p>
                <p className="text-slate-500 text-xs mb-5">
                  Amount due: <span className="text-brand-400 font-semibold">₹{paymentRequired.amount?.toFixed(2)}</span>
                </p>
                <button
                  onClick={() => showPaymentModal(paymentRequired)}
                  className="btn-primary flex items-center gap-2 mx-auto"
                >
                  <CreditCard size={15} />
                  Pay ₹{paymentRequired.amount?.toFixed(2)} to Continue
                </button>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!response && !paymentRequired && !loading && (
            <div className="flex-1 flex items-center justify-center text-slate-600">
              <div className="text-center">
                <Globe size={40} className="mx-auto mb-3 text-slate-800" />
                <p className="text-sm">Response will appear here</p>
                <p className="text-xs text-slate-700 mt-1">Configure and send a request on the left</p>
              </div>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="flex-1 flex items-center justify-center text-slate-500">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm">Awaiting response...</p>
              </div>
            </div>
          )}

          {/* Response */}
          {response && !loading && (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 bg-surface-800 rounded-lg p-4 overflow-auto font-mono text-xs text-slate-300 leading-relaxed">
                <pre className="whitespace-pre-wrap break-all">
                  {JSON.stringify(response.data, null, 2)}
                </pre>
              </div>
              <button
                onClick={() => navigator.clipboard.writeText(JSON.stringify(response.data, null, 2))}
                className="mt-2 text-xs text-slate-500 hover:text-slate-300 self-end flex items-center gap-1 transition-colors"
              >
                <Copy size={11} /> Copy response
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}