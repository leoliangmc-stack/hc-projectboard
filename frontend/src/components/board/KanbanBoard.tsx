'use client'
import { useState, useCallback, useRef } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import type { BoardData, Card, List } from '@/lib/types'
import { KanbanColumn } from './KanbanColumn'
import { TaskCard } from './TaskCard'
import { TaskDetailModal } from '@/components/task/TaskDetailModal'
import { api } from '@/lib/api'

interface KanbanBoardProps {
  initialBoard: BoardData
}

export function KanbanBoard({ initialBoard }: KanbanBoardProps) {
  const [lists, setLists] = useState<List[]>(initialBoard.lists)
  const [activeCard, setActiveCard] = useState<Card | null>(null)
  const [selectedCard, setSelectedCard] = useState<Card | null>(null)
  const [addingColumn, setAddingColumn] = useState(false)
  const [newColumnName, setNewColumnName] = useState('')
  const [addingCol, setAddingCol] = useState(false)
  const newColInputRef = useRef<HTMLInputElement>(null)

  // Track which list the card came from at drag start
  const dragOriginListId = useRef<number | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  function findListByCardId(cardId: number): List | undefined {
    return lists.find(l => l.cards.some(c => c.id === cardId))
  }

  function findCard(cardId: number): Card | undefined {
    for (const list of lists) {
      const card = list.cards.find(c => c.id === cardId)
      if (card) return card
    }
  }

  function onDragStart(event: DragStartEvent) {
    const cardId = event.active.data.current?.cardId as number
    const card = findCard(cardId)
    setActiveCard(card ?? null)
    dragOriginListId.current = card?.list_id ?? null
  }

  function onDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) return

    const activeCardId = active.data.current?.cardId as number
    const overId = over.id as string

    const sourceList = findListByCardId(activeCardId)
    if (!sourceList) return

    let targetList: List | undefined
    if (overId.startsWith('list-')) {
      targetList = lists.find(l => `list-${l.id}` === overId)
    } else if (overId.startsWith('card-')) {
      const overCardId = parseInt(overId.replace('card-', ''))
      targetList = findListByCardId(overCardId)
    }

    if (!targetList || sourceList.id === targetList.id) return

    setLists(prev => {
      const card = prev.find(l => l.id === sourceList.id)?.cards.find(c => c.id === activeCardId)
      if (!card) return prev
      return prev.map(list => {
        if (list.id === sourceList.id) {
          return { ...list, cards: list.cards.filter(c => c.id !== activeCardId) }
        }
        if (list.id === targetList!.id) {
          return { ...list, cards: [...list.cards, { ...card, list_id: targetList!.id }] }
        }
        return list
      })
    })
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event
    const originListId = dragOriginListId.current
    dragOriginListId.current = null
    setActiveCard(null)
    if (!over) return

    const activeCardId = active.data.current?.cardId as number
    const overId = over.id as string

    setLists(prev => {
      // After onDragOver, the card is already in the destination list in state
      const destList = prev.find(l => l.cards.some(c => c.id === activeCardId))
      if (!destList) return prev

      const isCrossListMove = originListId !== null && originListId !== destList.id

      if (overId.startsWith('card-')) {
        // Dropped on another card — may need to reorder within destList
        const overCardId = parseInt(overId.replace('card-', ''))
        const oldIdx = destList.cards.findIndex(c => c.id === activeCardId)
        const newIdx = destList.cards.findIndex(c => c.id === overCardId)

        if (oldIdx !== -1 && newIdx !== -1 && oldIdx !== newIdx) {
          const newCards = arrayMove(destList.cards, oldIdx, newIdx)
          newCards.forEach((card, i) => {
            api.cards.move(card.id, { list_id: destList.id, position: i }).catch(() => {})
          })
          return prev.map(l => l.id === destList.id ? { ...l, cards: newCards } : l)
        }
      }

      // Dropped on list area, or no reorder needed.
      // If it was a cross-list move, persist the new list_id for all cards in destList.
      if (isCrossListMove) {
        destList.cards.forEach((card, i) => {
          api.cards.move(card.id, { list_id: destList.id, position: i }).catch(() => {})
        })
      }

      return prev
    })
  }

  const handleCardUpdate = useCallback((updatedCard: Card) => {
    setLists(prev => prev.map(list => ({
      ...list,
      cards: list.cards.map(c => c.id === updatedCard.id ? updatedCard : c),
    })))
    setSelectedCard(updatedCard)
  }, [])

  const handleCardDelete = useCallback((cardId: number) => {
    setLists(prev => prev.map(list => ({
      ...list,
      cards: list.cards.filter(c => c.id !== cardId),
    })))
    setSelectedCard(null)
  }, [])

  const handleCardCreate = useCallback((listId: number, card: Card) => {
    setLists(prev => prev.map(list =>
      list.id === listId ? { ...list, cards: [...list.cards, card] } : list
    ))
  }, [])

  const handleListDelete = useCallback(async (listId: number) => {
    const list = lists.find(l => l.id === listId)
    const cardCount = list?.cards.length ?? 0
    const msg = cardCount > 0
      ? `Delete "${list?.name}"? This will also delete ${cardCount} card${cardCount > 1 ? 's' : ''} inside it.`
      : `Delete column "${list?.name}"?`
    if (!confirm(msg)) return
    try {
      await api.lists.delete(listId)
      setLists(prev => prev.filter(l => l.id !== listId))
    } catch {
      alert('Failed to delete column')
    }
  }, [lists])

  async function handleAddColumn() {
    if (!newColumnName.trim() || addingCol) return
    setAddingCol(true)
    try {
      const list = await api.lists.create({ project_id: initialBoard.project.id, name: newColumnName.trim() })
      setLists(prev => [...prev, { ...list, cards: [] }])
      setNewColumnName('')
      setAddingColumn(false)
    } catch {
      // ignore
    } finally {
      setAddingCol(false)
    }
  }

  function openAddColumn() {
    setAddingColumn(true)
    setTimeout(() => newColInputRef.current?.focus(), 50)
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
      >
        <div className="flex gap-4 p-6 overflow-x-auto flex-1 items-start">
          {lists.map(list => (
            <KanbanColumn
              key={list.id}
              list={list}
              onCardClick={setSelectedCard}
              onCardCreate={handleCardCreate}
              onDelete={handleListDelete}
            />
          ))}

          {/* Add column */}
          {addingColumn ? (
            <div className="flex flex-col w-72 shrink-0 bg-white/[0.03] border border-white/[0.08] rounded-xl p-3">
              <input
                ref={newColInputRef}
                value={newColumnName}
                onChange={e => setNewColumnName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleAddColumn()
                  if (e.key === 'Escape') { setAddingColumn(false); setNewColumnName('') }
                }}
                placeholder="Column name..."
                className="bg-transparent text-sm text-zinc-200 placeholder-zinc-600 outline-none border-b border-white/[0.08] pb-2 mb-3"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAddColumn}
                  disabled={addingCol || !newColumnName.trim()}
                  className="text-xs bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition-colors font-medium"
                >
                  Add column
                </button>
                <button
                  onClick={() => { setAddingColumn(false); setNewColumnName('') }}
                  className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={openAddColumn}
              className="flex items-center gap-2 w-72 shrink-0 px-4 py-3 rounded-xl border border-dashed border-white/[0.10] text-zinc-600 hover:text-zinc-400 hover:border-white/[0.20] transition-colors text-sm"
            >
              <span className="text-lg leading-none">+</span>
              Add column
            </button>
          )}
        </div>
        <DragOverlay>
          {activeCard ? (
            <TaskCard card={activeCard} onClick={() => {}} isDragging />
          ) : null}
        </DragOverlay>
      </DndContext>

      {selectedCard && (
        <TaskDetailModal
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
          onUpdate={handleCardUpdate}
          onDelete={handleCardDelete}
        />
      )}
    </>
  )
}
