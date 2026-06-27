'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import type { Project } from '@/lib/types'
import { api } from '@/lib/api'

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  completed: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  archived: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20',
}

export default function BoardsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    api.projects.list()
      .then(data => { setProjects(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function handleDelete(id: number, name: string) {
    if (!confirm(`Delete board "${name}"? All columns and cards inside will be permanently deleted.`)) return
    try {
      await api.projects.delete(id)
      setProjects(prev => prev.filter(p => p.id !== id))
    } catch {
      alert('Failed to delete board')
    }
  }

  async function handleCreate() {
    if (!newName.trim() || creating) return
    setCreating(true)
    try {
      const project = await api.projects.create({ name: newName.trim(), description: newDesc.trim() || undefined })
      setProjects(prev => [project, ...prev])
      setShowNew(false)
      setNewName('')
      setNewDesc('')
    } catch {
      alert('Failed to create board — is the backend running?')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white mb-1">Boards</h1>
          <p className="text-zinc-500 text-sm">All your boards in one place</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <span className="text-lg leading-none">+</span>
          New Board
        </button>
      </div>

      {/* New Board Dialog */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="bg-[#141414] border-white/[0.08] text-white max-w-md p-0 gap-0">
          <div className="px-6 pt-6 pb-4 border-b border-white/[0.06]">
            <h2 className="text-lg font-semibold">New Board</h2>
          </div>
          <div className="px-6 py-5 space-y-4">
            <div>
              <label className="text-xs text-zinc-500 mb-1.5 block font-medium uppercase tracking-wide">Board Name</label>
              <input
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                placeholder="e.g. Site Inspection Q3"
                className="w-full bg-[#1f1f1f] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-white/20 transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1.5 block font-medium uppercase tracking-wide">Description <span className="normal-case text-zinc-700">(optional)</span></label>
              <textarea
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                rows={2}
                placeholder="What is this board about?"
                className="w-full bg-[#1f1f1f] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 outline-none resize-none focus:border-white/20 transition-colors"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-white/[0.06] bg-[#111111]/50">
            <button onClick={() => setShowNew(false)} className="text-sm text-zinc-400 hover:text-zinc-200 px-4 py-1.5 rounded-lg transition-colors">
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!newName.trim() || creating}
              className="text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded-lg transition-colors font-medium"
            >
              {creating ? 'Creating…' : 'Create Board'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {loading ? (
        <div className="text-zinc-600 text-sm">Loading boards...</div>
      ) : projects.length === 0 ? (
        <div className="bg-[#111111] border border-white/[0.08] rounded-xl p-12 text-center">
          <p className="text-zinc-500 text-sm">No boards found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {projects.map(project => (
            <div
              key={project.id}
              className="bg-[#111111] border border-white/[0.08] rounded-xl p-5 hover:border-white/[0.15] transition-all flex flex-col"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-base font-medium text-white flex-1 mr-2">{project.name}</h3>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border shrink-0 ${STATUS_COLORS[project.status] || STATUS_COLORS.active}`}>
                  {project.status}
                </span>
              </div>

              {project.description ? (
                <p className="text-sm text-zinc-500 mb-4 flex-1 line-clamp-2">{project.description}</p>
              ) : (
                <p className="text-sm text-zinc-700 mb-4 flex-1 italic">No description</p>
              )}

              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-600">
                  {new Date(project.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDelete(project.id, project.name)}
                    className="text-xs text-zinc-700 hover:text-red-400 transition-colors px-2 py-1.5 rounded-md hover:bg-red-500/10"
                    title="Delete board"
                  >
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                      <path d="M2 3.5h9M5 3.5V2.5a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v1M5.5 6v4M7.5 6v4M3 3.5l.5 7a.5.5 0 00.5.5h5a.5.5 0 00.5-.5l.5-7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <Link
                    href={`/projects/${project.id}`}
                    className="text-xs bg-white/[0.06] hover:bg-white/[0.10] text-zinc-300 hover:text-white px-3 py-1.5 rounded-md transition-all"
                  >
                    Open Board
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
