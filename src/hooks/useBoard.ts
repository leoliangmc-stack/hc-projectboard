'use client'
import { useEffect, useReducer } from 'react'
import { boardReducer } from '@/lib/board'
import { createSampleBoard } from '@/lib/sampleData'
import { loadBoard, saveBoard } from '@/lib/storage'

/**
 * Board state backed by localStorage. Must only run in the browser
 * (the board is rendered with `ssr: false`), since the initial state is read from storage.
 */
export function useBoard() {
  const [board, dispatch] = useReducer(boardReducer, undefined, () => loadBoard() ?? createSampleBoard())

  useEffect(() => {
    saveBoard(board)
  }, [board])

  return [board, dispatch] as const
}
