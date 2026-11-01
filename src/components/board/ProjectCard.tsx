'use client'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { describeDueDate, type DueStatus } from '@/lib/dates'
import type { Card, Member, Priority, Tag } from '@/lib/types'
import { cn } from '@/lib/utils'

export const PRIORITY_STYLES: Record<Priority, { dot: string; text: string; chip: string }> = {
  urgent: { dot: 'bg-red-500', text: 'text-red-400', chip: 'bg-red-500/15 text-red-400 border-red-500/30' },
  high: { dot: 'bg-orange-400', text: 'text-orange-400', chip: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
  medium: { dot: 'bg-blue-500', text: 'text-blue-400', chip: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  low: { dot: 'bg-zinc-500', text: 'text-zinc-400', chip: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30' },
}

const DUE_STYLES: Record<DueStatus, string> = {
  overdue: 'text-red-400',
  soon: 'text-amber-400',
  later: 'text-zinc-500',
}

export function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function Avatar({ member, className }: { member: Member; className?: string }) {
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full font-semibold text-white',
        className,
      )}
      style={{ backgroundColor: member.color }}
      title={member.name}
    >
      {member.initials}
    </span>
  )
}

interface CardViewProps {
  card: Card
  tags: Tag[]
  assignees: Member[]
  today: string
  isOverlay?: boolean
}

/** Pure presentation of a project card, shared by the board and the drag overlay. */
export function CardView({ card, tags, assignees, today, isOverlay }: CardViewProps) {
  const priority = PRIORITY_STYLES[card.priority]
  const due = card.dueDate ? describeDueDate(card.dueDate, today) : null

  return (
    <div
      className={cn(
        'rounded-lg border border-white/[0.08] bg-[#1a1a1a] p-3 transition-colors select-none',
        isOverlay
          ? 'cursor-grabbing border-white/[0.18] shadow-2xl shadow-black/50 rotate-2'
          : 'cursor-grab hover:border-white/[0.18] hover:bg-[#1f1f1f]',
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        {card.code ? (
          <span className="rounded bg-white/[0.05] px-2 py-0.5 font-mono text-[11px] font-medium text-zinc-400">
            {card.code}
          </span>
        ) : (
          <span />
        )}
        <span className="flex items-center gap-1.5">
          <span className={cn('text-[10px] font-medium', priority.text)}>{capitalize(card.priority)}</span>
          <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', priority.dot)} />
        </span>
      </div>

      <p className="text-sm leading-snug font-medium text-zinc-100">{card.title}</p>

      {card.description && (
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-500">{card.description}</p>
      )}

      {tags.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1">
          {tags.slice(0, 3).map(tag => (
            <span
              key={tag.id}
              className="rounded-sm px-1.5 py-0.5 text-[10px] font-medium"
              style={{ backgroundColor: `${tag.color}1f`, color: tag.color }}
            >
              {tag.name}
            </span>
          ))}
          {tags.length > 3 && <span className="text-[10px] text-zinc-600">+{tags.length - 3}</span>}
        </div>
      )}

      {(due || assignees.length > 0) && (
        <div className="mt-3 flex items-center justify-between border-t border-white/[0.05] pt-2">
          {due ? (
            <span className={cn('flex items-center gap-1 text-[11px] font-medium', DUE_STYLES[due.status])}>
              <svg className="h-3 w-3 shrink-0" viewBox="0 0 12 12" fill="none" aria-hidden>
                <rect x="1" y="2" width="10" height="9" rx="1.5" stroke="currentColor" strokeWidth="1" />
                <path d="M4 1v2M8 1v2M1 5h10" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
              </svg>
              {due.label}
            </span>
          ) : (
            <span />
          )}

          {assignees.length > 0 && (
            <div className="flex -space-x-1.5">
              {assignees.slice(0, 3).map(member => (
                <Avatar key={member.id} member={member} className="h-6 w-6 border-2 border-[#1a1a1a] text-[9px]" />
              ))}
              {assignees.length > 3 && (
                <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#1a1a1a] bg-zinc-700 text-[9px] text-zinc-300">
                  +{assignees.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface SortableCardProps extends Omit<CardViewProps, 'isOverlay'> {
  onOpen: (cardId: string) => void
}

export function SortableCard({ onOpen, ...viewProps }: SortableCardProps) {
  const { card } = viewProps
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: 'card' },
  })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      {...attributes}
      {...listeners}
      onClick={() => onOpen(card.id)}
      onKeyDown={event => {
        listeners?.onKeyDown?.(event)
        // Space picks the card up (keyboard drag); Enter opens the details.
        if (event.key === 'Enter' && !isDragging) onOpen(card.id)
      }}
      className={cn(
        'touch-manipulation rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-blue-500/70',
        isDragging && 'opacity-40',
      )}
    >
      <CardView {...viewProps} />
    </div>
  )
}
