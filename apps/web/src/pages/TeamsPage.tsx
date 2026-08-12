import { useState } from 'react'
import { useNavigate } from 'react-router'
import { PlusIcon } from 'lucide-react'
import { toast } from 'sonner'

import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { LoadBand } from '@/components/LoadBand'
import { PageHeader, StatTile } from '@/components/PageHeader'
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
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useCreateTeam, useTeams } from '@/api/queries'
import { ApiError } from '@/lib/api'
import { formatDate } from '@/lib/format'

export function TeamsPage() {
  const teams = useTeams()
  const createTeam = useCreateTeam()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const rows = teams.data ?? []
  const largestSquad = rows.reduce((max, team) => Math.max(max, team.players.length), 0)
  const totalPlayers = rows.reduce((sum, team) => sum + team.players.length, 0)
  const coached = rows.filter((team) => team.current_coach !== null).length

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      const created = await createTeam.mutateAsync(name.trim())
      toast.success(`Created ${created.name}`)
      setName('')
      setOpen(false)
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'The team was not created.')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Teams"
        description="Ownership stays with the admin who created the team, so the record survives a change of coach."
        action={
          <Button onClick={() => setOpen(true)}>
            <PlusIcon />
            New team
          </Button>
        }
      />

      {teams.isSuccess && rows.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatTile label="Teams" value={String(rows.length)} />
          <StatTile
            label="Players on a sheet"
            value={String(totalPlayers)}
            hint={`Largest squad: ${largestSquad}`}
          />
          <StatTile
            label="With a coach assigned"
            value={`${coached} of ${rows.length}`}
            hint={coached === rows.length ? 'All teams covered' : 'Assign one from a team page'}
          />
        </div>
      )}

      {teams.isPending && (
        <div className="space-y-3" aria-busy="true" aria-label="Loading teams">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      )}

      {teams.isError && <ErrorState error={teams.error} onRetry={() => void teams.refetch()} />}

      {teams.isSuccess && rows.length === 0 && (
        <EmptyState
          title="No teams yet"
          body="Create the first team and it becomes yours to own. Coaches and squads attach to it afterwards."
          action={
            <Button onClick={() => setOpen(true)}>
              <PlusIcon />
              New team
            </Button>
          }
        />
      )}

      {teams.isSuccess && rows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>All teams</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Team</TableHead>
                    <TableHead>Coach</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-56">Squad</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((team, index) => (
                    <TableRow
                      key={team.id}
                      tabIndex={0}
                      role="link"
                      aria-label={`Open ${team.name}`}
                      className="cursor-pointer"
                      onClick={() => navigate(`/teams/${team.id}`)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          navigate(`/teams/${team.id}`)
                        }
                      }}
                    >
                      <TableCell className="font-medium">{team.name}</TableCell>
                      <TableCell>
                        {team.current_coach ? (
                          team.current_coach.username
                        ) : (
                          <Badge variant="outline">Unassigned</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {team.admin_owner.username}
                      </TableCell>
                      <TableCell className="tabular text-muted-foreground font-mono text-xs">
                        {formatDate(team.created_at)}
                      </TableCell>
                      <TableCell>
                        <LoadBand
                          value={team.players.length}
                          max={largestSquad}
                          label={`${team.players.length}`}
                          index={index}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle>New team</DialogTitle>
              <DialogDescription>
                You become the owner. The coach and squad are assigned separately.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 space-y-2">
              <Label htmlFor="team-name">Team name</Label>
              <Input
                id="team-name"
                required
                maxLength={120}
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full"
              />
            </div>

            {error && (
              <p role="alert" className="text-destructive mt-3 text-sm">
                {error}
              </p>
            )}

            <DialogFooter className="mt-6">
              <DialogClose render={<Button variant="outline" type="button" />}>Cancel</DialogClose>
              <Button type="submit" disabled={createTeam.isPending}>
                {createTeam.isPending ? 'Creating…' : 'Create team'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
