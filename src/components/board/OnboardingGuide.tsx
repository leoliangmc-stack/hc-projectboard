'use client'
import { useEffect, useRef, useState } from 'react'
import type { Board, Member, Tag } from '@/lib/types'
import { cn } from '@/lib/utils'
import { CardView } from './ProjectCard'

type StepKind = 'drag' | 'open' | 'add'

const STEPS: { kind: StepKind; title: string; body: string }[] = [
  {
    kind: 'drag',
    title: 'Drag cards between columns',
    body: 'Each column is a project stage. Press and hold a card, then drag it into another column to move the project forward. On a touch screen, hold for a moment before you drag.',
  },
  {
    kind: 'open',
    title: 'Open a card for details',
    body: 'Click a card to edit its location, priority, due date, team and tags. You can also move it to another stage from there.',
  },
  {
    kind: 'add',
    title: 'Add projects and stages',
    body: 'Use + Add card to create a project, or + Add column at the end of the board for a new stage. Changes are saved in this browser, and Reset demo brings back the sample projects.',
  },
]

/** The hand is drawn on a 40×48 grid and rendered 25% larger. */
const HAND_SCALE = 1.25
/** Fingertip position inside the rendered hand graphic. */
const TIP = { x: 13 * HAND_SCALE, y: 1 * HAND_SCALE }

interface Box {
  left: number
  top: number
  width: number
  height: number
}

interface Geometry {
  viewportWidth: number
  card: Box | null
  targetColumn: Box | null
  /** Top-left corner where the dragged card lands in the target column. */
  landing: { left: number; top: number } | null
  addCard: Box | null
}

const toBox = (el: Element | null): Box | null => {
  if (!el) return null
  const { left, top, width, height } = el.getBoundingClientRect()
  return { left, top, width, height }
}

const handAt = (x: number, y: number, scale = 1) => `translate(${x - TIP.x}px, ${y - TIP.y}px) scale(${scale})`

interface OnboardingGuideProps {
  board: Board
  tagsById: Map<string, Tag>
  membersById: Map<string, Member>
  today: string
  onClose: () => void
}

export function OnboardingGuide({ board, tagsById, membersById, today, onClose }: OnboardingGuideProps) {
  const [step, setStep] = useState(0)
  const [geometry, setGeometry] = useState<Geometry | null>(null)
  const handRef = useRef<HTMLDivElement>(null)
  const ghostRef = useRef<HTMLDivElement>(null)
  const rippleRef = useRef<HTMLDivElement>(null)

  // Demo card: the first card in a column that has another column after it.
  const sourceIndex = board.columns.findIndex((c, i) => c.cards.length > 0 && i < board.columns.length - 1)
  const sourceColumn = sourceIndex === -1 ? board.columns[0] : board.columns[sourceIndex]
  const targetColumn = sourceIndex === -1 ? undefined : board.columns[sourceIndex + 1]
  const demoCard = sourceIndex === -1 ? undefined : sourceColumn.cards[0]

  const { kind, title, body } = STEPS[step]
  const isLast = step === STEPS.length - 1

  // Measure the real board so the hand points at actual cards and buttons.
  useEffect(() => {
    let frame = 0
    const measure = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const target = targetColumn ? document.querySelector(`[data-column-id="${targetColumn.id}"]`) : null
        const targetBox = toBox(target)
        const firstTargetCard = toBox(target?.querySelector('[data-card-id]') ?? null)
        setGeometry({
          viewportWidth: window.innerWidth,
          card: demoCard ? toBox(document.querySelector(`[data-card-id="${demoCard.id}"]`)) : null,
          targetColumn: targetBox,
          landing: firstTargetCard ?? (targetBox ? { left: targetBox.left + 8, top: targetBox.top + 44 } : null),
          addCard: sourceColumn
            ? toBox(document.querySelector(`[data-column-id="${sourceColumn.id}"] [data-guide="add-card"]`))
            : null,
        })
      })
    }
    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [demoCard, sourceColumn, targetColumn])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  // Hand animation for the current step (Web Animations API, looping).
  useEffect(() => {
    const hand = handRef.current
    const ghost = ghostRef.current
    const ripple = rippleRef.current
    if (!hand || !ghost || !ripple || !geometry) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const animations: Animation[] = []
    const run = (el: HTMLElement, frames: Keyframe[], duration: number) => {
      if (reduceMotion) {
        // Show a still frame instead of looping motion.
        const still = frames[Math.floor(frames.length / 2)]
        animations.push(el.animate([still, still], { duration: 1, fill: 'forwards' }))
      } else {
        animations.push(el.animate(frames, { duration, iterations: Infinity }))
      }
    }

    const { card, landing, addCard, viewportWidth } = geometry

    if (kind === 'drag' && card && landing) {
      const grab = { x: Math.min(card.width * 0.4, 110), y: 30 }
      const from = { x: card.left + grab.x, y: card.top + grab.y }
      const to = { x: Math.min(landing.left + grab.x, viewportWidth - 28), y: landing.top + grab.y }
      const ghostFrom = `translate(${card.left}px, ${card.top}px)`
      const ghostTo = `translate(${to.x - grab.x}px, ${to.y - grab.y}px)`

      run(
        hand,
        [
          { offset: 0, opacity: 0, transform: handAt(from.x + 30, from.y + 40) },
          { offset: 0.12, opacity: 1, transform: handAt(from.x, from.y) },
          { offset: 0.22, opacity: 1, transform: handAt(from.x, from.y, 0.85), easing: 'ease-in-out' },
          { offset: 0.66, opacity: 1, transform: handAt(to.x, to.y, 0.85) },
          { offset: 0.74, opacity: 1, transform: handAt(to.x, to.y) },
          { offset: 0.9, opacity: 0, transform: handAt(to.x + 20, to.y + 30) },
          { offset: 1, opacity: 0, transform: handAt(to.x + 20, to.y + 30) },
        ],
        3800,
      )
      run(
        ghost,
        [
          { offset: 0, opacity: 0, transform: ghostFrom },
          { offset: 0.2, opacity: 0, transform: ghostFrom },
          { offset: 0.24, opacity: 1, transform: ghostFrom, easing: 'ease-in-out' },
          { offset: 0.66, opacity: 1, transform: ghostTo },
          { offset: 0.74, opacity: 1, transform: ghostTo },
          { offset: 0.86, opacity: 0, transform: ghostTo },
          { offset: 1, opacity: 0, transform: ghostTo },
        ],
        3800,
      )
    } else if ((kind === 'open' && card) || (kind === 'add' && addCard)) {
      const box = (kind === 'open' ? card : addCard)!
      const point = {
        x: kind === 'open' ? box.left + Math.min(box.width * 0.5, 140) : box.left + 36,
        y: box.top + Math.min(box.height * 0.5, 44),
      }
      const ripplePos = (scale: number) => `translate(${point.x - 18}px, ${point.y - 18}px) scale(${scale})`

      run(
        hand,
        [
          { offset: 0, opacity: 0, transform: handAt(point.x + 40, point.y + 60) },
          { offset: 0.3, opacity: 1, transform: handAt(point.x, point.y) },
          { offset: 0.42, opacity: 1, transform: handAt(point.x, point.y, 0.82) },
          { offset: 0.52, opacity: 1, transform: handAt(point.x, point.y) },
          { offset: 0.85, opacity: 1, transform: handAt(point.x, point.y) },
          { offset: 1, opacity: 0, transform: handAt(point.x + 20, point.y + 30) },
        ],
        2400,
      )
      run(
        ripple,
        [
          { offset: 0, opacity: 0, transform: ripplePos(0.3) },
          { offset: 0.42, opacity: 0, transform: ripplePos(0.3) },
          { offset: 0.48, opacity: 0.9, transform: ripplePos(0.6) },
          { offset: 0.8, opacity: 0, transform: ripplePos(1.8) },
          { offset: 1, opacity: 0, transform: ripplePos(1.8) },
        ],
        2400,
      )
    }

    return () => animations.forEach(a => a.cancel())
  }, [kind, geometry])

  const highlights: { box: Box; dashed?: boolean }[] = []
  if (geometry) {
    if (kind === 'drag') {
      if (geometry.card) highlights.push({ box: geometry.card })
      if (geometry.targetColumn) highlights.push({ box: geometry.targetColumn, dashed: true })
    } else if (kind === 'open' && geometry.card) {
      highlights.push({ box: geometry.card })
    } else if (kind === 'add' && geometry.addCard) {
      highlights.push({ box: geometry.addCard })
    }
  }

  return (
    <div className="fixed inset-0 z-[60]">
      {/* Blocks interaction with the board while the guide is open. */}
      <div className="absolute inset-0 bg-black/30" />

      {highlights.map(({ box, dashed }, i) => (
        <div
          key={`${kind}-${i}`}
          aria-hidden
          className={cn(
            'pointer-events-none absolute rounded-xl transition-all duration-300',
            dashed
              ? 'border-2 border-dashed border-blue-400/70 bg-blue-500/[0.06]'
              : 'shadow-[0_0_0_2px_rgba(96,165,250,0.85),0_0_24px_rgba(59,130,246,0.35)]',
          )}
          style={{ left: box.left - 4, top: box.top - 4, width: box.width + 8, height: box.height + 8 }}
        />
      ))}

      {/* Copy of the demo card that the hand "drags"; the real board is never changed. */}
      <div
        ref={ghostRef}
        aria-hidden
        className="pointer-events-none absolute top-0 left-0 opacity-0"
        style={{ width: geometry?.card?.width }}
      >
        {demoCard && (
          <CardView
            card={demoCard}
            tags={demoCard.tagIds.flatMap(id => tagsById.get(id) ?? [])}
            assignees={demoCard.assigneeIds.flatMap(id => membersById.get(id) ?? [])}
            today={today}
            isOverlay
          />
        )}
      </div>

      <div
        ref={rippleRef}
        aria-hidden
        className="pointer-events-none absolute top-0 left-0 h-9 w-9 rounded-full border-2 border-white/80 opacity-0"
      />

      <div
        ref={handRef}
        aria-hidden
        className="pointer-events-none absolute top-0 left-0 opacity-0"
        style={{ transformOrigin: `${TIP.x}px ${TIP.y}px` }}
      >
        <HandIcon />
      </div>

      <div className="absolute inset-x-0 bottom-0 flex justify-center p-4 sm:bottom-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="guide-title"
          aria-describedby="guide-body"
          className="w-full max-w-md rounded-xl border border-white/10 bg-[#141414]/95 p-5 shadow-2xl shadow-black/60 backdrop-blur"
        >
          <p className="text-[11px] font-medium tracking-wide text-blue-400 uppercase">
            Quick guide · {step + 1} of {STEPS.length}
          </p>
          <h2 id="guide-title" className="mt-1 text-base font-semibold text-white">
            {title}
          </h2>
          <p id="guide-body" className="mt-1.5 text-sm leading-relaxed text-zinc-400">
            {body}
          </p>

          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="flex gap-1.5" aria-hidden>
              {STEPS.map((_, i) => (
                <span
                  key={i}
                  className={cn('h-1.5 rounded-full transition-all', i === step ? 'w-5 bg-blue-500' : 'w-1.5 bg-white/20')}
                />
              ))}
            </div>
            <div className="flex items-center gap-1">
              {!isLast && (
                <button
                  onClick={onClose}
                  className="tap-target rounded-lg px-2.5 py-1.5 text-xs text-zinc-500 transition-colors hover:text-zinc-300"
                >
                  Skip
                </button>
              )}
              {step > 0 && (
                <button
                  onClick={() => setStep(s => s - 1)}
                  className="tap-target rounded-lg px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:bg-white/[0.06]"
                >
                  Back
                </button>
              )}
              <button
                autoFocus
                onClick={() => (isLast ? onClose() : setStep(s => s + 1))}
                className="tap-target rounded-lg bg-blue-600 px-3.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-500"
              >
                {isLast ? 'Got it' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Pointing hand. The shapes are drawn twice: a dark stroked layer, then a white fill
 * on top, which leaves only the outer outline visible.
 */
function HandIcon() {
  const shapes = (
    <>
      <rect x="9" y="1" width="8" height="26" rx="4" />
      <rect x="16.5" y="14" width="7.5" height="18" rx="3.75" />
      <rect x="23.5" y="16" width="7" height="16" rx="3.5" />
      <rect x="30" y="19.5" width="6.5" height="13" rx="3.25" />
      <rect x="9" y="22" width="27.5" height="20" rx="8" />
      <rect x="3" y="24" width="8" height="16" rx="4" transform="rotate(-35 7 34)" />
    </>
  )
  return (
    <svg
      width={40 * HAND_SCALE}
      height={48 * HAND_SCALE}
      viewBox="0 0 40 48"
      className="opacity-85 drop-shadow-[0_4px_10px_rgba(0,0,0,0.55)]"
    >
      <g fill="#0f172a" stroke="#0f172a" strokeWidth="3" strokeLinejoin="round">
        {shapes}
      </g>
      <g fill="#ffffff">{shapes}</g>
      <g stroke="#94a3b8" strokeWidth="1" strokeLinecap="round">
        <path d="M17 22v7M24 23v7M30.5 25v6" />
      </g>
    </svg>
  )
}
