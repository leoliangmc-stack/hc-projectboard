'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Dialog, DialogContent } from '@/components/ui/dialog'
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

interface MemberModalProps {
  open: boolean
  initial?: { name: string; email: string; avatar: string }
  onClose: () => void
  onSave: (data: { name: string; email: string; avatar: string }) => Promise<void>
}

function MemberModal({ open, initial, onClose, onSave }: MemberModalProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [email, setEmail] = useState(initial?.email ?? '')
  const [avatar, setAvatar] = useState(initial?.avatar ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? '')
      setEmail(initial?.email ?? '')
      setAvatar(initial?.avatar ?? '')
      setSaving(false)
    }
  }, [open, initial])

  async function handleSubmit() {
    if (!name.trim() || !email.trim() || !avatar.trim()) return
    setSaving(true)
    try {
      await onSave({ name: name.trim(), email: email.trim(), avatar: avatar.trim() })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="bg-[#141414] border-white/[0.08] text-white max-w-md p-0 gap-0">
        <div className="px-6 pt-6 pb-4 border-b border-white/[0.06]">
          <h2 className="text-lg font-semibold">{initial ? 'Edit Member' : 'Add Member'}</h2>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="text-xs text-zinc-500 mb-1.5 block font-medium uppercase tracking-wide">Name</label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Jane Doe"
              className="w-full bg-[#1f1f1f] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-white/20 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500 mb-1.5 block font-medium uppercase tracking-wide">Email</label>
            <input
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="jane@example.com"
              type="email"
              className="w-full bg-[#1f1f1f] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-white/20 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500 mb-1.5 block font-medium uppercase tracking-wide">
              Avatar <span className="normal-case text-zinc-700">(emoji, e.g. 🐱 or initials JD)</span>
            </label>
            <input
              value={avatar}
              onChange={e => setAvatar(e.target.value)}
              placeholder="JD"
              maxLength={4}
              className="w-full bg-[#1f1f1f] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-white/20 transition-colors"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-white/[0.06] bg-[#111111]/50">
          <button onClick={onClose} className="text-sm text-zinc-400 hover:text-zinc-200 px-4 py-1.5 rounded-lg transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || !email.trim() || !avatar.trim() || saving}
            className="text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded-lg transition-colors font-medium"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function TeamPage() {
  const [users, setUsers] = useState<UserStats[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<UserStats | null>(null)

  useEffect(() => {
    api.users.stats()
      .then(data => { setUsers(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function handleSave(data: { name: string; email: string; avatar: string }) {
    if (editing) {
      const updated = await api.users.update(editing.id, data)
      setUsers(prev => prev.map(u => u.id === editing.id ? { ...u, ...updated } : u))
    } else {
      const created = await api.users.create(data)
      setUsers(prev => [...prev, { ...created, column_counts: {}, total: 0 }])
    }
    setShowModal(false)
    setEditing(null)
  }

  async function handleDelete(user: UserStats, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!window.confirm(`Delete ${user.name}? They will be removed from all assigned cards.`)) return
    try {
      await api.users.remove(user.id)
      setUsers(prev => prev.filter(u => u.id !== user.id))
    } catch {
      alert('Failed to delete member')
    }
  }

  function handleEdit(user: UserStats, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setEditing(user)
    setShowModal(true)
  }

  if (loading) {
    return <div className="p-8 text-zinc-500 text-sm">Loading team...</div>
  }

  const totalJobs = users.reduce((sum, u) => sum + u.total, 0)

  return (
    <div className="p-8 max-w-5xl">
      <MemberModal
        open={showModal}
        initial={editing ? { name: editing.name, email: editing.email, avatar: editing.avatar } : undefined}
        onClose={() => { setShowModal(false); setEditing(null) }}
        onSave={handleSave}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white mb-1">Team</h1>
          <p className="text-zinc-500 text-sm">{users.length} members · {totalJobs} active jobs total</p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowModal(true) }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <span className="text-lg leading-none">+</span>
          Add Member
        </button>
      </div>

      {/* Employee cards grid */}
      {users.length === 0 ? (
        <div className="bg-[#111111] border border-white/[0.08] rounded-xl p-12 text-center">
          <p className="text-zinc-500 text-sm">No team members yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {users.map((user, i) => {
            const gradient = AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length]
            const columns = Object.entries(user.column_counts).sort(([a], [b]) => {
              const order = ['Waiting Arch', 'Design', 'Drawing', 'Review']
              return (order.indexOf(a) ?? 99) - (order.indexOf(b) ?? 99)
            })

            return (
              <div key={user.id} className="relative group">
                {/* Edit / Delete buttons */}
                <div className="absolute top-3 right-3 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={e => handleEdit(user, e)}
                    className="p-1.5 rounded-md bg-white/[0.06] hover:bg-white/[0.12] text-zinc-400 hover:text-zinc-200 transition-all"
                    title="Edit member"
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M8.5 1.5l2 2-7 7H1.5v-2l7-7z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  <button
                    onClick={e => handleDelete(user, e)}
                    className="p-1.5 rounded-md bg-white/[0.06] hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-all"
                    title="Delete member"
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 3h8M5 3V2.5a.5.5 0 01.5-.5h1a.5.5 0 01.5.5V3M5 5.5v3M7 5.5v3M2.5 3l.5 6.5a.5.5 0 00.5.5h5a.5.5 0 00.5-.5L9.5 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>

                <Link
                  href={`/team/${user.id}`}
                  className="block bg-[#111111] border border-white/[0.08] rounded-xl p-5 hover:border-white/[0.18] hover:bg-[#141414] transition-all"
                >
                  {/* Top row: avatar + name + total */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-sm font-bold text-white shrink-0`}>
                      {user.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-base font-medium text-white truncate pr-16">
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
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
