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

const TAG_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

export function TaskDetailModal({ card, onClose, onUpdate, onDelete }: TaskDetailModalProps) {
  const [title, setTitle] = useState(card.title)
  const [jobNumber, setJobNumber] = useState(card.job_number ?? '')
  const [projectAddress, setProjectAddress] = useState(card.project_address ?? '')
  const [description, setDescription] = useState(card.description ?? '')
  const [priority, setPriority] = useState(card.priority)
  const [dueDate, setDueDate] = useState(card.due_date ? card.due_date.split('T')[0] : '')
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [currentTags, setCurrentTags] = useState<Tag[]>(card.tags)
  const [currentAssignees, setCurrentAssignees] = useState<User[]>(card.assignees)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [dirty, setDirty] = useState(false)
  const isDirtyRef = useRef(false)
  const [tagsLoaded, setTagsLoaded] = useState(false)
  const [usersLoaded, setUsersLoaded] = useState(false)
  const [showTagManager, setShowTagManager] = useState(false)
  const [editingTagId, setEditingTagId] = useState<number | null>(null)
  const [editingTagName, setEditingTagName] = useState('')
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0])

  // Keep latest values accessible in async callbacks without stale closures
  const stateRef = useRef({ title, jobNumber, projectAddress, description, priority, dueDate, currentTags, currentAssignees })
  stateRef.current = { title, jobNumber, projectAddress, description, priority, dueDate, currentTags, currentAssignees }

  useEffect(() => {
    api.tags.list().then(t => { setAllTags(t); setTagsLoaded(true) }).catch(() => setTagsLoaded(true))
    api.users.list().then(u => { setAllUsers(u); setUsersLoaded(true) }).catch(() => setUsersLoaded(true))
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

  function markDirty() { markDirty(); isDirtyRef.current = true }

  // Save on close if there are unsaved changes
  async function handleClose() {
    if (isDirtyRef.current) await performSave()
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

  async function handleCreateTag() {
    if (!newTagName.trim()) return
    try {
      const created = await api.tags.create({ name: newTagName.trim(), color: newTagColor })
      setAllTags(prev => [...prev, created])
      setNewTagName('')
    } catch {
      alert('Failed to create tag')
    }
  }

  async function handleUpdateTag(tagId: number) {
    if (!editingTagName.trim()) return
    try {
      const updated = await api.tags.update(tagId, { name: editingTagName.trim() })
      setAllTags(prev => prev.map(t => t.id === tagId ? { ...t, ...updated } : t))
      setCurrentTags(prev => prev.map(t => t.id === tagId ? { ...t, ...updated } : t))
      setEditingTagId(null)
    } catch {
      alert('Failed to update tag')
    }
  }

  async function handleDeleteTag(tagId: number, tagName: string) {
    if (!confirm(`Delete tag "${tagName}"? It will be removed from all cards.`)) return
    try {
      await api.tags.remove(tagId)
      setAllTags(prev => prev.filter(t => t.id !== tagId))
      setCurrentTags(prev => prev.filter(t => t.id !== tagId))
    } catch {
      alert('Failed to delete tag')
    }
  }

  return (
    <Dialog open onOpenChange={open => { if (!open) handleClose() }}>
      <DialogContent className="bg-[#141414] border-white/[0.08] text-white max-w-2xl p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-white/[0.06]">
          <input
            autoFocus
            value={title}
            onChange={e => { setTitle(e.target.value); stateRef.current.title = e.target.value; markDirty() }}
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
                onChange={e => { setJobNumber(e.target.value); stateRef.current.jobNumber = e.target.value; markDirty() }}
                placeholder="e.g. HC-2024-0542"
                className="w-full bg-[#1f1f1f] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 outline-none font-mono focus:border-white/20 transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1.5 block font-medium uppercase tracking-wide">Project Address</label>
              <input
                value={projectAddress}
                onChange={e => { setProjectAddress(e.target.value); stateRef.current.projectAddress = e.target.value; markDirty() }}
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
                    onClick={() => { setPriority(p); stateRef.current.priority = p; markDirty() }}
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
                onChange={e => { setDueDate(e.target.value); stateRef.current.dueDate = e.target.value; markDirty() }}
                className="w-full bg-[#1f1f1f] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-zinc-200 outline-none focus:border-white/20 transition-colors"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs text-zinc-500 mb-1.5 block font-medium uppercase tracking-wide">Description</label>
            <textarea
              value={description}
              onChange={e => { setDescription(e.target.value); stateRef.current.description = e.target.value; markDirty() }}
              rows={3}
              placeholder="Add a description..."
              className="w-full bg-[#1f1f1f] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 outline-none resize-none focus:border-white/20 transition-colors"
            />
          </div>

          {/* Assignees */}
          <div>
            <label className="text-xs text-zinc-500 mb-2 block font-medium uppercase tracking-wide">Assignees</label>
            {!usersLoaded ? (
              <p className="text-xs text-zinc-600">Loading...</p>
            ) : allUsers.length === 0 ? (
              <p className="text-xs text-zinc-600">No team members yet. Add members in the Team page.</p>
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
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-zinc-500 font-medium uppercase tracking-wide">Tags</label>
              <button
                onClick={() => setShowTagManager(v => !v)}
                className="text-xs text-zinc-600 hover:text-zinc-300 transition-colors px-2 py-0.5 rounded border border-transparent hover:border-white/[0.08]"
              >
                {showTagManager ? 'Done' : 'Manage'}
              </button>
            </div>
            {!tagsLoaded ? (
              <p className="text-xs text-zinc-600">Loading...</p>
            ) : (
              <>
                {allTags.length === 0 && !showTagManager && (
                  <p className="text-xs text-zinc-600 mb-2">No tags yet. Click <span className="text-zinc-400">Manage</span> to create one.</p>
                )}
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

                {showTagManager && (
                  <div className="mt-3 bg-[#111111] border border-white/[0.08] rounded-lg p-3 space-y-1.5">
                    {/* Existing tags list */}
                    {allTags.map(tag => (
                      <div key={tag.id} className="flex items-center gap-2 group/tag">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                        {editingTagId === tag.id ? (
                          <>
                            <input
                              autoFocus
                              value={editingTagName}
                              onChange={e => setEditingTagName(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleUpdateTag(tag.id)
                                if (e.key === 'Escape') setEditingTagId(null)
                              }}
                              className="flex-1 bg-[#1f1f1f] border border-white/[0.12] rounded px-2 py-0.5 text-xs text-zinc-200 outline-none focus:border-white/25"
                            />
                            <button
                              onClick={() => handleUpdateTag(tag.id)}
                              className="text-xs text-blue-400 hover:text-blue-300 px-1.5 transition-colors"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingTagId(null)}
                              className="text-xs text-zinc-600 hover:text-zinc-400 px-1.5 transition-colors"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="flex-1 text-xs text-zinc-300">{tag.name}</span>
                            <div className="flex gap-1 opacity-0 group-hover/tag:opacity-100 transition-opacity">
                              <button
                                onClick={() => { setEditingTagId(tag.id); setEditingTagName(tag.name) }}
                                className="p-1 rounded hover:bg-white/[0.08] text-zinc-500 hover:text-zinc-200 transition-all"
                                title="Edit tag"
                              >
                                <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                                  <path d="M8.5 1.5l2 2-7 7H1.5v-2l7-7z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDeleteTag(tag.id, tag.name)}
                                className="p-1 rounded hover:bg-red-500/10 text-zinc-500 hover:text-red-400 transition-all"
                                title="Delete tag"
                              >
                                <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                                  <path d="M2 3h8M5 3V2.5a.5.5 0 01.5-.5h1a.5.5 0 01.5.5V3M5 5.5v3M7 5.5v3M2.5 3l.5 6.5a.5.5 0 00.5.5h5a.5.5 0 00.5-.5L9.5 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}

                    {/* Divider */}
                    <div className="border-t border-white/[0.06] pt-2.5 mt-2.5">
                      <p className="text-[10px] text-zinc-600 uppercase tracking-wide mb-2">New Tag</p>
                      <div className="flex items-center gap-2">
                        <input
                          value={newTagName}
                          onChange={e => setNewTagName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleCreateTag() }}
                          placeholder="Tag name"
                          className="flex-1 bg-[#1f1f1f] border border-white/[0.08] rounded px-2 py-1 text-xs text-zinc-200 placeholder-zinc-600 outline-none focus:border-white/20 transition-colors"
                        />
                        <button
                          onClick={handleCreateTag}
                          disabled={!newTagName.trim()}
                          className="text-xs bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-2.5 py-1 rounded transition-colors font-medium shrink-0"
                        >
                          Add
                        </button>
                      </div>
                      {/* Color swatches */}
                      <div className="flex gap-1.5 mt-2">
                        {TAG_COLORS.map(color => (
                          <button
                            key={color}
                            onClick={() => setNewTagColor(color)}
                            className="w-5 h-5 rounded-full transition-transform hover:scale-110 shrink-0"
                            style={{
                              backgroundColor: color,
                              outline: newTagColor === color ? `2px solid ${color}` : 'none',
                              outlineOffset: '2px',
                            }}
                            title={color}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </>
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
