import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import { Zap, ToggleLeft, ToggleRight, Globe } from 'lucide-react'

export default function AdminApis() {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin-all-apis'],
    queryFn: async () => { const { data } = await api.get('/admin/apis'); return data.data.apis },
  })

  const toggleMutation = useMutation({
    mutationFn: (id) => api.patch(`/admin/apis/${id}/toggle`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-all-apis'] }),
  })

  return (
    <div className="p-8 animate-fade-in">
      <div className="mb-7">
        <h1 className="text-2xl font-display font-bold text-white">All APIs</h1>
        <p className="text-slate-400 text-sm mt-1">{data?.length || 0} APIs across all providers</p>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5 bg-surface-600/30">
              <th className="px-5 py-3 text-xs text-slate-500 font-medium text-left">API Name</th>
              <th className="px-5 py-3 text-xs text-slate-500 font-medium text-left">Provider</th>
              <th className="px-5 py-3 text-xs text-slate-500 font-medium text-left">Base URL</th>
              <th className="px-5 py-3 text-xs text-slate-500 font-medium text-left">Status</th>
              <th className="px-5 py-3 text-xs text-slate-500 font-medium text-left">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {isLoading
              ? [...Array(4)].map((_, i) => (
                  <tr key={i}><td colSpan={5} className="px-5 py-3"><div className="h-5 bg-surface-600 rounded animate-pulse" /></td></tr>
                ))
              : data?.map(a => (
                  <tr key={a._id} className="hover:bg-white/2 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <Zap size={14} className="text-brand-400" />
                        <span className="text-slate-200 font-medium">{a.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div>
                        <p className="text-slate-300 text-xs font-medium">{a.userId?.name}</p>
                        <p className="text-slate-500 text-xs">{a.userId?.email}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
                        <Globe size={11} />
                        <span className="truncate max-w-[180px]">{a.baseUrl.replace('https://', '')}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={a.isActive ? 'badge-active' : 'badge-revoked'}>
                        {a.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => toggleMutation.mutate(a._id)}
                        disabled={toggleMutation.isPending}
                        className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                          a.isActive ? 'text-red-400 hover:text-red-300' : 'text-emerald-400 hover:text-emerald-300'
                        }`}
                      >
                        {a.isActive
                          ? <><ToggleRight size={15} /> Deactivate</>
                          : <><ToggleLeft size={15} /> Activate</>
                        }
                      </button>
                    </td>
                  </tr>
                ))
            }
          </tbody>
        </table>
        {!isLoading && data?.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <Zap size={32} className="mx-auto mb-2 text-slate-700" />
            <p className="text-sm">No APIs registered yet</p>
          </div>
        )}
      </div>
    </div>
  )
}
