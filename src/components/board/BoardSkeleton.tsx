import { BoardHeader } from './BoardHeader'

const COLUMN_CARD_COUNTS = [3, 2, 3, 1]

/** Static placeholder shown while the client-only board loads its data from localStorage. */
export function BoardSkeleton() {
  return (
    <div className="flex h-full flex-col" aria-busy="true" aria-label="Loading board">
      <BoardHeader title={<div className="h-5 w-40 animate-pulse rounded bg-white/[0.06]" />} />
      <div className="flex flex-1 gap-4 overflow-hidden p-6">
        {COLUMN_CARD_COUNTS.map((count, i) => (
          <div key={i} className="flex w-72 shrink-0 flex-col gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
            <div className="mb-2 h-4 w-24 animate-pulse rounded bg-white/[0.06]" />
            {Array.from({ length: count }, (_, j) => (
              <div key={j} className="h-24 animate-pulse rounded-lg bg-white/[0.04]" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
