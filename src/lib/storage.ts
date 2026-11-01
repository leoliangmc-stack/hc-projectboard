import type { Board } from './types'

export const STORAGE_KEY = 'projectboard:board'
export const STORAGE_VERSION = 2

/**
 * Parse a stored board, returning null for missing, corrupt or outdated data.
 * Boards saved by an older schema version are discarded so the current sample data loads instead.
 */
export function parseStoredBoard(raw: string | null): Board | null {
  if (!raw) return null
  try {
    const value = JSON.parse(raw) as Partial<Board> | null
    if (
      !value ||
      value.version !== STORAGE_VERSION ||
      typeof value.title !== 'string' ||
      !Array.isArray(value.columns) ||
      !Array.isArray(value.tags) ||
      !Array.isArray(value.members) ||
      !value.columns.every(column => column && Array.isArray(column.cards))
    ) {
      return null
    }
    return value as Board
  } catch {
    return null
  }
}

export function loadBoard(): Board | null {
  try {
    return parseStoredBoard(window.localStorage.getItem(STORAGE_KEY))
  } catch {
    return null
  }
}

export function saveBoard(board: Board): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(board))
  } catch {
    // Storage can be unavailable (private mode, quota exceeded) — the board still works in memory.
  }
}

const GUIDE_KEY = 'projectboard:guide-seen'

/** Whether the first-visit guide has been shown (or skipped) in this browser. */
export function hasSeenGuide(): boolean {
  try {
    return window.localStorage.getItem(GUIDE_KEY) === '1'
  } catch {
    return false
  }
}

export function markGuideSeen(): void {
  try {
    window.localStorage.setItem(GUIDE_KEY, '1')
  } catch {
    // Without storage the guide simply shows again next visit.
  }
}
