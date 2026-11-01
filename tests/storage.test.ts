import { describe, expect, it } from 'vitest'
import { createSampleBoard } from '@/lib/sampleData'
import { parseStoredBoard } from '@/lib/storage'

describe('parseStoredBoard', () => {
  it('round-trips a saved board', () => {
    const board = createSampleBoard()
    expect(parseStoredBoard(JSON.stringify(board))).toEqual(board)
  })

  it('rejects missing, corrupt or incompatible data', () => {
    expect(parseStoredBoard(null)).toBeNull()
    expect(parseStoredBoard('not json')).toBeNull()
    expect(parseStoredBoard('null')).toBeNull()
    expect(parseStoredBoard(JSON.stringify({ ...createSampleBoard(), version: 2 }))).toBeNull()
    expect(parseStoredBoard(JSON.stringify({ version: 1, title: 'x', columns: [{}], tags: [], members: [] }))).toBeNull()
  })
})
