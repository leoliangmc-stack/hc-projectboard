import { describe, expect, it } from 'vitest'
import { boardReducer, createCard, findCard, nextCardCode } from '@/lib/board'
import { createSampleBoard } from '@/lib/sampleData'
import type { Board } from '@/lib/types'

function makeBoard(): Board {
  const card = (id: string, code = '') => ({ ...createCard({ title: id.toUpperCase(), code }), id })
  return {
    version: 1,
    title: 'Test',
    tags: [{ id: 't1', name: 'Design', color: '#000' }],
    members: [],
    columns: [
      { id: 'todo', name: 'To Do', cards: [card('a', 'PRJ-101'), card('b'), card('c', 'PRJ-120')] },
      { id: 'doing', name: 'Doing', cards: [card('d')] },
      { id: 'done', name: 'Done', cards: [] },
    ],
  }
}

const ids = (board: Board, columnId: string) =>
  board.columns.find(c => c.id === columnId)!.cards.map(c => c.id)

describe('moveCard', () => {
  it('reorders within a column with arrayMove semantics', () => {
    const board = makeBoard()
    expect(ids(boardReducer(board, { type: 'moveCard', cardId: 'a', toColumnId: 'todo', toIndex: 2 }), 'todo')).toEqual(['b', 'c', 'a'])
    expect(ids(boardReducer(board, { type: 'moveCard', cardId: 'c', toColumnId: 'todo', toIndex: 0 }), 'todo')).toEqual(['c', 'a', 'b'])
  })

  it('moves a card into another column at the given index', () => {
    const next = boardReducer(makeBoard(), { type: 'moveCard', cardId: 'b', toColumnId: 'doing', toIndex: 0 })
    expect(ids(next, 'todo')).toEqual(['a', 'c'])
    expect(ids(next, 'doing')).toEqual(['b', 'd'])
  })

  it('moves into an empty column and clamps out-of-range indexes', () => {
    const next = boardReducer(makeBoard(), { type: 'moveCard', cardId: 'a', toColumnId: 'done', toIndex: 99 })
    expect(ids(next, 'done')).toEqual(['a'])
    const negative = boardReducer(makeBoard(), { type: 'moveCard', cardId: 'd', toColumnId: 'todo', toIndex: -5 })
    expect(ids(negative, 'todo')).toEqual(['d', 'a', 'b', 'c'])
  })

  it('ignores unknown cards or columns', () => {
    const board = makeBoard()
    expect(boardReducer(board, { type: 'moveCard', cardId: 'zzz', toColumnId: 'done', toIndex: 0 })).toBe(board)
    expect(boardReducer(board, { type: 'moveCard', cardId: 'a', toColumnId: 'zzz', toIndex: 0 })).toBe(board)
  })

  it('does not mutate the previous state', () => {
    const board = makeBoard()
    const snapshot = structuredClone(board)
    boardReducer(board, { type: 'moveCard', cardId: 'a', toColumnId: 'doing', toIndex: 1 })
    expect(board).toEqual(snapshot)
  })
})

describe('cards and columns', () => {
  it('adds, updates and deletes cards', () => {
    let board = makeBoard()
    const card = createCard({ title: 'New' })
    board = boardReducer(board, { type: 'addCard', columnId: 'done', card })
    expect(ids(board, 'done')).toEqual([card.id])

    board = boardReducer(board, { type: 'updateCard', cardId: card.id, changes: { priority: 'urgent', title: 'Renamed' } })
    expect(findCard(board, card.id)?.card).toMatchObject({ priority: 'urgent', title: 'Renamed' })

    board = boardReducer(board, { type: 'deleteCard', cardId: card.id })
    expect(findCard(board, card.id)).toBeNull()
  })

  it('renames and deletes columns', () => {
    let board = boardReducer(makeBoard(), { type: 'renameColumn', columnId: 'doing', name: 'In Progress' })
    expect(board.columns[1].name).toBe('In Progress')
    board = boardReducer(board, { type: 'deleteColumn', columnId: 'todo' })
    expect(board.columns.map(c => c.id)).toEqual(['doing', 'done'])
    expect(findCard(board, 'a')).toBeNull()
  })

  it('removes a deleted tag from every card', () => {
    let board = boardReducer(makeBoard(), { type: 'updateCard', cardId: 'a', changes: { tagIds: ['t1'] } })
    board = boardReducer(board, { type: 'deleteTag', tagId: 't1' })
    expect(board.tags).toEqual([])
    expect(findCard(board, 'a')?.card.tagIds).toEqual([])
  })
})

describe('nextCardCode', () => {
  it('continues after the highest PRJ code on the board', () => {
    expect(nextCardCode(makeBoard())).toBe('PRJ-121')
  })

  it('starts at PRJ-101 on an empty board', () => {
    expect(nextCardCode({ ...makeBoard(), columns: [] })).toBe('PRJ-101')
  })
})

describe('createSampleBoard', () => {
  it('only references tags and members that exist', () => {
    const board = createSampleBoard(new Date(2026, 0, 15))
    const tagIds = new Set(board.tags.map(t => t.id))
    const memberIds = new Set(board.members.map(m => m.id))
    const cards = board.columns.flatMap(c => c.cards)
    expect(cards.length).toBeGreaterThan(0)
    for (const card of cards) {
      expect(card.tagIds.every(id => tagIds.has(id))).toBe(true)
      expect(card.assigneeIds.every(id => memberIds.has(id))).toBe(true)
      if (card.dueDate) expect(card.dueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })
})
