'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { UserStats } from '@/lib/types'
import { api } from '@/lib/api'

const COL_PALETTES = [
  { badge: 'bg-amber-500/15 text-amber-400 border-amber-500/25', dot: 'bg-amber-400' },
  { badge: 'bg-blue-500/15 text-blue-400 border-blue-500/25',    dot: 'bg-blue-400' },
  { badge: 'bg-violet-500/15 text-violet-400 border-violet-500/25', dot: 'bg-violet-400' },
  { badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25', dot: 'bg-emerald-400' },
  { badge: 'bg-rose-500/15 text-rose-400 border-rose-500/25',    dot: 'bg-rose-400' },
  { badge: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/25',    dot: 'bg-cyan-400' },
  { badge: 'bg-orange-500/15 text-orange-400 border-orange-500/25', dot: 'bg-orange-400' },
  { badge: 'bg-teal-500/15 text-teal-400 border-teal-500/25',    dot: 'bg-teal-400' },
]

function colPalette(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff
  return COL_PALETTES[h % COL_PALETTES.length]
}

const AVATAR_GRADIENTS = [
  'from-blue-500 to-violet-600',
  'from-emerald-500 to-teal-600',
  'from-orange-500 to-red-600',
  'from-pink-500 to-rose-600',
]

export default function TeamPage() {
  const [users, setUsers] = useState<UserStats[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.users.stats()
      .then(data => { setUsers(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="p-8 text-zinc-500 text-sm">Loading team...</div>
  }

  const totalJobs = users.reduce((sum, u) => sum + u.total, 0)

  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white mb-1">Team</h1>
        <p className="text-zinc-500 text-sm">{users.length} members · {totalJobs} active jobs total</p>
      </div>

      {/* Employee cards grid */}
      <div className="grid grid-cols-2 gap-4">
        {users.map((user, i) => {
          const gradient = AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length]
          const columns = Object.entries(user.column_counts).sort(([a], [b]) => {
            const order = ['Waiting Arch', 'Design', 'Drawing', 'Review']
            return (order.indexOf(a) ?? 99) - (order.indexOf(b) ?? 99)
          })

          return (
            <Link
              key={user.id}
              href={`/team/${user.id}`}
              className="group bg-[#111111] border border-white/[0.08] rounded-xl p-5 hover:border-white/[0.18] hover:bg-[#141414] transition-all"
            >
              {/* Top row: avatar + name + total */}
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-sm font-bold text-white shrink-0`}>
                  {user.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-medium text-white group-hover:text-blue-300 transition-colors truncate">
                      {user.name}
                    </span>
                    <span className="text-2xl font-bold text-white ml-2 shrink-0">{user.total}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500 truncate">{user.email}</span>
                    <span className="text-xs text-zinc-600 ml-2 shrink-0">active jobs</span>
                  </div>
                </div>
              </div>

              {/* Column breakdown */}
              {columns.length > 0 ? (
                <div className="space-y-1.5">
                  {columns.map(([colName, count]) => {
                    const pal = colPalette(colName)
                    return (
                      <div key={colName} className="flex items-center justify-between">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded border ${pal.badge}`}>
                          {colName}
                        </span>
                        <div className="flex items-center gap-2">
                          <div className="flex gap-0.5">
                            {Array.from({ length: Math.min(count, 8) }).map((_, j) => (
                              <span key={j} className={`w-1.5 h-1.5 rounded-full opacity-60 ${pal.dot}`} />
                            ))}
                            {count > 8 && <span className="text-[10px] text-zinc-600 ml-0.5">+{count - 8}</span>}
                          </div>
                          <span className="text-sm font-semibold text-zinc-300 w-4 text-right">{count}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-xs text-zinc-700 italic">No active jobs</p>
              )}

              {/* View arrow */}
              <div className="mt-4 flex items-center justify-end text-xs text-zinc-700 group-hover:text-zinc-400 transition-colors gap-1">
                View all jobs
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2.5 6h7M6.5 3l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
