'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Project } from '@/lib/types'
import { api } from '@/lib/api'

const navLinks = [
  {
    href: '/',
    label: 'Dashboard',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="1" width="6" height="6" rx="1" fill="currentColor" opacity="0.8" />
        <rect x="9" y="1" width="6" height="6" rx="1" fill="currentColor" opacity="0.8" />
        <rect x="1" y="9" width="6" height="6" rx="1" fill="currentColor" opacity="0.8" />
        <rect x="9" y="9" width="6" height="6" rx="1" fill="currentColor" opacity="0.8" />
      </svg>
    ),
  },
  {
    href: '/projects',
    label: 'Boards',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M2 3a1 1 0 011-1h4a1 1 0 011 1v1H2V3zM2 5h12v8a1 1 0 01-1 1H3a1 1 0 01-1-1V5z" fill="currentColor" opacity="0.8" />
      </svg>
    ),
  },
  {
    href: '/activity',
    label: 'Activity',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M1 8h2l2-5 3 9 2-6 1 2h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: '/team',
    label: 'Team',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.4" />
        <path d="M1 13c0-2.5 2-4 5-4s5 1.5 5 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="12" cy="5" r="1.8" stroke="currentColor" strokeWidth="1.2" opacity="0.6" />
        <path d="M12 9.5c1.5.2 3 1 3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
      </svg>
    ),
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const [projects, setProjects] = useState<Project[]>([])

  useEffect(() => {
    api.projects.list().catch(() => []).then(data => {
      if (Array.isArray(data)) setProjects(data)
    })
  }, [])

  return (
    <aside className="w-60 shrink-0 flex flex-col bg-[#111111] border-r border-white/[0.06] h-full">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="1" width="5" height="5" rx="0.8" fill="white" />
              <rect x="8" y="1" width="5" height="5" rx="0.8" fill="white" opacity="0.6" />
              <rect x="1" y="8" width="5" height="5" rx="0.8" fill="white" opacity="0.6" />
              <rect x="8" y="8" width="5" height="5" rx="0.8" fill="white" opacity="0.3" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-white tracking-tight">hc ProjectBoard</span>
        </div>
      </div>

      {/* Main nav */}
      <nav className="px-3 pt-4 pb-2 space-y-0.5">
        {navLinks.map(link => {
          const isActive = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href)
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? 'bg-white/[0.08] text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <span className={isActive ? 'text-white' : 'text-zinc-500'}>{link.icon}</span>
              {link.label}
            </Link>
          )
        })}
      </nav>

      {/* Boards section */}
      <div className="px-3 pt-4 flex-1 overflow-y-auto">
        <div className="px-2.5 mb-2">
          <span className="text-[11px] font-medium text-zinc-600 uppercase tracking-wider">Boards</span>
        </div>
        <div className="space-y-0.5">
          {projects.length === 0 && (
            <p className="text-xs text-zinc-600 px-2.5 py-1">No boards yet</p>
          )}
          {projects.map(project => {
            const isActive = pathname === `/projects/${project.id}`
            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm transition-colors truncate ${
                  isActive
                    ? 'bg-white/[0.08] text-white'
                    : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04]'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 opacity-70" />
                <span className="truncate">{project.name}</span>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Bottom branding */}
      <div className="px-4 py-4 border-t border-white/[0.06]">
        <p className="text-[11px] text-zinc-700">hc ProjectBoard v1.0</p>
      </div>
    </aside>
  )
}
