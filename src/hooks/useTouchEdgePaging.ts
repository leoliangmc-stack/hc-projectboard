'use client'
import { useEffect, useMemo, useRef, type RefObject } from 'react'

/** Width, in px, of the strip along the board's left and right edges where a held finger pages the board. */
const EDGE_ZONE = 48
/** How long the finger rests in the edge strip before the first page turn, in ms. */
const FIRST_PAGE_DELAY = 450
/** Delay between further page turns while the finger stays in the strip, in ms. */
const REPEAT_PAGE_DELAY = 800

/**
 * Column-by-column scrolling for touch drags.
 *
 * dnd-kit's auto-scroll speeds up the closer the pointer gets to the edge. On a phone, where one
 * column fills the screen, it races past the neighbouring column before the card can be dropped
 * there. During a touch drag this hook pages the board instead: once the finger has rested near
 * the left or right edge for a moment, the board moves one column, then another while it stays.
 *
 * `start` takes the element the touch began on. Touch events keep going to that element for the
 * whole gesture, but once React moves the card to another column it is no longer in the document
 * and its events stop bubbling to `window`, so the listener goes on the element itself.
 */
export function useTouchEdgePaging(boardRef: RefObject<HTMLElement | null>) {
  const stopRef = useRef<(() => void) | null>(null)

  const paging = useMemo(() => {
    function stop() {
      stopRef.current?.()
      stopRef.current = null
    }

    function start(touchTarget: EventTarget) {
      stop()
      let direction = 0
      let timer: number | undefined

      function turnPage() {
        const board = boardRef.current
        if (board) board.scrollBy({ left: direction * columnStep(board), behavior: 'smooth' })
        timer = window.setTimeout(turnPage, REPEAT_PAGE_DELAY)
      }

      function onTouchMove(event: Event) {
        const board = boardRef.current
        const touch = (event as TouchEvent).touches[0]
        if (!board || !touch) return
        const { left, right } = board.getBoundingClientRect()
        const next = touch.clientX > right - EDGE_ZONE ? 1 : touch.clientX < left + EDGE_ZONE ? -1 : 0
        if (next === direction) return
        direction = next
        window.clearTimeout(timer)
        if (direction !== 0) timer = window.setTimeout(turnPage, FIRST_PAGE_DELAY)
      }

      touchTarget.addEventListener('touchmove', onTouchMove, { passive: true })
      stopRef.current = () => {
        touchTarget.removeEventListener('touchmove', onTouchMove)
        window.clearTimeout(timer)
      }
    }

    return { start, stop, isActive: () => stopRef.current !== null }
  }, [boardRef])

  useEffect(() => paging.stop, [paging])

  return paging
}

/** Horizontal distance from the start of one column to the start of the next. */
function columnStep(board: HTMLElement) {
  const column = board.firstElementChild
  const gap = parseFloat(getComputedStyle(board).columnGap) || 0
  return (column ? column.getBoundingClientRect().width : board.clientWidth) + gap
}
