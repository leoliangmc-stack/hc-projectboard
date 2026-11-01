'use client'
import { useState, type Dispatch } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { createId, PRIORITIES, TAG_COLORS, type BoardAction } from '@/lib/board'
import type { Card, Column, Member, Tag } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Avatar, capitalize, PRIORITY_STYLES } from './ProjectCard'

interface CardDetailModalProps {
  card: Card
  columnId: string
  columns: Column[]
  tags: Tag[]
  members: Member[]
  dispatch: Dispatch<BoardAction>
  onClose: () => void
}

const LABEL = 'mb-1.5 block text-xs font-medium tracking-wide text-zinc-500 uppercase'
const FIELD =
  'w-full rounded-lg border border-white/[0.08] bg-[#1f1f1f] px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 outline-none transition-colors focus:border-white/20'

export function CardDetailModal({ card, columnId, columns, tags, members, dispatch, onClose }: CardDetailModalProps) {
  // Title and code keep a local draft so the input can be cleared while typing;
  // only non-empty, trimmed values are written to the board.
  const [title, setTitle] = useState(card.title)
  const [code, setCode] = useState(card.code)
  const [showTagManager, setShowTagManager] = useState(false)

  function update(changes: Partial<Omit<Card, 'id'>>) {
    dispatch({ type: 'updateCard', cardId: card.id, changes })
  }

  function toggle(list: string[], id: string) {
    return list.includes(id) ? list.filter(x => x !== id) : [...list, id]
  }

  function moveTo(targetColumnId: string) {
    const target = columns.find(c => c.id === targetColumnId)
    if (!target || target.id === columnId) return
    dispatch({ type: 'moveCard', cardId: card.id, toColumnId: target.id, toIndex: target.cards.length })
  }

  function handleDelete() {
    if (!confirm(`Delete "${card.title}"? This cannot be undone.`)) return
    dispatch({ type: 'deleteCard', cardId: card.id })
    onClose()
  }

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="gap-0 overflow-hidden border-white/[0.08] bg-[#141414] p-0 text-white sm:max-w-2xl">
        <DialogTitle className="sr-only">Card details</DialogTitle>

        <div className="border-b border-white/[0.06] px-6 pt-6 pb-4">
          <div className="mb-3 flex flex-wrap items-center gap-2 pr-8">
            <input
              aria-label="Project code"
              value={code}
              onChange={e => {
                setCode(e.target.value)
                update({ code: e.target.value.trim() })
              }}
              placeholder="PRJ-000"
              className="w-28 rounded bg-white/[0.05] px-2 py-1 font-mono text-xs text-zinc-300 placeholder-zinc-600 outline-none focus:ring-1 focus:ring-white/20"
            />
            <label className="flex items-center gap-1.5 text-xs text-zinc-500">
              in
              <select
                aria-label="Column"
                value={columnId}
                onChange={e => moveTo(e.target.value)}
                className="rounded border border-white/[0.08] bg-[#1f1f1f] px-2 py-1 text-xs text-zinc-200 outline-none focus:border-white/20"
              >
                {columns.map(column => (
                  <option key={column.id} value={column.id}>
                    {column.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <input
            autoFocus
            aria-label="Title"
            value={title}
            onChange={e => {
              setTitle(e.target.value)
              const trimmed = e.target.value.trim()
              if (trimmed) update({ title: trimmed })
            }}
            className="w-full border-none bg-transparent text-xl font-semibold text-white placeholder-zinc-600 outline-none"
            placeholder="Project title"
          />
        </div>

        <div className="max-h-[60vh] space-y-5 overflow-y-auto px-6 py-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <span className={LABEL}>Priority</span>
              <div className="flex flex-wrap gap-1.5">
                {PRIORITIES.map(p => (
                  <button
                    key={p}
                    onClick={() => update({ priority: p })}
                    aria-pressed={card.priority === p}
                    className={cn(
                      'rounded border px-2.5 py-1 text-[11px] font-medium transition-all',
                      card.priority === p
                        ? PRIORITY_STYLES[p].chip
                        : 'border-white/[0.08] text-zinc-500 hover:border-white/[0.15] hover:text-zinc-300',
                    )}
                  >
                    {capitalize(p)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor="card-due-date" className={LABEL}>
                Due date
              </label>
              <input
                id="card-due-date"
                type="date"
                value={card.dueDate ?? ''}
                onChange={e => update({ dueDate: e.target.value || null })}
                className={cn(FIELD, '[color-scheme:dark]')}
              />
            </div>
          </div>

          <div>
            <label htmlFor="card-location" className={LABEL}>
              Location
            </label>
            <input
              id="card-location"
              value={card.location}
              onChange={e => update({ location: e.target.value })}
              placeholder="Site or region"
              className={FIELD}
            />
          </div>

          <div>
            <label htmlFor="card-description" className={LABEL}>
              Description
            </label>
            <textarea
              id="card-description"
              value={card.description}
              onChange={e => update({ description: e.target.value })}
              rows={3}
              placeholder="Add a description…"
              className={cn(FIELD, 'resize-none py-2.5')}
            />
          </div>

          <div>
            <span className={LABEL}>Assignees</span>
            <div className="flex flex-wrap gap-2">
              {members.map(member => {
                const active = card.assigneeIds.includes(member.id)
                return (
                  <button
                    key={member.id}
                    onClick={() => update({ assigneeIds: toggle(card.assigneeIds, member.id) })}
                    aria-pressed={active}
                    className={cn(
                      'flex items-center gap-2 rounded-full border py-1 pr-3 pl-1 text-sm transition-all',
                      active
                        ? 'border-blue-500/40 bg-blue-600/20 text-blue-200'
                        : 'border-white/[0.08] bg-white/[0.03] text-zinc-400 hover:border-white/[0.15] hover:text-zinc-200',
                    )}
                  >
                    <Avatar member={member} className="h-5 w-5 text-[9px]" />
                    {member.name}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className={cn(LABEL, 'mb-0')}>Tags</span>
              <button
                onClick={() => setShowTagManager(v => !v)}
                className="rounded border border-transparent px-2 py-0.5 text-xs text-zinc-500 transition-colors hover:border-white/[0.08] hover:text-zinc-300"
              >
                {showTagManager ? 'Done' : 'Manage'}
              </button>
            </div>
            {tags.length === 0 && !showTagManager && (
              <p className="text-xs text-zinc-600">
                No tags yet. Click <span className="text-zinc-400">Manage</span> to create one.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {tags.map(tag => {
                const active = card.tagIds.includes(tag.id)
                return (
                  <button
                    key={tag.id}
                    onClick={() => update({ tagIds: toggle(card.tagIds, tag.id) })}
                    aria-pressed={active}
                    style={
                      active
                        ? { backgroundColor: `${tag.color}22`, borderColor: `${tag.color}55`, color: tag.color }
                        : undefined
                    }
                    className={cn(
                      'rounded-full border px-3 py-1 text-sm transition-all',
                      !active &&
                        'border-white/[0.08] bg-white/[0.03] text-zinc-400 hover:border-white/[0.15] hover:text-zinc-200',
                    )}
                  >
                    {tag.name}
                  </button>
                )
              })}
            </div>
            {showTagManager && <TagManager tags={tags} dispatch={dispatch} />}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-white/[0.06] bg-[#111111]/50 px-6 py-4">
          <button onClick={handleDelete} className="text-sm text-zinc-500 transition-colors hover:text-red-400">
            Delete card
          </button>
          <button
            onClick={onClose}
            className="rounded-lg bg-white/[0.08] px-4 py-1.5 text-sm font-medium text-zinc-200 transition-colors hover:bg-white/[0.12]"
          >
            Done
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function TagManager({ tags, dispatch }: { tags: Tag[]; dispatch: Dispatch<BoardAction> }) {
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(TAG_COLORS[0])

  function saveEdit() {
    const name = editing?.name.trim()
    if (editing && name) dispatch({ type: 'updateTag', tagId: editing.id, changes: { name } })
    setEditing(null)
  }

  function createTag() {
    const name = newName.trim()
    if (!name) return
    dispatch({ type: 'addTag', tag: { id: createId(), name, color: newColor } })
    setNewName('')
  }

  function deleteTag(tag: Tag) {
    if (!confirm(`Delete tag "${tag.name}"? It will be removed from all cards.`)) return
    dispatch({ type: 'deleteTag', tagId: tag.id })
  }

  return (
    <div className="mt-3 space-y-1.5 rounded-lg border border-white/[0.08] bg-[#111111] p-3">
      {tags.map(tag => (
        <div key={tag.id} className="group/tag flex items-center gap-2">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: tag.color }} />
          {editing?.id === tag.id ? (
            <>
              <input
                autoFocus
                aria-label="Tag name"
                value={editing.name}
                onChange={e => setEditing({ id: tag.id, name: e.target.value })}
                onKeyDown={e => {
                  if (e.key === 'Enter') saveEdit()
                  if (e.key === 'Escape') setEditing(null)
                }}
                className="flex-1 rounded border border-white/[0.12] bg-[#1f1f1f] px-2 py-0.5 text-xs text-zinc-200 outline-none focus:border-white/25"
              />
              <button onClick={saveEdit} className="px-1.5 text-xs text-blue-400 hover:text-blue-300">
                Save
              </button>
              <button onClick={() => setEditing(null)} className="px-1.5 text-xs text-zinc-500 hover:text-zinc-300">
                Cancel
              </button>
            </>
          ) : (
            <>
              <span className="flex-1 text-xs text-zinc-300">{tag.name}</span>
              <div className="flex gap-1 opacity-0 transition-opacity group-hover/tag:opacity-100 focus-within:opacity-100">
                <button
                  onClick={() => setEditing({ id: tag.id, name: tag.name })}
                  className="rounded p-1 text-zinc-500 hover:bg-white/[0.08] hover:text-zinc-200"
                  aria-label={`Rename tag ${tag.name}`}
                >
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden>
                    <path d="M8.5 1.5l2 2-7 7H1.5v-2l7-7z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <button
                  onClick={() => deleteTag(tag)}
                  className="rounded p-1 text-zinc-500 hover:bg-red-500/10 hover:text-red-400"
                  aria-label={`Delete tag ${tag.name}`}
                >
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden>
                    <path
                      d="M2 3h8M5 3V2.5a.5.5 0 01.5-.5h1a.5.5 0 01.5.5V3M5 5.5v3M7 5.5v3M2.5 3l.5 6.5a.5.5 0 00.5.5h5a.5.5 0 00.5-.5L9.5 3"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            </>
          )}
        </div>
      ))}

      <div className="mt-2.5 border-t border-white/[0.06] pt-2.5">
        <p className="mb-2 text-[10px] tracking-wide text-zinc-600 uppercase">New tag</p>
        <div className="flex items-center gap-2">
          <input
            aria-label="New tag name"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createTag()}
            placeholder="Tag name"
            className="flex-1 rounded border border-white/[0.08] bg-[#1f1f1f] px-2 py-1 text-xs text-zinc-200 placeholder-zinc-600 outline-none focus:border-white/20"
          />
          <button
            onClick={createTag}
            disabled={!newName.trim()}
            className="shrink-0 rounded bg-blue-600 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Add
          </button>
        </div>
        <div className="mt-2 flex gap-1.5">
          {TAG_COLORS.map(color => (
            <button
              key={color}
              onClick={() => setNewColor(color)}
              aria-label={`Colour ${color}`}
              aria-pressed={newColor === color}
              className="h-5 w-5 shrink-0 rounded-full transition-transform hover:scale-110"
              style={{
                backgroundColor: color,
                outline: newColor === color ? `2px solid ${color}` : 'none',
                outlineOffset: '2px',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
