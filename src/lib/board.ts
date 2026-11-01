import type { Board, Card, Column, Priority, Tag } from './types'

export const PRIORITIES: readonly Priority[] = ['low', 'medium', 'high', 'urgent']

export const TAG_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

const CODE_PREFIX = 'PRJ-'

export function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // crypto.randomUUID is only available in secure contexts (https / localhost).
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function createCard(fields: Partial<Card> & Pick<Card, 'title'>): Card {
  return {
    id: createId(),
    code: '',
    location: '',
    description: '',
    priority: 'medium',
    dueDate: null,
    tagIds: [],
    assigneeIds: [],
    createdAt: new Date().toISOString(),
    ...fields,
  }
}

/** Next free "PRJ-###" code, one higher than the largest code on the board. */
export function nextCardCode(board: Board): string {
  let max = 100
  for (const column of board.columns) {
    for (const card of column.cards) {
      if (!card.code.startsWith(CODE_PREFIX)) continue
      const n = Number(card.code.slice(CODE_PREFIX.length))
      if (Number.isInteger(n) && n > max) max = n
    }
  }
  return `${CODE_PREFIX}${max + 1}`
}

export interface CardLocation {
  card: Card
  column: Column
  index: number
}

export function findCard(board: Board, cardId: string): CardLocation | null {
  for (const column of board.columns) {
    const index = column.cards.findIndex(c => c.id === cardId)
    if (index !== -1) return { card: column.cards[index], column, index }
  }
  return null
}

export type BoardAction =
  | { type: 'replace'; board: Board }
  | { type: 'renameBoard'; title: string }
  | { type: 'addColumn'; column: Column }
  | { type: 'renameColumn'; columnId: string; name: string }
  | { type: 'deleteColumn'; columnId: string }
  | { type: 'addCard'; columnId: string; card: Card }
  | { type: 'updateCard'; cardId: string; changes: Partial<Omit<Card, 'id'>> }
  | { type: 'deleteCard'; cardId: string }
  /** Move a card so it ends up at `toIndex` in the target column (same semantics as arrayMove). */
  | { type: 'moveCard'; cardId: string; toColumnId: string; toIndex: number }
  | { type: 'addTag'; tag: Tag }
  | { type: 'updateTag'; tagId: string; changes: Partial<Omit<Tag, 'id'>> }
  | { type: 'deleteTag'; tagId: string }

function mapCards(board: Board, fn: (card: Card) => Card): Board {
  return {
    ...board,
    columns: board.columns.map(column => ({ ...column, cards: column.cards.map(fn) })),
  }
}

function moveCard(board: Board, cardId: string, toColumnId: string, toIndex: number): Board {
  const from = findCard(board, cardId)
  if (!from || !board.columns.some(c => c.id === toColumnId)) return board

  const columns = board.columns.map(column =>
    column.id === from.column.id
      ? { ...column, cards: column.cards.filter(c => c.id !== cardId) }
      : column,
  )

  return {
    ...board,
    columns: columns.map(column => {
      if (column.id !== toColumnId) return column
      const cards = [...column.cards]
      const index = Math.max(0, Math.min(toIndex, cards.length))
      cards.splice(index, 0, from.card)
      return { ...column, cards }
    }),
  }
}

export function boardReducer(board: Board, action: BoardAction): Board {
  switch (action.type) {
    case 'replace':
      return action.board

    case 'renameBoard':
      return { ...board, title: action.title }

    case 'addColumn':
      return { ...board, columns: [...board.columns, action.column] }

    case 'renameColumn':
      return {
        ...board,
        columns: board.columns.map(c => (c.id === action.columnId ? { ...c, name: action.name } : c)),
      }

    case 'deleteColumn':
      return { ...board, columns: board.columns.filter(c => c.id !== action.columnId) }

    case 'addCard':
      return {
        ...board,
        columns: board.columns.map(c =>
          c.id === action.columnId ? { ...c, cards: [...c.cards, action.card] } : c,
        ),
      }

    case 'updateCard':
      return mapCards(board, card => (card.id === action.cardId ? { ...card, ...action.changes } : card))

    case 'deleteCard':
      return {
        ...board,
        columns: board.columns.map(c => ({ ...c, cards: c.cards.filter(card => card.id !== action.cardId) })),
      }

    case 'moveCard':
      return moveCard(board, action.cardId, action.toColumnId, action.toIndex)

    case 'addTag':
      return { ...board, tags: [...board.tags, action.tag] }

    case 'updateTag':
      return {
        ...board,
        tags: board.tags.map(t => (t.id === action.tagId ? { ...t, ...action.changes } : t)),
      }

    case 'deleteTag': {
      const withoutTag = mapCards(board, card =>
        card.tagIds.includes(action.tagId)
          ? { ...card, tagIds: card.tagIds.filter(id => id !== action.tagId) }
          : card,
      )
      return { ...withoutTag, tags: board.tags.filter(t => t.id !== action.tagId) }
    }
  }
}
