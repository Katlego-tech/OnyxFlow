import { Link } from 'react-router'

import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <div className="py-16 text-center">
      <p className="text-muted-foreground font-mono text-sm">404</p>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight">Nothing here</h2>
      <p className="text-muted-foreground mx-auto mt-2 max-w-sm text-sm">
        That address doesn't match a screen in OnyxFlow.
      </p>
      <Button variant="outline" className="mt-8" render={<Link to="/" />}>
        Back to your board
      </Button>
    </div>
  )
}
