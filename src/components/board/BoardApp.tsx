'use client'
import dynamic from 'next/dynamic'
import { BoardSkeleton } from './BoardSkeleton'

// The board reads its state from localStorage, so it is rendered on the client only.
const KanbanBoard = dynamic(() => import('./KanbanBoard').then(m => m.KanbanBoard), {
  ssr: false,
  loading: () => <BoardSkeleton />,
})

export function BoardApp() {
  return <KanbanBoard />
}
