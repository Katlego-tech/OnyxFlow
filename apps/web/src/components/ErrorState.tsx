import { RotateCwIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/api'

/**
 * A failed request and an empty list must never look the same — one means "add
 * something", the other means "we don't know what's there". This says what went
 * wrong and offers the one action that can fix it.
 */
export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message =
    error instanceof ApiError ? error.message : 'Something failed on the way to the API.'

  return (
    <div className="border-destructive/40 bg-card rounded-lg border px-6 py-10 text-center">
      <p className="font-medium">That didn't load</p>
      <p className="text-muted-foreground mx-auto mt-1.5 max-w-md text-sm">{message}</p>
      {onRetry && (
        <Button variant="outline" className="mt-6" onClick={onRetry}>
          <RotateCwIcon />
          Try again
        </Button>
      )}
    </div>
  )
}
