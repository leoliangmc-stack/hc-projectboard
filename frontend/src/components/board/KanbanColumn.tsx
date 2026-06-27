'use client'
import { useState, useRef } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { Card, List } from '@/lib/types'
import { TaskCard } from './TaskCard'
import { api } from '@/lib/api'

interface KanbanColumnProps {
  list: List
  onCardClick: (card: Card) => void
  onCardCreate: (listId: number, card: Card) => void
  onDelete: (listId: number) => void
}

export function KanbanColumn({ list, onCardClick, onCardCreate, onDelete }: KanbanColumnProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [adding, setAdding] = useState(false)

  const [editingName, setEditingName] = useState(false)
  const [columnName, setColumnName] = useState(list.name)
  const nameInputRef = useRef<HTMLInputElement>(null)

  const { setNodeRef, isOver } = useDroppable({ id: `list-${list.id}` })

  async function handleAddCard() {
    if (!newTitle.trim() || adding) return
    setAdding(true)
    try {
      const card = await api.cards.create({ list_id: list.id, title: newTitle.trim() })
      onCardCreate(list.id, { ...card, tags: card.tags ?? [], assignees: card.assignees ?? [] })
      setNewTitle('')
      setIsAdding(false)
    } catch {
      // silently fail
    } finally {
      setAdding(false)
    }
  }

  function startEditName() {
    setEditingName(true)
    setTimeout(() => {
      nameInputRef.current?.focus()
      nameInputRef.current?.select()
    }, 30)
  }

  async function commitNameEdit() {
    const trimmed = columnName.trim()
    if (!trimmed) {
      setColumnName(list.name)
      setEditingName(false)
      return
    }
    setEditingName(false)
    if (trimmed === list.name) return
    try {
      await api.lists.update(list.id, trimmed)
    } catch {
      setColumnName(list.name)
    }
  }

  return (
    <div className="group/col flex flex-col w-72 shrink-0">
      {/* Column header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {editingName ? (
            <input
              ref={nameInputRef}
              value={columnName}
              onChange={e => setColumnName(e.target.value)}
              onBlur={commitNameEdit}
              onKeyDown={e => {
                if (e.key === 'Enter') commitNameEdit()
                if (e.key === 'Escape') { setColumnName(list.name); setEditingName(false) }
              }}
              className="text-sm font-medium text-zinc-200 bg-white/[0.06] border border-white/[0.15] rounded px-2 py-0.5 outline-none w-full"
            />
          ) : (
            <button
              onClick={startEditName}
              className="text-sm font-medium text-zinc-300 hover:text-white truncate text-left transition-colors"
              title="Click to rename"
            >
              {columnName}
            </button>
          )}
          {!editingName && (
            <span className="text-xs text-zinc-600 bg-white/[0.05] px-2 py-0.5 rounded-full shrink-0">
              {list.cards.length}
            </span>
          )}
        </div>
        {!editingName && (
          <div className="flex items-center gap-0.5 shrink-0 ml-1">
            {/* Delete column — visible on hover */}
            <button
              onClick={() => onDelete(list.id)}
              className="opacity-0 group-hover/col:opacity-100 text-zinc-700 hover:text-red-400 transition-all w-6 h-6 flex items-center justify-center rounded hover:bg-red-500/10"
              title="Delete column"
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M2 3.5h9M5 3.5V2.5a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v1M5.5 6v4M7.5 6v4M3 3.5l.5 7a.5.5 0 00.5.5h5a.5.5 0 00.5-.5l.5-7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {/* Add card */}
            <button
              onClick={() => setIsAdding(true)}
              className="text-zinc-600 hover:text-zinc-400 text-lg leading-none transition-colors w-6 h-6 flex items-center justify-center rounded hover:bg-white/[0.06]"
            >
              +
            </button>
          </div>
        )}
      </div>

      {/* Cards */}
      <div
        ref={setNodeRef}
        className={`flex flex-col gap-2 min-h-[40px] rounded-lg transition-colors ${isOver ? 'bg-white/[0.03]' : ''}`}
      >
        <SortableContext
          items={list.cards.map(c => `card-${c.id}`)}
          strategy={verticalListSortingStrategy}
        >
          {list.cards.map(card => (
            <TaskCard key={card.id} card={card} onClick={onCardClick} />
          ))}
        </SortableContext>

        {/* Add card form */}
        {isAdding && (
          <div className="bg-[#1a1a1a] border border-white/10 rounded-lg p-2">
            <textarea
              autoFocus
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddCard() }
                if (e.key === 'Escape') { setIsAdding(false); setNewTitle('') }
              }}
              placeholder="Card title..."
              className="w-full bg-transparent text-sm text-zinc-200 placeholder-zinc-600 resize-none outline-none"
              rows={2}
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleAddCard}
                disabled={adding || !newTitle.trim()}
                className="text-xs bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-3 py-1 rounded transition-colors"
              >
                Add
              </button>
              <button
                onClick={() => { setIsAdding(false); setNewTitle('') }}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
