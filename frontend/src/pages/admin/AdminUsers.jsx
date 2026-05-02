import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'
import { Users, Search } from 'lucide-react'
import { useState } from 'react'

export default function AdminUsers() {
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-all-users'],
    queryFn: async () => { const { data } = await api.get('/admin/users?limit=100'); return data.data },
  })

  const filtered = data?.users?.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-8 animate-fade-in">
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">All Users</h1>
          <p className="text-slate-400 text-sm mt-1">{data?.total || 0} registered users</p>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search users..."
            className="input pl-8 w-56"
          />
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5 bg-surface-600/30">
              <th className="px-5 py-3 text-xs text-slate-500 font-medium text-left">Name</th>
              <th className="px-5 py-3 text-xs text-slate-500 font-medium text-left">Email</th>
              <th className="px-5 py-3 text-xs text-slate-500 font-medium text-left">Role</th>
              <th className="px-5 py-3 text-xs text-slate-500 font-medium text-left">Plan</th>
              <th className="px-5 py-3 text-xs text-slate-500 font-medium text-left">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {isLoading
              ? [...Array(5)].map((_, i) => (
                  <tr key={i}><td colSpan={5} className="px-5 py-3"><div className="h-5 bg-surface-600 rounded animate-pulse" /></td></tr>
                ))
              : filtered?.map(u => (
                  <tr key={u._id} className="hover:bg-white/2 transition-colors">
                    <td className="px-5 py-3 text-slate-200 font-medium">{u.name}</td>
                    <td className="px-5 py-3 text-slate-400">{u.email}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                        u.role === 'admin' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                        u.role === 'provider' ? 'bg-brand-500/10 text-brand-400 border-brand-500/20' :
                        'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      }`}>{u.role}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/20">{u.plan}</span>
                    </td>
                    <td className="px-5 py-3 text-slate-500 text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))
            }
          </tbody>
        </table>
        {!isLoading && filtered?.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <Users size={32} className="mx-auto mb-2 text-slate-700" />
            <p className="text-sm">No users found</p>
          </div>
        )}
      </div>

      <p className="text-xs text-slate-600 mt-4">
        To change a user's role, update the <code className="text-slate-500">role</code> field directly in MongoDB.
        Valid values: <code className="text-slate-500">admin</code>, <code className="text-slate-500">provider</code>, <code className="text-slate-500">consumer</code>
      </p>
    </div>
  )
}
