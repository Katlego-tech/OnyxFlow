import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ArrowLeftIcon, Trash2Icon, UsersIcon } from 'lucide-react'
import { toast } from 'sonner'

import { ErrorState } from '@/components/ErrorState'
import { LoadBand } from '@/components/LoadBand'
import { PageHeader, StatTile } from '@/components/PageHeader'
import { PlayerPicker } from '@/components/PlayerPicker'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { useCoaches, useDeleteTeam, useTeam, useUpdateTeam } from '@/api/queries'
import { useAuth } from '@/auth/useAuth'
import { ApiError } from '@/lib/api'
import { formatDate, formatRating, formatRole } from '@/lib/format'

export function TeamDetailPage() {
  const { teamId } = useParams()
  const id = Number(teamId)
  const team = useTeam(id)
  const { user } = useAuth()
  const navigate = useNavigate()

  const updateTeam = useUpdateTeam(id)
  const remove = useDeleteTeam()

  const [name, setName] = useState('')
  const [renameError, setRenameError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [editingSquad, setEditingSquad] = useState(false)

  if (team.isPending) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Loading team">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
    )
  }

  if (team.isError) {
    return (
      <div className="space-y-6">
        <BackLink />
        <ErrorState error={team.error} onRetry={() => void team.refetch()} />
      </div>
    )
  }

  const data = team.data
  // The API lets only `admin_owner` change anything here. Hiding these controls
  // from everyone else saves a 403 nobody can act on — the server still decides.
  const isOwner = user?.id === data.admin_owner.id
  const bestRating = data.players.reduce((max, player) => Math.max(max, player.rating ?? 0), 0)

  async function handleRename(event: React.FormEvent) {
    event.preventDefault()
    setRenameError(null)
    try {
      await updateTeam.mutateAsync({ name: name.trim() })
      toast.success('Team renamed')
      setName('')
    } catch (caught) {
      setRenameError(caught instanceof ApiError ? caught.message : 'The team was not renamed.')
    }
  }

  async function handleCoachChange(coachId: number | null) {
    try {
      await updateTeam.mutateAsync({ current_coach: coachId })
      toast.success(coachId === null ? 'Coach cleared' : 'Coach assigned')
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : 'The coach was not changed.')
    }
  }

  async function handleDelete() {
    try {
      await remove.mutateAsync(id)
      toast.success('Team deleted')
      navigate('/teams', { replace: true })
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : 'The team was not deleted.')
    } finally {
      setConfirming(false)
    }
  }

  return (
    <div className="space-y-6">
      <BackLink />

      <PageHeader
        title={data.name}
        description={`Team #${data.id}`}
        action={
          isOwner ? (
            <Button variant="destructive" onClick={() => setConfirming(true)}>
              <Trash2Icon />
              Delete team
            </Button>
          ) : undefined
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile
          label="Owner"
          value={data.admin_owner.username}
          hint={formatRole(data.admin_owner.role)}
        />
        <StatTile
          label="Current coach"
          value={data.current_coach?.username ?? 'Unassigned'}
          hint={data.current_coach ? formatRole(data.current_coach.role) : 'Nobody assigned yet'}
        />
        <StatTile label="Created" value={formatDate(data.created_at)} />
      </div>

      {isOwner && (
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Coach</CardTitle>
            <CardDescription>
              Ownership doesn't move with the coach — reassigning here leaves the team yours.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CoachSelect
              value={data.current_coach?.id ?? null}
              disabled={updateTeam.isPending}
              onChange={handleCoachChange}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            Squad <Badge variant="secondary">{data.players.length}</Badge>
          </CardTitle>
          <CardDescription>Ratings are set by a coach.</CardDescription>
          {isOwner && (
            <div className="mt-2">
              <Button variant="outline" size="sm" onClick={() => setEditingSquad(true)}>
                <UsersIcon />
                Manage squad
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {data.players.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">
              No players on this sheet yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Player</TableHead>
                    <TableHead>Club</TableHead>
                    <TableHead className="w-56">Rating</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.players.map((player, index) => (
                    <TableRow key={player.id}>
                      <TableCell className="font-medium">{player.user.username}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {player.team_name ?? '—'}
                      </TableCell>
                      <TableCell>
                        <LoadBand
                          value={player.rating ?? 0}
                          max={bestRating}
                          label={formatRating(player.rating)}
                          index={index}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {isOwner && (
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Rename this team</CardTitle>
            <CardDescription>Only the owner can change the name.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRename}>
              <Label htmlFor="rename" className="sr-only">
                New team name
              </Label>
              <div className="flex gap-2">
                <Input
                  id="rename"
                  required
                  maxLength={120}
                  placeholder={data.name}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full"
                />
                <Button type="submit" variant="outline" disabled={updateTeam.isPending}>
                  {updateTeam.isPending ? 'Saving…' : 'Save'}
                </Button>
              </div>
              {renameError && (
                <p role="alert" className="text-destructive mt-2 text-sm">
                  {renameError}
                </p>
              )}
            </form>
          </CardContent>
        </Card>
      )}

      <SquadDialog
        key={`squad-${data.players.map((player) => player.id).join('-')}`}
        open={editingSquad}
        teamName={data.name}
        initial={data.players.map((player) => player.id)}
        pending={updateTeam.isPending}
        onOpenChange={setEditingSquad}
        onSave={async (ids) => {
          await updateTeam.mutateAsync({ players: ids })
          toast.success('Squad updated')
          setEditingSquad(false)
        }}
      />

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {data.name}?</DialogTitle>
            <DialogDescription>
              The team record and its squad list go with it. Training sessions scheduled for it stay,
              without a team.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6">
            <DialogClose render={<Button variant="outline" type="button" />}>Keep it</DialogClose>
            <Button variant="destructive" onClick={handleDelete} disabled={remove.isPending}>
              {remove.isPending ? 'Deleting…' : 'Delete team'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/** Backed by `GET /api/coaches/`; `Unassigned` is a real value the API accepts. */
function CoachSelect({
  value,
  disabled,
  onChange,
}: {
  value: number | null
  disabled: boolean
  onChange: (id: number | null) => void
}) {
  const coaches = useCoaches()

  if (coaches.isPending) return <Skeleton className="h-8 w-full" />
  if (coaches.isError) {
    return <ErrorState error={coaches.error} onRetry={() => void coaches.refetch()} />
  }

  const items = [
    { label: 'Unassigned', value: null as number | null },
    ...coaches.data.map((coach) => ({ label: coach.username, value: coach.id })),
  ]

  return (
    <>
      <Label htmlFor="coach" className="sr-only">
        Current coach
      </Label>
      <Select
        items={items}
        value={value}
        disabled={disabled}
        onValueChange={(next) => onChange(next as number | null)}
      >
        <SelectTrigger id="coach" className="w-full">
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
      {coaches.data.length === 0 && (
        <p className="text-muted-foreground mt-2 text-xs">
          No coach accounts exist yet. Register one to assign it here.
        </p>
      )}
    </>
  )
}

function SquadDialog({
  open,
  teamName,
  initial,
  pending,
  onOpenChange,
  onSave,
}: {
  open: boolean
  teamName: string
  initial: number[]
  pending: boolean
  onOpenChange: (open: boolean) => void
  onSave: (ids: number[]) => Promise<void>
}) {
  const [selected, setSelected] = useState<number[]>(initial)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setError(null)
    try {
      await onSave(selected)
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'The squad was not saved.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{teamName} squad</DialogTitle>
          <DialogDescription>
            Tick everyone on this team. Unticking removes them from the squad.
          </DialogDescription>
        </DialogHeader>

        <PlayerPicker selected={selected} onChange={setSelected} className="mt-2" />

        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}

        <DialogFooter className="mt-4">
          <DialogClose render={<Button variant="outline" type="button" />}>Cancel</DialogClose>
          <Button onClick={handleSave} disabled={pending}>
            {pending ? 'Saving…' : 'Save squad'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function BackLink() {
  return (
    <Link
      to="/teams"
      className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
    >
      <ArrowLeftIcon className="size-4" />
      All teams
    </Link>
  )
}
