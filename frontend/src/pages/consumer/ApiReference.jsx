import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'
import { Copy, Check, Terminal, Globe, Key, Code, BookOpen } from 'lucide-react'

const GATEWAY_BASE = `${window.location.origin}/gateway`

const CopyButton = ({ text, className = '' }) => {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      className={`flex items-center gap-1.5 text-xs transition-colors ${copied ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'} ${className}`}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

const CodeBlock = ({ code, language = 'bash' }) => (
  <div className="relative bg-surface-800 rounded-lg border border-white/5 overflow-hidden">
    <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
      <span className="text-[10px] text-slate-600 font-mono uppercase tracking-wider">{language}</span>
      <CopyButton text={code} />
    </div>
    <pre className="p-4 text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed whitespace-pre">{code}</pre>
  </div>
)

const EXAMPLE_PATHS = {
  pokemon:     { path: '/pokemon/pikachu',                          label: 'Get Pikachu data' },
  placeholder: { path: '/posts/1',                                  label: 'Get a post' },
  crypto:      { path: '/coins/markets?vs_currency=usd&per_page=5', label: 'Top 5 coins' },
  products:    { path: '/products/1',                               label: 'Get a product' },
  custom:      { path: '/',                                         label: 'Root endpoint' },
}

export default function ApiReference() {
  const [selectedSubId, setSelectedSubId] = useState('')

  const { data: subs } = useQuery({
    queryKey: ['my-subscriptions'],
    queryFn: async () => { const { data } = await api.get('/consumer/subscriptions'); return data.data.subscriptions },
  })

  const activeSubs = subs?.filter(s => s.status === 'active' && s.apiId?.isActive) || []
  const selectedSub = activeSubs.find(s => s._id === selectedSubId) || activeSubs[0]
  const apiKey = selectedSub?.key || 'YOUR_API_KEY'
  const baseUrl = selectedSub?.apiId?.baseUrl || 'https://pokeapi.co/api/v2'
  const category = selectedSub?.apiId?.category || 'pokemon'
  const examplePath = EXAMPLE_PATHS[category]?.path || '/'
  const gatewayUrl = `${GATEWAY_BASE}${examplePath}`

  const curlExample = `curl "${gatewayUrl}" \\
  -H "X-API-Key: ${apiKey}"`

  const fetchExample = `fetch("${gatewayUrl}", {
  headers: {
    "X-API-Key": "${apiKey}"
  }
})
  .then(res => res.json())
  .then(data => console.log(data))`

  const nodeExample = `const axios = require('axios')

const response = await axios.get("${gatewayUrl}", {
  headers: {
    "X-API-Key": "${apiKey}"
  }
})

console.log(response.data)`

  const pythonExample = `import requests

response = requests.get(
    "${gatewayUrl}",
    headers={"X-API-Key": "${apiKey}"}
)

print(response.json())`

  const [activeTab, setActiveTab] = useState('curl')
  const tabs = [
    { id: 'curl',   label: 'cURL',       code: curlExample,   lang: 'bash' },
    { id: 'fetch',  label: 'JavaScript', code: fetchExample,  lang: 'javascript' },
    { id: 'node',   label: 'Node.js',    code: nodeExample,   lang: 'javascript' },
    { id: 'python', label: 'Python',     code: pythonExample, lang: 'python' },
  ]

  return (
    <div className="p-8 animate-fade-in max-w-3xl">
      <div className="mb-7">
        <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2">
          <BookOpen size={22} className="text-brand-400" /> API Reference
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Use your API keys from any HTTP client — browser, terminal, or your own app
        </p>
      </div>

      {/* How it works */}
      <div className="card p-5 mb-6">
        <h2 className="font-display font-semibold text-white mb-3 flex items-center gap-2">
          <Globe size={15} className="text-brand-400" /> Gateway URL
        </h2>
        <p className="text-slate-400 text-sm mb-3">
          All requests go through the MeterFlow gateway. Replace the external API's base URL with the gateway URL and add your API key as a header.
        </p>
        <div className="grid grid-cols-1 gap-3">
          <div>
            <p className="text-xs text-slate-500 mb-1.5">Direct API call (untracked)</p>
            <div className="flex items-center gap-2 bg-surface-800 rounded-lg px-3 py-2.5 border border-white/5">
              <span className="text-xs font-mono text-slate-500 line-through">{baseUrl}{examplePath.split('?')[0]}</span>
            </div>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1.5">Through MeterFlow gateway (tracked + billed)</p>
            <div className="flex items-center gap-2 bg-surface-800 rounded-lg px-3 py-2.5 border border-emerald-500/20">
              <span className="text-xs font-mono text-emerald-300 flex-1 break-all">{GATEWAY_BASE}{examplePath.split('?')[0]}</span>
              <CopyButton text={`${GATEWAY_BASE}${examplePath}`} />
            </div>
          </div>
        </div>
      </div>

      {/* Key selector */}
      {activeSubs.length > 0 && (
        <div className="card p-5 mb-6">
          <h2 className="font-display font-semibold text-white mb-3 flex items-center gap-2">
            <Key size={15} className="text-brand-400" /> Your API Keys
          </h2>
          <div className="space-y-2 mb-4">
            {activeSubs.map(s => (
              <button
                key={s._id}
                onClick={() => setSelectedSubId(s._id)}
                className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-lg border transition-all ${
                  (selectedSubId === s._id || (!selectedSubId && s._id === activeSubs[0]._id))
                    ? 'border-brand-500/40 bg-brand-500/5'
                    : 'border-white/5 bg-surface-600/50 hover:border-white/10'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200">{s.apiId?.name}</p>
                  <code className="text-xs font-mono text-slate-500">{s.key.slice(0, 14)}••••{s.key.slice(-6)}</code>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-slate-500">{s.totalRequests?.toLocaleString()} requests</p>
                </div>
              </button>
            ))}
          </div>

          {selectedSub && (
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
              <p className="text-xs text-amber-400 font-medium mb-1.5">Full API key — keep this secret</p>
              <div className="flex items-center gap-2 bg-surface-800 rounded px-3 py-2">
                <code className="text-xs font-mono text-amber-300 flex-1 break-all">{selectedSub.key}</code>
                <CopyButton text={selectedSub.key} />
              </div>
            </div>
          )}
        </div>
      )}

      {activeSubs.length === 0 && (
        <div className="card p-5 mb-6 text-center text-slate-500">
          <Key size={28} className="mx-auto mb-2 text-slate-700" />
          <p className="text-sm">No active subscriptions yet.</p>
          <p className="text-xs mt-1">Go to Browse APIs to subscribe and get a key.</p>
        </div>
      )}

      {/* Code examples */}
      <div className="card p-5 mb-6">
        <h2 className="font-display font-semibold text-white mb-3 flex items-center gap-2">
          <Terminal size={15} className="text-brand-400" /> Code Examples
        </h2>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-surface-800 p-1 rounded-lg w-fit">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-brand-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {tabs.filter(t => t.id === activeTab).map(tab => (
          <CodeBlock key={tab.id} code={tab.code} language={tab.lang} />
        ))}
      </div>

      {/* Response headers */}
      <div className="card p-5 mb-6">
        <h2 className="font-display font-semibold text-white mb-3 flex items-center gap-2">
          <Code size={15} className="text-brand-400" /> Response Headers
        </h2>
        <p className="text-slate-400 text-sm mb-4">MeterFlow adds these headers to every proxied response:</p>
        <div className="space-y-2">
          {[
            { header: 'X-RateLimit-Limit',     desc: 'Max requests allowed per minute for this key' },
            { header: 'X-RateLimit-Remaining', desc: 'Requests remaining in the current window' },
            { header: 'X-Response-Time',        desc: 'Total latency including proxy overhead (ms)' },
            { header: 'X-MeterFlow-API',        desc: 'Name of the API this key belongs to' },
          ].map(({ header, desc }) => (
            <div key={header} className="flex items-start gap-4 py-2 border-b border-white/5 last:border-0">
              <code className="text-xs font-mono text-brand-300 flex-shrink-0 w-52">{header}</code>
              <span className="text-xs text-slate-400">{desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Error codes */}
      <div className="card p-5">
        <h2 className="font-display font-semibold text-white mb-3">Error Codes</h2>
        <div className="space-y-2">
          {[
            { code: '401', msg: 'Missing or invalid X-API-Key header' },
            { code: '401', msg: 'Key has been revoked' },
            { code: '429', msg: 'Rate limit exceeded — wait and retry' },
            { code: '404', msg: 'API is inactive or deleted' },
            { code: '502', msg: 'Upstream API returned an error' },
          ].map(({ code, msg }, i) => (
            <div key={i} className="flex items-center gap-4 py-2 border-b border-white/5 last:border-0">
              <span className={`text-xs font-mono px-2 py-0.5 rounded font-medium flex-shrink-0 ${
                code === '429' ? 'bg-amber-500/10 text-amber-400' :
                code === '502' ? 'bg-red-500/10 text-red-400' :
                'bg-red-500/10 text-red-400'
              }`}>{code}</span>
              <span className="text-xs text-slate-400">{msg}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
