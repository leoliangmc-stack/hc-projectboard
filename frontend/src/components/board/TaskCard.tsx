'use client'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Card } from '@/lib/types'

const PRIORITY_DOT: Record<string, string> = {
  urgent: 'bg-red-500',
  high:   'bg-orange-400',
  medium: 'bg-blue-500',
  low:    'bg-zinc-500',
}

const PRIORITY_LABEL: Record<string, string> = {
  urgent: 'text-red-400',
  high:   'text-orange-400',
  medium: 'text-blue-400',
  low:    'text-zinc-500',
}

interface TaskCardProps {
  card: Card
  onClick: (card: Card) => void
  isDragging?: boolean
}

export function TaskCard({ card, onClick, isDragging }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: `card-${card.id}`,
    data: { cardId: card.id },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.4 : 1,
  }

  const isOverdue = card.due_date && new Date(card.due_date) < new Date()

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick(card)}
      className={`
        bg-[#1a1a1a] border border-white/[0.08] rounded-lg p-3 cursor-pointer
        hover:border-white/[0.18] hover:bg-[#1f1f1f] transition-all select-none
        ${isDragging ? 'shadow-2xl rotate-1 scale-105' : ''}
      `}
    >
      {/* Top row: Job number + priority dot */}
      <div className="flex items-center justify-between mb-2">
        {card.job_number ? (
          <span className="text-[11px] font-mono font-medium text-zinc-400 bg-white/[0.05] px-2 py-0.5 rounded">
            {card.job_number}
          </span>
        ) : (
          <span className="text-[11px] text-zinc-700 italic">No job no.</span>
        )}
        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] font-medium ${PRIORITY_LABEL[card.priority]}`}>
            {card.priority.charAt(0).toUpperCase() + card.priority.slice(1)}
          </span>
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${PRIORITY_DOT[card.priority]}`} />
        </div>
      </div>

      {/* Project title */}
      <p className="text-sm font-medium text-zinc-100 leading-snug mb-1.5">
        {card.title}
      </p>

      {/* Address */}
      {card.project_address && (
        <div className="flex items-start gap-1.5 mb-2">
          <svg className="w-3 h-3 text-zinc-600 shrink-0 mt-0.5" viewBox="0 0 12 12" fill="none">
            <path d="M6 1a3.5 3.5 0 0 1 3.5 3.5C9.5 7.5 6 11 6 11S2.5 7.5 2.5 4.5A3.5 3.5 0 0 1 6 1z" stroke="currentColor" strokeWidth="1" fill="none"/>
            <circle cx="6" cy="4.5" r="1" fill="currentColor"/>
          </svg>
          <span className="text-[11px] text-zinc-500 leading-tight line-clamp-1">
            {card.project_address}
          </span>
        </div>
      )}

      {/* Tags */}
      {card.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {card.tags.slice(0, 2).map(tag => (
            <span
              key={tag.id}
              className="text-[10px] px-1.5 py-0.5 rounded-sm font-medium"
              style={{ backgroundColor: `${tag.color}18`, color: tag.color }}
            >
              {tag.name}
            </span>
          ))}
          {card.tags.length > 2 && (
            <span className="text-[10px] text-zinc-600">+{card.tags.length - 2}</span>
          )}
        </div>
      )}

      {/* Footer: delivery date + engineers */}
      <div className="flex items-center justify-between mt-1 pt-2 border-t border-white/[0.05]">
        {card.due_date ? (
          <div className="flex items-center gap-1">
            <svg className="w-3 h-3 text-zinc-600 shrink-0" viewBox="0 0 12 12" fill="none">
              <rect x="1" y="2" width="10" height="9" rx="1.5" stroke="currentColor" strokeWidth="1"/>
              <path d="M4 1v2M8 1v2M1 5h10" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
            </svg>
            <span className={`text-[11px] font-medium ${isOverdue ? 'text-red-400' : 'text-zinc-500'}`}>
              {new Date(card.due_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
            </span>
          </div>
        ) : <span />}

        {card.assignees.length > 0 && (
          <div className="flex -space-x-1.5">
            {card.assignees.slice(0, 3).map(user => (
              <div
                key={user.id}
                className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-[10px] font-bold text-white border-2 border-[#1a1a1a]"
                title={user.name}
              >
                {user.avatar}
              </div>
            ))}
            {card.assignees.length > 3 && (
              <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center text-[10px] text-zinc-400 border-2 border-[#1a1a1a]">
                +{card.assignees.length - 3}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

