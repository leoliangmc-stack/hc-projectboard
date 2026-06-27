'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { api } from '@/lib/api'
import type { BoardData } from '@/lib/types'
import { KanbanBoard } from '@/components/board/KanbanBoard'

export default function ProjectBoardPage() {
  const params = useParams()
  const projectId = Number(params.id)
  const [board, setBoard] = useState<BoardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.projects.get(projectId).then(data => {
      setBoard(data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [projectId])

  if (loading) return <div className="flex h-full items-center justify-center text-zinc-500">Loading...</div>
  if (!board) return <div className="flex h-full items-center justify-center text-zinc-500">Project not found</div>

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-white/[0.08]">
        <h1 className="text-xl font-semibold text-white">{board.project.name}</h1>
        {board.project.description && (
          <p className="text-sm text-zinc-500 mt-0.5">{board.project.description}</p>
        )}
      </div>
      <KanbanBoard initialBoard={board} />
    </div>
  )
}
