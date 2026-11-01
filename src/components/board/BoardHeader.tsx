import type { ReactNode } from 'react'

interface BoardHeaderProps {
  title?: ReactNode
  actions?: ReactNode
}

export function BoardHeader({ title, actions }: BoardHeaderProps) {
  return (
    <header className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-white/[0.06] bg-[#0d0d0f] px-6 py-4 pointer-coarse:gap-y-1 pointer-coarse:py-2">
      <div className="flex items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <rect x="1" y="1" width="5" height="5" rx="0.8" fill="white" />
            <rect x="8" y="1" width="5" height="5" rx="0.8" fill="white" opacity="0.6" />
            <rect x="1" y="8" width="5" height="5" rx="0.8" fill="white" opacity="0.6" />
            <rect x="8" y="8" width="5" height="5" rx="0.8" fill="white" opacity="0.3" />
          </svg>
        </div>
        <span className="text-sm font-semibold tracking-tight text-white">ProjectBoard</span>
      </div>

      <span className="hidden h-5 w-px bg-white/[0.08] sm:block" aria-hidden />

      {/* On small screens the title drops onto its own row below the logo and actions. */}
      <div className="order-last w-full min-w-0 sm:order-none sm:w-auto sm:flex-1">{title}</div>

      {actions && <div className="ml-auto flex items-center gap-3 sm:ml-0">{actions}</div>}
    </header>
  )
}
