'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { Project } from '@/lib/types'
import { api } from '@/lib/api'

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  completed: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  archived: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20',
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.projects.list()
      .then(data => { setProjects(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const activeCount = projects.filter(p => p.status === 'active').length
  const completedCount = projects.filter(p => p.status === 'completed').length

  const stats = [
    {
      label: 'Total Projects',
      value: loading ? '—' : projects.length,
      icon: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <rect x="1" y="1" width="7" height="7" rx="1.5" fill="currentColor" />
          <rect x="10" y="1" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.5" />
          <rect x="1" y="10" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.5" />
          <rect x="10" y="10" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.3" />
        </svg>
      ),
      color: 'text-blue-400',
    },
    {
      label: 'Active Projects',
      value: loading ? '—' : activeCount,
      icon: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <circle cx="9" cy="9" r="8" stroke="currentColor" strokeWidth="1.5" />
          <path d="M6 9l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      color: 'text-emerald-400',
    },
    {
      label: 'Completed',
      value: loading ? '—' : completedCount,
      icon: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M3 9l4 4L15 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      color: 'text-purple-400',
    },
    {
      label: 'Team Members',
      value: '—',
      icon: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <circle cx="7" cy="6" r="3" stroke="currentColor" strokeWidth="1.5" />
          <path d="M1 15c0-3.314 2.686-6 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="13" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M17 15c0-2.761-1.791-5-4-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ),
      color: 'text-orange-400',
    },
  ]

  return (
    <div className="p-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white mb-1">Dashboard</h1>
        <p className="text-zinc-500 text-sm">Welcome back, Leo</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {stats.map(stat => (
          <div
            key={stat.label}
            className="bg-[#111111] border border-white/[0.08] rounded-xl p-4"
          >
            <div className={`${stat.color} mb-3`}>{stat.icon}</div>
            <div className="text-2xl font-semibold text-white mb-0.5">{stat.value}</div>
            <div className="text-xs text-zinc-500">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Recent Projects */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-medium text-white">Recent Projects</h2>
          <Link href="/projects" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
            View all
          </Link>
        </div>

        {loading ? (
          <div className="text-zinc-600 text-sm">Loading projects...</div>
        ) : projects.length === 0 ? (
          <div className="bg-[#111111] border border-white/[0.08] rounded-xl p-8 text-center">
            <p className="text-zinc-500 text-sm">No projects yet. Create one to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {projects.slice(0, 6).map(project => (
              <div
                key={project.id}
                className="bg-[#111111] border border-white/[0.08] rounded-xl p-4 hover:border-white/[0.15] transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-sm font-medium text-white truncate flex-1 mr-2">{project.name}</h3>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border shrink-0 ${STATUS_COLORS[project.status] || STATUS_COLORS.active}`}>
                    {project.status}
                  </span>
                </div>
                {project.description && (
                  <p className="text-xs text-zinc-500 mb-3 line-clamp-2">{project.description}</p>
                )}
                <Link
                  href={`/projects/${project.id}`}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  View Board →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
