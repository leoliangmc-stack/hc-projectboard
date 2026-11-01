'use client'
import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { Column, Member, Tag } from '@/lib/types'
import { cn } from '@/lib/utils'
import { SortableCard } from './ProjectCard'

interface KanbanColumnProps {
  column: Column
  tagsById: Map<string, Tag>
  membersById: Map<string, Member>
  today: string
  onOpenCard: (cardId: string) => void
  onAddCard: (columnId: string, title: string) => void
  onRename: (columnId: string, name: string) => void
  onDelete: (columnId: string) => void
}

export function KanbanColumn({
  column,
  tagsById,
  membersById,
  today,
  onOpenCard,
  onAddCard,
  onRename,
  onDelete,
}: KanbanColumnProps) {
  const [nameDraft, setNameDraft] = useState<string | null>(null)
  const [cardDraft, setCardDraft] = useState<string | null>(null)

  // The whole column is a drop target, so cards can be dropped onto empty columns or headers.
  const { setNodeRef, isOver } = useDroppable({ id: column.id, data: { type: 'column' } })

  function commitName() {
    const name = nameDraft?.trim()
    if (name && name !== column.name) onRename(column.id, name)
    setNameDraft(null)
  }

  function commitCard() {
    const title = cardDraft?.trim()
    if (!title) return
    onAddCard(column.id, title)
    setCardDraft('') // keep the form open for quickly adding several cards
  }

  return (
    <section
      ref={setNodeRef}
      aria-label={column.name}
      data-column-id={column.id}
      className={cn(
        'group/col flex max-h-full w-72 shrink-0 snap-start flex-col rounded-xl border bg-white/[0.02] transition-colors',
        isOver ? 'border-blue-500/30 bg-blue-500/[0.03]' : 'border-white/[0.06]',
      )}
    >
      <header className="flex items-center justify-between gap-1 px-3 pt-3 pb-2 pointer-coarse:pt-1 pointer-coarse:pb-0">
        {nameDraft !== null ? (
          <input
            autoFocus
            aria-label="Column name"
            value={nameDraft}
            onChange={e => setNameDraft(e.target.value)}
            onFocus={e => e.target.select()}
            onBlur={commitName}
            onKeyDown={e => {
              if (e.key === 'Enter') commitName()
              if (e.key === 'Escape') setNameDraft(null)
            }}
            className="tap-target w-full rounded border border-white/[0.15] bg-white/[0.06] px-2 py-0.5 text-sm font-medium text-zinc-200 outline-none"
          />
        ) : (
          <>
            <div className="flex min-w-0 items-center gap-2">
              <button
                onClick={() => setNameDraft(column.name)}
                className="tap-target truncate text-left text-sm font-medium text-zinc-300 transition-colors hover:text-white"
                title="Click to rename"
              >
                {column.name}
              </button>
              <span className="shrink-0 rounded-full bg-white/[0.05] px-2 py-0.5 text-xs text-zinc-500">
                {column.cards.length}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              <button
                onClick={() => onDelete(column.id)}
                className="tap-target flex h-6 w-6 items-center justify-center rounded text-zinc-600 opacity-0 transition-all group-hover/col:opacity-100 hover:bg-red-500/10 hover:text-red-400 focus-visible:opacity-100 pointer-coarse:opacity-100"
                title="Delete column"
                aria-label={`Delete column ${column.name}`}
              >
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden>
                  <path
                    d="M2 3.5h9M5 3.5V2.5a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v1M5.5 6v4M7.5 6v4M3 3.5l.5 7a.5.5 0 00.5.5h5a.5.5 0 00.5-.5l.5-7"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <button
                onClick={() => setCardDraft('')}
                className="tap-target flex h-6 w-6 items-center justify-center rounded text-lg leading-none text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-300"
                title="Add card"
                aria-label={`Add card to ${column.name}`}
              >
                +
              </button>
            </div>
          </>
        )}
      </header>

      <div className="flex min-h-[3rem] flex-col gap-2 overflow-y-auto px-2 pb-2">
        <SortableContext items={column.cards.map(c => c.id)} strategy={verticalListSortingStrategy}>
          {column.cards.map(card => (
            <SortableCard
              key={card.id}
              card={card}
              tags={card.tagIds.flatMap(id => tagsById.get(id) ?? [])}
              assignees={card.assigneeIds.flatMap(id => membersById.get(id) ?? [])}
              today={today}
              onOpen={onOpenCard}
            />
          ))}
        </SortableContext>

        {column.cards.length === 0 && cardDraft === null && (
          <p className="rounded-lg border border-dashed border-white/[0.08] px-3 py-4 text-center text-xs text-zinc-600">
            Drop cards here
          </p>
        )}

        {cardDraft !== null && (
          <div className="rounded-lg border border-white/10 bg-[#1a1a1a] p-2">
            <textarea
              autoFocus
              aria-label="Card title"
              value={cardDraft}
              onChange={e => setCardDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  commitCard()
                }
                if (e.key === 'Escape') setCardDraft(null)
              }}
              placeholder="Project name…"
              className="w-full resize-none bg-transparent text-sm text-zinc-200 placeholder-zinc-600 outline-none"
              rows={2}
            />
            <div className="mt-2 flex gap-2">
              <button
                onClick={commitCard}
                disabled={!cardDraft.trim()}
                className="tap-target rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
              >
                Add card
              </button>
              <button
                onClick={() => setCardDraft(null)}
                className="tap-target text-xs text-zinc-500 transition-colors hover:text-zinc-300"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {cardDraft === null && (
        <button
          onClick={() => setCardDraft('')}
          data-guide="add-card"
          className="tap-target mx-2 mb-2 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-xs text-zinc-600 transition-colors hover:bg-white/[0.04] hover:text-zinc-300"
        >
          <span className="text-base leading-none">+</span> Add card
        </button>
      )}
    </section>
  )
}
