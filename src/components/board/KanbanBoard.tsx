'use client'
import { useMemo, useRef, useState } from 'react'
import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { useBoard } from '@/hooks/useBoard'
import { createCard, createId, findCard, nextCardCode } from '@/lib/board'
import { toIsoDate } from '@/lib/dates'
import { createSampleBoard } from '@/lib/sampleData'
import type { Board } from '@/lib/types'
import { BoardHeader } from './BoardHeader'
import { CardDetailModal } from './CardDetailModal'
import { KanbanColumn } from './KanbanColumn'
import { CardView } from './ProjectCard'

const SCREEN_READER_INSTRUCTIONS =
  'To pick up a card, press Space. Use the arrow keys to move it between positions and columns. ' +
  'Press Space or Enter to drop it, or Escape to cancel. Press Enter on a card to open its details.'

export function KanbanBoard() {
  const [board, dispatch] = useBoard()
  const [today] = useState(() => toIsoDate(new Date()))
  const [activeCardId, setActiveCardId] = useState<string | null>(null)
  const [openCardId, setOpenCardId] = useState<string | null>(null)
  const [titleDraft, setTitleDraft] = useState<string | null>(null)
  const [columnDraft, setColumnDraft] = useState<string | null>(null)

  // Board as it was when the drag started, restored if the drag is cancelled.
  const dragSnapshot = useRef<Board | null>(null)

  const tagsById = useMemo(() => new Map(board.tags.map(t => [t.id, t])), [board.tags])
  const membersById = useMemo(() => new Map(board.members.map(m => [m.id, m])), [board.members])
  const cardCount = board.columns.reduce((sum, c) => sum + c.cards.length, 0)

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // A short press-and-hold on touch screens, so swiping still scrolls the board.
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space', 'Enter'] },
    }),
  )

  /** Column a droppable belongs to: either the column itself or the column holding the card. */
  function columnIdOf(id: UniqueIdentifier): string | null {
    const key = String(id)
    if (board.columns.some(c => c.id === key)) return key
    return findCard(board, key)?.column.id ?? null
  }

  function handleDragStart({ active }: DragStartEvent) {
    dragSnapshot.current = board
    setActiveCardId(String(active.id))
  }

  // Moving between columns happens while dragging, so the card previews in its new column.
  function handleDragOver({ active, over }: DragOverEvent) {
    if (!over) return
    const cardId = String(active.id)
    const from = findCard(board, cardId)
    const toColumnId = columnIdOf(over.id)
    if (!from || !toColumnId || from.column.id === toColumnId) return

    const toColumn = board.columns.find(c => c.id === toColumnId)!
    let toIndex = toColumn.cards.length
    if (over.data.current?.type === 'card') {
      const overIndex = toColumn.cards.findIndex(c => c.id === over.id)
      const dragged = active.rect.current.translated
      const isBelowOver = dragged != null && dragged.top > over.rect.top + over.rect.height / 2
      toIndex = overIndex + (isBelowOver ? 1 : 0)
    }
    dispatch({ type: 'moveCard', cardId, toColumnId, toIndex })
  }

  // Reordering inside a column is committed on drop.
  function handleDragEnd({ active, over }: DragEndEvent) {
    const snapshot = dragSnapshot.current
    dragSnapshot.current = null
    setActiveCardId(null)

    if (!over) {
      if (snapshot) dispatch({ type: 'replace', board: snapshot })
      return
    }
    if (over.data.current?.type !== 'card' || active.id === over.id) return

    const from = findCard(board, String(active.id))
    const to = findCard(board, String(over.id))
    if (from && to && from.column.id === to.column.id && from.index !== to.index) {
      dispatch({ type: 'moveCard', cardId: from.card.id, toColumnId: to.column.id, toIndex: to.index })
    }
  }

  function handleDragCancel() {
    if (dragSnapshot.current) dispatch({ type: 'replace', board: dragSnapshot.current })
    dragSnapshot.current = null
    setActiveCardId(null)
  }

  /** Screen-reader description of a drop target (a card's slot or a column). */
  function describePosition(id: UniqueIdentifier) {
    const card = findCard(board, String(id))
    if (card) return `position ${card.index + 1} of ${card.column.cards.length} in ${card.column.name}`
    const column = board.columns.find(c => c.id === id)
    return column ? `the end of ${column.name}` : 'the board'
  }

  function titleOf(id: UniqueIdentifier) {
    return findCard(board, String(id))?.card.title ?? 'card'
  }

  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${titleOf(active.id)} at ${describePosition(active.id)}.`,
    onDragOver: ({ active, over }) =>
      over ? `${titleOf(active.id)} is over ${describePosition(over.id)}.` : `${titleOf(active.id)} is not over a column.`,
    onDragEnd: ({ active, over }) =>
      over ? `Dropped ${titleOf(active.id)} at ${describePosition(over.id)}.` : `Dropped ${titleOf(active.id)}.`,
    onDragCancel: ({ active }) => `Cancelled. ${titleOf(active.id)} returned to its original position.`,
  }

  function addCard(columnId: string, title: string) {
    dispatch({ type: 'addCard', columnId, card: createCard({ title, code: nextCardCode(board) }) })
  }

  function deleteColumn(columnId: string) {
    const column = board.columns.find(c => c.id === columnId)
    if (!column) return
    const count = column.cards.length
    const message =
      count > 0
        ? `Delete "${column.name}" and the ${count} card${count === 1 ? '' : 's'} in it?`
        : `Delete column "${column.name}"?`
    if (confirm(message)) dispatch({ type: 'deleteColumn', columnId })
  }

  function commitTitle() {
    const title = titleDraft?.trim()
    if (title) dispatch({ type: 'renameBoard', title })
    setTitleDraft(null)
  }

  function commitColumn() {
    const name = columnDraft?.trim()
    if (!name) return
    dispatch({ type: 'addColumn', column: { id: createId(), name, cards: [] } })
    setColumnDraft(null)
  }

  function resetBoard() {
    if (!confirm('Reset the board to the sample projects? Your changes will be lost.')) return
    setOpenCardId(null)
    dispatch({ type: 'replace', board: createSampleBoard() })
  }

  const activeCard = activeCardId ? findCard(board, activeCardId)?.card : undefined
  const openCard = openCardId ? findCard(board, openCardId) : null

  return (
    <div className="flex h-full flex-col">
      <BoardHeader
        title={
          titleDraft !== null ? (
            <input
              autoFocus
              aria-label="Board title"
              value={titleDraft}
              onChange={e => setTitleDraft(e.target.value)}
              onFocus={e => e.target.select()}
              onBlur={commitTitle}
              onKeyDown={e => {
                if (e.key === 'Enter') commitTitle()
                if (e.key === 'Escape') setTitleDraft(null)
              }}
              className="w-full max-w-sm rounded border border-white/[0.15] bg-white/[0.06] px-2 py-0.5 text-base font-semibold text-white outline-none"
            />
          ) : (
            <div className="flex min-w-0 items-baseline gap-3">
              <h1 className="min-w-0 truncate text-base font-semibold text-white">
                <button
                  onClick={() => setTitleDraft(board.title)}
                  title="Click to rename"
                  className="max-w-full truncate transition-colors hover:text-zinc-300"
                >
                  {board.title}
                </button>
              </h1>
              <span className="shrink-0 text-xs text-zinc-500">
                {cardCount} card{cardCount === 1 ? '' : 's'} · {board.columns.length} column
                {board.columns.length === 1 ? '' : 's'}
              </span>
            </div>
          )
        }
        actions={
          <>
            <span className="hidden text-xs text-zinc-600 md:inline">Changes are saved in this browser</span>
            <button
              onClick={resetBoard}
              className="rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:border-white/[0.15] hover:text-white"
            >
              Reset demo
            </button>
          </>
        }
      />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
        accessibility={{ announcements, screenReaderInstructions: { draggable: SCREEN_READER_INSTRUCTIONS } }}
      >
        <div className="flex min-h-0 flex-1 items-start gap-4 overflow-x-auto p-6">
          {board.columns.map(column => (
            <KanbanColumn
              key={column.id}
              column={column}
              tagsById={tagsById}
              membersById={membersById}
              today={today}
              onOpenCard={setOpenCardId}
              onAddCard={addCard}
              onRename={(columnId, name) => dispatch({ type: 'renameColumn', columnId, name })}
              onDelete={deleteColumn}
            />
          ))}

          {columnDraft !== null ? (
            <div className="flex w-72 shrink-0 flex-col rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
              <input
                autoFocus
                aria-label="Column name"
                value={columnDraft}
                onChange={e => setColumnDraft(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') commitColumn()
                  if (e.key === 'Escape') setColumnDraft(null)
                }}
                placeholder="Column name…"
                className="mb-3 border-b border-white/[0.08] bg-transparent pb-2 text-sm text-zinc-200 placeholder-zinc-600 outline-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={commitColumn}
                  disabled={!columnDraft.trim()}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
                >
                  Add column
                </button>
                <button
                  onClick={() => setColumnDraft(null)}
                  className="text-xs text-zinc-500 transition-colors hover:text-zinc-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setColumnDraft('')}
              className="flex w-72 shrink-0 items-center gap-2 rounded-xl border border-dashed border-white/[0.10] px-4 py-3 text-sm text-zinc-500 transition-colors hover:border-white/[0.20] hover:text-zinc-300"
            >
              <span className="text-lg leading-none">+</span>
              Add column
            </button>
          )}
        </div>

        <DragOverlay>
          {activeCard ? (
            // Plain wrapper: dnd-kit measures the overlay's first child, and the tilted card's
            // rotated bounding box would otherwise throw off keyboard navigation.
            <div>
              <CardView
                card={activeCard}
                tags={activeCard.tagIds.flatMap(id => tagsById.get(id) ?? [])}
                assignees={activeCard.assigneeIds.flatMap(id => membersById.get(id) ?? [])}
                today={today}
                isOverlay
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {openCard && (
        <CardDetailModal
          key={openCard.card.id}
          card={openCard.card}
          columnId={openCard.column.id}
          columns={board.columns}
          tags={board.tags}
          members={board.members}
          dispatch={dispatch}
          onClose={() => setOpenCardId(null)}
        />
      )}
    </div>
  )
}
