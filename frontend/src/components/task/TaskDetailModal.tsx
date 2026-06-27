'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import type { Card, Tag, User } from '@/lib/types'
import { api } from '@/lib/api'

interface TaskDetailModalProps {
  card: Card
  onClose: () => void
  onUpdate: (card: Card) => void
  onDelete: (cardId: number) => void
}

const PRIORITY_OPTIONS = ['low', 'medium', 'high', 'urgent'] as const

const PRIORITY_STYLES: Record<string, string> = {
  urgent: 'bg-red-500/15 text-red-400 border-red-500/30',
  high: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  medium: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  low: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
}

type SaveStatus = 'idle' | 'saving' | 'saved'

export function TaskDetailModal({ card, onClose, onUpdate, onDelete }: TaskDetailModalProps) {
  const [title, setTitle] = useState(card.title)
  const [jobNumber, setJobNumber] = useState(card.job_number ?? '')
  const [projectAddress, setProjectAddress] = useState(card.project_address ?? '')
  const [description, setDescription] = useState(card.description ?? '')
  const [priority, setPriority] = useState(card.priority)
  const [dueDate, setDueDate] = useState(card.due_date ?? '')
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [currentTags, setCurrentTags] = useState<Tag[]>(card.tags)
  const [currentAssignees, setCurrentAssignees] = useState<User[]>(card.assignees)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [dirty, setDirty] = useState(false)

  // Keep latest values accessible in async callbacks without stale closures
  const stateRef = useRef({ title, jobNumber, projectAddress, description, priority, dueDate, currentTags, currentAssignees })
  stateRef.current = { title, jobNumber, projectAddress, description, priority, dueDate, currentTags, currentAssignees }

  useEffect(() => {
    api.tags.list().then(setAllTags).catch(() => {})
    api.users.list().then(setAllUsers).catch(() => {})
  }, [])

  const performSave = useCallback(async () => {
    const s = stateRef.current
    if (!s.title.trim()) return
    setSaveStatus('saving')
    try {
      const updated = await api.cards.update(card.id, {
        title: s.title.trim(),
        job_number: s.jobNumber.trim() || null,
        project_address: s.projectAddress.trim() || null,
        description: s.description.trim() || null,
        priority: s.priority,
        due_date: s.dueDate || null,
      })
      onUpdate({ ...updated, tags: s.currentTags, assignees: s.currentAssignees })
      setSaveStatus('saved')
      setDirty(false)
    } catch {
      setSaveStatus('idle')
    }
  }, [card.id, onUpdate])

  // Save on close if there are unsaved changes
  async function handleClose() {
    if (dirty) await performSave()
    onClose()
  }

  async function handleArchive() {
    if (!confirm('Archive this project? It will be hidden from the board.')) return
    try {
      await api.cards.update(card.id, { archived: true } as Partial<Card>)
      onDelete(card.id)
    } catch {
      alert('Failed to archive project')
    }
  }

  async function handleDelete() {
    if (!confirm('Permanently delete this project? This cannot be undone.')) return
    try {
      await api.cards.delete(card.id)
      onDelete(card.id)
    } catch {
      alert('Failed to delete project')
    }
  }

  async function toggleTag(tag: Tag) {
    const hasTag = currentTags.some(t => t.id === tag.id)
    try {
      if (hasTag) {
        await api.cards.removeTag(card.id, tag.id)
        setCurrentTags(prev => prev.filter(t => t.id !== tag.id))
      } else {
        await api.cards.addTag(card.id, tag.id)
        setCurrentTags(prev => [...prev, tag])
      }
    } catch {}
  }

  async function toggleAssignee(user: User) {
    const has = currentAssignees.some(u => u.id === user.id)
    try {
      if (has) {
        await api.cards.removeAssignee(card.id, user.id)
        setCurrentAssignees(prev => prev.filter(u => u.id !== user.id))
      } else {
        await api.cards.addAssignee(card.id, user.id)
        setCurrentAssignees(prev => [...prev, user])
      }
    } catch {}
  }

  return (
    <Dialog open onOpenChange={open => { if (!open) handleClose() }}>
      <DialogContent className="bg-[#141414] border-white/[0.08] text-white max-w-2xl p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-white/[0.06]">
          <input
            autoFocus
            value={title}
            onChange={e => { setTitle(e.target.value); setDirty(true) }}
            className="text-xl font-semibold bg-transparent border-none outline-none text-white w-full placeholder-zinc-600 focus:ring-0"
            placeholder="Project title"
          />
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5 overflow-y-auto max-h-[58vh]">

          {/* Job Number + Address */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-zinc-500 mb-1.5 block font-medium uppercase tracking-wide">Job Number</label>
              <input
                value={jobNumber}
                onChange={e => { setJobNumber(e.target.value); setDirty(true) }}
                placeholder="e.g. HC-2024-0542"
                className="w-full bg-[#1f1f1f] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 outline-none font-mono focus:border-white/20 transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1.5 block font-medium uppercase tracking-wide">Project Address</label>
              <input
                value={projectAddress}
                onChange={e => { setProjectAddress(e.target.value); setDirty(true) }}
                placeholder="Street address"
                className="w-full bg-[#1f1f1f] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-white/20 transition-colors"
              />
            </div>
          </div>

          {/* Priority + Due date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-zinc-500 mb-1.5 block font-medium uppercase tracking-wide">Priority</label>
              <div className="flex gap-1.5 flex-wrap">
                {PRIORITY_OPTIONS.map(p => (
                  <button
                    key={p}
                    onClick={() => { setPriority(p); setDirty(true) }}
                    className={`text-[11px] font-medium px-2.5 py-1 rounded border transition-all ${
                      priority === p ? PRIORITY_STYLES[p] : 'border-white/[0.08] text-zinc-500 hover:border-white/[0.15] hover:text-zinc-300'
                    }`}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1.5 block font-medium uppercase tracking-wide">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={e => { setDueDate(e.target.value); setDirty(true) }}
                className="w-full bg-[#1f1f1f] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-zinc-200 outline-none focus:border-white/20 transition-colors"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs text-zinc-500 mb-1.5 block font-medium uppercase tracking-wide">Description</label>
            <textarea
              value={description}
              onChange={e => { setDescription(e.target.value); setDirty(true) }}
              rows={3}
              placeholder="Add a description..."
              className="w-full bg-[#1f1f1f] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 outline-none resize-none focus:border-white/20 transition-colors"
            />
          </div>

          {/* Assignees */}
          <div>
            <label className="text-xs text-zinc-500 mb-2 block font-medium uppercase tracking-wide">Assignees</label>
            {allUsers.length === 0 ? (
              <p className="text-xs text-zinc-600">Loading...</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {allUsers.map(user => {
                  const active = currentAssignees.some(u => u.id === user.id)
                  return (
                    <button
                      key={user.id}
                      onClick={() => toggleAssignee(user)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border transition-all ${
                        active
                          ? 'bg-blue-600/20 border-blue-500/40 text-blue-300'
                          : 'bg-white/[0.03] border-white/[0.08] text-zinc-400 hover:border-white/[0.15] hover:text-zinc-200'
                      }`}
                    >
                      <span className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                        {user.avatar}
                      </span>
                      {user.name}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Tags */}
          <div>
            <label className="text-xs text-zinc-500 mb-2 block font-medium uppercase tracking-wide">Tags</label>
            {allTags.length === 0 ? (
              <p className="text-xs text-zinc-600">Loading...</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {allTags.map(tag => {
                  const active = currentTags.some(t => t.id === tag.id)
                  return (
                    <button
                      key={tag.id}
                      onClick={() => toggleTag(tag)}
                      style={active ? {
                        backgroundColor: `${tag.color}22`,
                        borderColor: `${tag.color}55`,
                        color: tag.color,
                      } : {}}
                      className={`px-3 py-1 rounded-full text-sm border transition-all ${
                        active ? '' : 'bg-white/[0.03] border-white/[0.08] text-zinc-400 hover:border-white/[0.15] hover:text-zinc-200'
                      }`}
                    >
                      {tag.name}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/[0.06] bg-[#111111]/50">
          <div className="flex items-center gap-4">
            <button
              onClick={handleArchive}
              className="text-sm text-zinc-600 hover:text-yellow-400 transition-colors"
            >
              Archive
            </button>
            <button
              onClick={handleDelete}
              className="text-sm text-zinc-600 hover:text-red-400 transition-colors"
            >
              Delete
            </button>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-600">
            {saveStatus === 'saving' && (
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                Saving…
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="flex items-center gap-1.5 text-green-500/70">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Saved
              </span>
            )}
            {dirty && saveStatus === 'idle' && (
              <span className="text-zinc-700">Unsaved changes</span>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
