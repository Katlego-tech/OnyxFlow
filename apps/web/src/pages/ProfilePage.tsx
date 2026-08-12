import { useState } from 'react'
import { toast } from 'sonner'

import { ErrorState } from '@/components/ErrorState'
import { PageHeader, StatTile } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useProfile, useUpdateProfile } from '@/api/queries'
import { ApiError } from '@/lib/api'
import { formatHeight, formatRole } from '@/lib/format'

export function ProfilePage() {
  const profile = useProfile()
  const update = useUpdateProfile()

  const [height, setHeight] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (profile.isPending) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Loading profile">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full max-w-md" />
      </div>
    )
  }

  if (profile.isError) {
    return <ErrorState error={profile.error} onRetry={() => void profile.refetch()} />
  }

  const data = profile.data

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    const trimmed = height.trim()
    const parsed = trimmed === '' ? null : Number(trimmed)
    if (parsed !== null && (!Number.isFinite(parsed) || parsed <= 0)) {
      setError('Height must be a number above zero, or blank to clear it.')
      return
    }

    try {
      await update.mutateAsync(parsed)
      toast.success('Profile updated')
      setHeight('')
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'The profile was not updated.')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={data.user.username}
        description="Yours alone. Your rating is set by a coach and isn't returned on this endpoint."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Role" value={formatRole(data.user.role)} />
        <StatTile label="Club" value={data.team_name ?? 'Not listed'} />
        <StatTile label="Height" value={formatHeight(data.height)} />
      </div>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Update your height</CardTitle>
          <CardDescription>Leave it blank and save to clear the value.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <Label htmlFor="height" className="sr-only">
              Height
            </Label>
            <div className="flex gap-2">
              <Input
                id="height"
                type="number"
                inputMode="decimal"
                step="any"
                min={0}
                placeholder={formatHeight(data.height)}
                value={height}
                onChange={(event) => setHeight(event.target.value)}
                className="tabular w-full font-mono"
              />
              <Button type="submit" disabled={update.isPending}>
                {update.isPending ? 'Saving…' : 'Save'}
              </Button>
            </div>
            {error && (
              <p role="alert" className="text-destructive mt-2 text-sm">
                {error}
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
