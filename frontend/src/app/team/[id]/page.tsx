'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import type { UserCard, UserStats } from '@/lib/types'
import { api } from '@/lib/api'

const PRIORITY_STYLES: Record<string, string> = {
  urgent: 'bg-red-500/15 text-red-400 border-red-500/30',
  high:   'bg-orange-500/15 text-orange-400 border-orange-500/30',
  medium: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  low:    'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
}

const COL_PALETTES = [
  { dot: 'bg-amber-400',   badge: 'bg-amber-500/15 text-amber-400 border-amber-500/25' },
  { dot: 'bg-blue-400',    badge: 'bg-blue-500/15 text-blue-400 border-blue-500/25' },
  { dot: 'bg-violet-400',  badge: 'bg-violet-500/15 text-violet-400 border-violet-500/25' },
  { dot: 'bg-emerald-400', badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' },
  { dot: 'bg-rose-400',    badge: 'bg-rose-500/15 text-rose-400 border-rose-500/25' },
  { dot: 'bg-cyan-400',    badge: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/25' },
  { dot: 'bg-orange-400',  badge: 'bg-orange-500/15 text-orange-400 border-orange-500/25' },
  { dot: 'bg-teal-400',    badge: 'bg-teal-500/15 text-teal-400 border-teal-500/25' },
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

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function TeamMemberPage() {
  const params = useParams()
  const userId = Number(params.id)

  const [user, setUser] = useState<UserStats | null>(null)
  const [cards, setCards] = useState<UserCard[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.users.stats(),
      api.users.cards(userId),
    ]).then(([allUsers, userCards]) => {
      const found = allUsers.find(u => u.id === userId) ?? null
      setUser(found)
      setCards(userCards)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [userId])

  if (loading) return <div className="p-8 text-zinc-500 text-sm">Loading...</div>
  if (!user) return <div className="p-8 text-zinc-500 text-sm">Member not found.</div>

  // Group cards by board
  const byBoard: Record<string, { project_id: number; cards: UserCard[] }> = {}
  for (const card of cards) {
    if (!byBoard[card.project_name]) {
      byBoard[card.project_name] = { project_id: card.project_id, cards: [] }
    }
    byBoard[card.project_name].cards.push(card)
  }

  // Column summary counts across all boards
  const colCounts: Record<string, number> = {}
  for (const card of cards) {
    colCounts[card.list_name] = (colCounts[card.list_name] ?? 0) + 1
  }
  const colOrder = ['Waiting Arch', 'Design', 'Drawing', 'Review']
  const sortedCols = Object.entries(colCounts).sort(
    ([a], [b]) => (colOrder.indexOf(a) === -1 ? 99 : colOrder.indexOf(a)) - (colOrder.indexOf(b) === -1 ? 99 : colOrder.indexOf(b))
  )

  const gradientIndex = userId % AVATAR_GRADIENTS.length
  const gradient = AVATAR_GRADIENTS[gradientIndex - 1] ?? AVATAR_GRADIENTS[0]

  return (
    <div className="p-8 max-w-5xl">
      {/* Back */}
      <Link href="/team" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-200 transition-colors mb-6">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Team
      </Link>

      {/* Header */}
      <div className="flex items-start gap-4 mb-8">
        <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-xl font-bold text-white shrink-0`}>
          {user.avatar}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-white mb-0.5">{user.name}</h1>
          <p className="text-sm text-zinc-500">{user.email}</p>
        </div>
        <div className="text-right">
          <div className="text-4xl font-bold text-white">{user.total}</div>
          <div className="text-xs text-zinc-500 mt-0.5">active jobs</div>
        </div>
      </div>

      {/* Status summary pills */}
      {sortedCols.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
          {sortedCols.map(([col, count]) => {
            const style = colPalette(col)
            return (
              <div key={col} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium ${style.badge}`}>
                <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                {col}
                <span className="font-bold">{count}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* No jobs */}
      {cards.length === 0 && (
        <div className="bg-[#111111] border border-white/[0.08] rounded-xl p-10 text-center">
          <p className="text-zinc-600 text-sm">No active jobs assigned.</p>
        </div>
      )}

      {/* Cards grouped by board */}
      <div className="space-y-8">
        {Object.entries(byBoard).map(([boardName, { project_id, cards: boardCards }]) => (
          <div key={boardName}>
            {/* Board heading */}
            <div className="flex items-center gap-3 mb-3">
              <Link
                href={`/projects/${project_id}`}
                className="text-base font-semibold text-zinc-200 hover:text-white transition-colors"
              >
                {boardName}
              </Link>
              <span className="text-xs text-zinc-600 bg-white/[0.05] px-2 py-0.5 rounded-full">
                {boardCards.length} job{boardCards.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Table */}
            <div className="bg-[#111111] border border-white/[0.08] rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left text-[10px] font-medium text-zinc-600 uppercase tracking-wider px-4 py-2.5">Status</th>
                    <th className="text-left text-[10px] font-medium text-zinc-600 uppercase tracking-wider px-4 py-2.5">Job #</th>
                    <th className="text-left text-[10px] font-medium text-zinc-600 uppercase tracking-wider px-4 py-2.5">Project</th>
                    <th className="text-left text-[10px] font-medium text-zinc-600 uppercase tracking-wider px-4 py-2.5">Address</th>
                    <th className="text-left text-[10px] font-medium text-zinc-600 uppercase tracking-wider px-4 py-2.5">Priority</th>
                    <th className="text-left text-[10px] font-medium text-zinc-600 uppercase tracking-wider px-4 py-2.5">Due</th>
                  </tr>
                </thead>
                <tbody>
                  {boardCards.map((card, idx) => {
                    const colStyle = colPalette(card.list_name)
                    return (
                      <tr
                        key={card.id}
                        className={`border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors ${
                          idx % 2 === 0 ? '' : 'bg-white/[0.01]'
                        }`}
                      >
                        {/* Status */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded border ${colStyle.badge}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${colStyle.dot}`} />
                            {card.list_name}
                          </span>
                        </td>
                        {/* Job # */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="font-mono text-xs text-zinc-400">
                            {card.job_number ?? '—'}
                          </span>
                        </td>
                        {/* Title */}
                        <td className="px-4 py-3">
                          <span className="text-zinc-200 font-medium">{card.title}</span>
                        </td>
                        {/* Address */}
                        <td className="px-4 py-3">
                          <span className="text-zinc-500 text-xs">{card.project_address ?? '—'}</span>
                        </td>
                        {/* Priority */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`text-[11px] font-medium px-2 py-0.5 rounded border ${PRIORITY_STYLES[card.priority]}`}>
                            {card.priority.charAt(0).toUpperCase() + card.priority.slice(1)}
                          </span>
                        </td>
                        {/* Due date */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`text-xs ${
                            card.due_date && new Date(card.due_date) < new Date()
                              ? 'text-red-400 font-medium'
                              : 'text-zinc-500'
                          }`}>
                            {formatDate(card.due_date)}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
