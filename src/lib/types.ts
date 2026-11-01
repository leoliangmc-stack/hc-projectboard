export type Priority = 'low' | 'medium' | 'high' | 'urgent'

export interface Tag {
  id: string
  name: string
  color: string
}

export interface Member {
  id: string
  name: string
  initials: string
  color: string
}

export interface Card {
  id: string
  /** Short project reference shown on the card, e.g. "PRJ-104". */
  code: string
  title: string
  description: string
  priority: Priority
  /** Local calendar date in YYYY-MM-DD format. */
  dueDate: string | null
  tagIds: string[]
  assigneeIds: string[]
  createdAt: string
}

export interface Column {
  id: string
  name: string
  cards: Card[]
}

export interface Board {
  version: 1
  title: string
  columns: Column[]
  tags: Tag[]
  members: Member[]
}
