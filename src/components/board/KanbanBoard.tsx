'use client'
import { useCallback, useMemo, useRef, useState } from 'react'
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
import { useTouchEdgePaging } from '@/hooks/useTouchEdgePaging'
import { createCard, createId, findCard, nextCardCode } from '@/lib/board'
import { toIsoDate } from '@/lib/dates'
import { createSampleBoard } from '@/lib/sampleData'
import { hasSeenGuide, markGuideSeen } from '@/lib/storage'
import type { Board } from '@/lib/types'
import { cn } from '@/lib/utils'
import { BoardHeader } from './BoardHeader'
import { CardDetailModal } from './CardDetailModal'
import { KanbanColumn } from './KanbanColumn'
import { OnboardingGuide } from './OnboardingGuide'
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
  // Shown automatically on the first visit; can be replayed from the header.
  const [showGuide, setShowGuide] = useState(() => !hasSeenGuide())

  // Board as it was when the drag started, restored if the drag is cancelled.
  const dragSnapshot = useRef<Board | null>(null)

  const boardRef = useRef<HTMLDivElement>(null)
  const edgePaging = useTouchEdgePaging(boardRef)
  // Touch drags page the board one column at a time (see useTouchEdgePaging), so for them
  // dnd-kit's own auto-scroll only scrolls inside a column, never the board sideways.
  const autoScroll = useMemo(
    () => ({ canScroll: (element: Element) => !(edgePaging.isActive() && element === boardRef.current) }),
    [edgePaging],
  )

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

  function handleDragStart({ active, activatorEvent }: DragStartEvent) {
    dragSnapshot.current = board
    setActiveCardId(String(active.id))
    if ('touches' in activatorEvent && activatorEvent.target) edgePaging.start(activatorEvent.target)
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
    edgePaging.stop()

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
    edgePaging.stop()
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

  const closeGuide = useCallback(() => {
    markGuideSeen()
    setShowGuide(false)
  }, [])

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
              className="tap-target w-full max-w-sm rounded border border-white/[0.15] bg-white/[0.06] px-2 py-0.5 text-base font-semibold text-white outline-none"
            />
          ) : (
            <div className="flex min-w-0 items-baseline gap-3">
              <h1 className="min-w-0 truncate text-base font-semibold text-white">
                <button
                  onClick={() => setTitleDraft(board.title)}
                  title="Click to rename"
                  className="tap-target max-w-full truncate text-left transition-colors hover:text-zinc-300"
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
            <span className="hidden text-xs text-zinc-600 lg:inline">Changes are saved in this browser</span>
            <button
              onClick={() => setShowGuide(true)}
              className="tap-target flex items-center gap-1.5 rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:border-white/[0.15] hover:text-white"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                <circle cx="6" cy="6" r="5.25" stroke="currentColor" strokeWidth="1.1" />
                <path d="M4.6 4.7a1.45 1.45 0 0 1 2.8.45c0 .95-1.4 1.2-1.4 2.05" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
                <circle cx="6" cy="8.85" r="0.6" fill="currentColor" />
              </svg>
              Guide
            </button>
            <button
              onClick={resetBoard}
              className="tap-target rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:border-white/[0.15] hover:text-white"
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
        autoScroll={autoScroll}
        accessibility={{ announcements, screenReaderInstructions: { draggable: SCREEN_READER_INSTRUCTIONS } }}
      >
        <div
          ref={boardRef}
          className={cn(
            'flex min-h-0 flex-1 items-start gap-4 overflow-x-auto p-6 max-sm:scroll-px-6',
            // On phones the board snaps to one column at a time. Snapping is off during a drag,
            // where it would fight the scrolling that carries the card to another column.
            !activeCardId && 'max-sm:snap-x max-sm:snap-mandatory',
          )}
        >
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
            <div className="flex w-72 shrink-0 snap-start flex-col rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
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
                className="tap-target mb-3 border-b border-white/[0.08] bg-transparent pb-2 text-sm text-zinc-200 placeholder-zinc-600 outline-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={commitColumn}
                  disabled={!columnDraft.trim()}
                  className="tap-target rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
                >
                  Add column
                </button>
                <button
                  onClick={() => setColumnDraft(null)}
                  className="tap-target text-xs text-zinc-500 transition-colors hover:text-zinc-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setColumnDraft('')}
              className="flex w-72 shrink-0 snap-start items-center gap-2 rounded-xl border border-dashed border-white/[0.10] px-4 py-3 text-sm text-zinc-500 transition-colors hover:border-white/[0.20] hover:text-zinc-300"
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

      {showGuide && (
        <OnboardingGuide
          board={board}
          tagsById={tagsById}
          membersById={membersById}
          today={today}
          onClose={closeGuide}
        />
      )}

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
