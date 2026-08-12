import { useMemo, useState } from 'react'
import { PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'

import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { LoadBand } from '@/components/LoadBand'
import { PageHeader, StatTile } from '@/components/PageHeader'
import { PlayerPicker } from '@/components/PlayerPicker'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  useCreateTraining,
  useDeleteTraining,
  useTeams,
  useTrainings,
  useUpdateTraining,
  type TrainingDraft,
} from '@/api/queries'
import { ApiError } from '@/lib/api'
import { formatDate, formatDuration } from '@/lib/format'
import type { TrainingSession } from '@/lib/types'

export function TrainingsPage() {
  const trainings = useTrainings()
  const teams = useTeams()
  const createTraining = useCreateTraining()
  const updateTraining = useUpdateTraining()
  const deleteTraining = useDeleteTraining()

  const [editing, setEditing] = useState<TrainingSession | null>(null)
  const [creating, setCreating] = useState(false)
  const [confirming, setConfirming] = useState<TrainingSession | null>(null)

  const rows = trainings.data ?? []
  const longest = rows.reduce((max, session) => Math.max(max, session.duration_minutes), 0)
  const totalMinutes = rows.reduce((sum, session) => sum + session.duration_minutes, 0)
  const averageMinutes = rows.length ? Math.round(totalMinutes / rows.length) : 0

  const teamNames = useMemo(
    () => new Map((teams.data ?? []).map((team) => [team.id, team.name])),
    [teams.data],
  )

  async function handleDelete(session: TrainingSession) {
    try {
      await deleteTraining.mutateAsync(session.id)
      toast.success('Session deleted')
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : 'The session was not deleted.')
    } finally {
      setConfirming(null)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Training"
        description="Every session carries a focus and a length. Both are how load gets read later."
        action={
          <Button onClick={() => setCreating(true)}>
            <PlusIcon />
            Schedule session
          </Button>
        }
      />

      {trainings.isSuccess && rows.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatTile label="Sessions" value={String(rows.length)} />
          <StatTile label="Total load" value={formatDuration(totalMinutes)} />
          <StatTile
            label="Average session"
            value={formatDuration(averageMinutes)}
            hint={`Longest: ${formatDuration(longest)}`}
          />
        </div>
      )}

      {trainings.isPending && (
        <div className="space-y-3" aria-busy="true" aria-label="Loading sessions">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      )}

      {trainings.isError && (
        <ErrorState error={trainings.error} onRetry={() => void trainings.refetch()} />
      )}

      {trainings.isSuccess && rows.length === 0 && (
        <EmptyState
          title="Nothing scheduled"
          body="Schedule the first session and it lands here with its load drawn against every session after it."
          action={
            <Button onClick={() => setCreating(true)}>
              <PlusIcon />
              Schedule session
            </Button>
          }
        />
      )}

      {trainings.isSuccess && rows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Scheduled sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Focus</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead>Players</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-56">Length</TableHead>
                    <TableHead className="w-24 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((session, index) => (
                    <TableRow key={session.id}>
                      <TableCell className="font-medium">{session.focus}</TableCell>
                      <TableCell>
                        {session.team === null ? (
                          <Badge variant="outline">No team</Badge>
                        ) : (
                          (teamNames.get(session.team) ?? `Team ${session.team}`)
                        )}
                      </TableCell>
                      <TableCell className="tabular text-muted-foreground font-mono text-xs">
                        {session.players.length}
                      </TableCell>
                      <TableCell className="tabular text-muted-foreground font-mono text-xs">
                        {formatDate(session.created_at)}
                      </TableCell>
                      <TableCell>
                        <LoadBand
                          value={session.duration_minutes}
                          max={longest}
                          label={formatDuration(session.duration_minutes)}
                          index={index}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Edit ${session.focus}`}
                            onClick={() => setEditing(session)}
                          >
                            <PencilIcon />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Delete ${session.focus}`}
                            onClick={() => setConfirming(session)}
                          >
                            <Trash2Icon />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <SessionDialog
        key={editing ? `edit-${editing.id}` : 'create'}
        open={creating || editing !== null}
        session={editing}
        pending={createTraining.isPending || updateTraining.isPending}
        onOpenChange={(next) => {
          if (!next) {
            setCreating(false)
            setEditing(null)
          }
        }}
        onSubmit={async (draft) => {
          if (editing) {
            await updateTraining.mutateAsync({ id: editing.id, ...draft })
            toast.success('Session updated')
          } else {
            await createTraining.mutateAsync(draft)
            toast.success('Session scheduled')
          }
          setCreating(false)
          setEditing(null)
        }}
      />

      <Dialog open={confirming !== null} onOpenChange={(next) => !next && setConfirming(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this session?</DialogTitle>
            <DialogDescription>
              {confirming ? `"${confirming.focus}" and its player assignments are removed.` : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6">
            <DialogClose render={<Button variant="outline" type="button" />}>Keep it</DialogClose>
            <Button
              variant="destructive"
              disabled={deleteTraining.isPending}
              onClick={() => confirming && handleDelete(confirming)}
            >
              {deleteTraining.isPending ? 'Deleting…' : 'Delete session'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SessionDialog({
  open,
  session,
  pending,
  onOpenChange,
  onSubmit,
}: {
  open: boolean
  session: TrainingSession | null
  pending: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (draft: TrainingDraft) => Promise<void>
}) {
  const teams = useTeams()
  const [focus, setFocus] = useState(session?.focus ?? '')
  const [duration, setDuration] = useState(String(session?.duration_minutes ?? 60))
  const [team, setTeam] = useState<number | null>(session?.team ?? null)
  const [players, setPlayers] = useState<number[]>(
    // PlayerProfile pks, which is exactly what `PlayerPublic.id` carries.
    () => session?.players.map((player) => player.id) ?? [],
  )
  const [error, setError] = useState<string | null>(null)

  // `No team` is a real value the API accepts, not a placeholder option.
  const items = useMemo(
    () => [
      { label: 'No team', value: null as number | null },
      ...(teams.data ?? []).map((option) => ({ label: option.name, value: option.id })),
    ],
    [teams.data],
  )

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    const minutes = Number(duration)
    if (!Number.isInteger(minutes) || minutes <= 0) {
      setError('Length must be a whole number of minutes, above zero.')
      return
    }

    try {
      await onSubmit({ focus: focus.trim(), duration_minutes: minutes, team, players })
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'The session was not saved.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{session ? 'Edit session' : 'Schedule a session'}</DialogTitle>
            <DialogDescription>
              A session needs a focus and a length. Assign it to a team you own, or leave it
              unattached.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="focus">Focus</Label>
              <Input
                id="focus"
                required
                maxLength={255}
                placeholder="Pressing shape"
                value={focus}
                onChange={(event) => setFocus(event.target.value)}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Length in minutes</Label>
              <Input
                id="duration"
                type="number"
                inputMode="numeric"
                min={1}
                required
                value={duration}
                onChange={(event) => setDuration(event.target.value)}
                className="tabular w-full font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="team">Team</Label>
              <Select
                items={items}
                value={team}
                onValueChange={(next) => setTeam(next as number | null)}
              >
                <SelectTrigger id="team" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {items.map((item) => (
                    <SelectItem key={String(item.value)} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Players</Label>
              <PlayerPicker selected={players} onChange={setPlayers} />
            </div>
          </div>

          {error && (
            <p role="alert" className="text-destructive mt-3 text-sm">
              {error}
            </p>
          )}

          <DialogFooter className="mt-6">
            <DialogClose render={<Button variant="outline" type="button" />}>Cancel</DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? 'Saving…' : session ? 'Save changes' : 'Schedule session'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
