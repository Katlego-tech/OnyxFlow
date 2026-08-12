import { useEffect, useState } from 'react'

import { cn } from '@/lib/utils'

/**
 * A row's quantity drawn against the largest value in the same view — session
 * length, squad size, player rating (docs/design/web.md §2.1).
 *
 * It draws real data or it doesn't render: there is no decorative variant, and
 * it isn't used where there is nothing to compare against. The fill is
 * `--chart-1`, the darkest step of the base ramp, so it reads as data rather
 * than as an accent.
 */
export interface LoadBandProps {
  /** This row's quantity. */
  value: number
  /** The largest value in the same list. Bands only compare within one view. */
  max: number
  /** What the number means, shown in tabular figures beside the band. */
  label: string
  /** Row position, used to stagger the growth so a list resolves top-down. */
  index?: number
  className?: string
}

export function LoadBand({ value, max, label, index = 0, className }: LoadBandProps) {
  const [grown, setGrown] = useState(false)

  useEffect(() => {
    const frame = requestAnimationFrame(() => setGrown(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  const ratio = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0
  // A non-zero quantity always shows a sliver, or the smallest row reads as absent.
  const width = grown ? `${ratio === 0 ? 0 : Math.max(ratio * 100, 2)}%` : '0%'

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div
        className="bg-muted relative h-1.5 min-w-16 flex-1 overflow-hidden rounded-full"
        role="presentation"
      >
        <div
          className="bg-chart-1 absolute inset-y-0 left-0 rounded-full transition-[width] duration-300 ease-out"
          style={{ width, transitionDelay: `${Math.min(index, 12) * 24}ms` }}
        />
      </div>
      <span className="tabular text-muted-foreground min-w-14 text-right font-mono text-xs">
        {label}
      </span>
    </div>
  )
}
