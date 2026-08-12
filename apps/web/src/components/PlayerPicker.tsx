import { useMemo, useState } from 'react'

import { ErrorState } from '@/components/ErrorState'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { usePlayers } from '@/api/queries'
import { formatRating } from '@/lib/format'

/**
 * Choose player profiles for a squad or a session.
 *
 * The values it emits are **PlayerProfile pks** (`PlayerPublic.id`), which is
 * what `Team.players` and `TrainingSession.players` are written with — not
 * `user.id`. The two are different numbers for the same person, and swapping
 * them assigns somebody else without erroring.
 *
 * Backed by `GET /api/players/`, which is staff-only, so this must never be
 * rendered on a player-facing screen.
 */
export function PlayerPicker({
  selected,
  onChange,
  className,
}: {
  selected: number[]
  onChange: (ids: number[]) => void
  className?: string
}) {
  const players = usePlayers()
  const [filter, setFilter] = useState('')

  const rows = useMemo(() => {
    const all = players.data ?? []
    const needle = filter.trim().toLowerCase()
    if (!needle) return all
    return all.filter(
      (player) =>
        player.user.username.toLowerCase().includes(needle) ||
        (player.team_name ?? '').toLowerCase().includes(needle),
    )
  }, [players.data, filter])

  if (players.isPending) {
    return (
      <div className={className} aria-busy="true" aria-label="Loading players">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="mt-2 h-40 w-full" />
      </div>
    )
  }

  if (players.isError) {
    return <ErrorState error={players.error} onRetry={() => void players.refetch()} />
  }

  function toggle(id: number, checked: boolean) {
    onChange(checked ? [...selected, id] : selected.filter((current) => current !== id))
  }

  return (
    <div className={className}>
      <Input
        type="search"
        placeholder="Filter players"
        value={filter}
        onChange={(event) => setFilter(event.target.value)}
        aria-label="Filter players"
        className="w-full"
      />

      <div className="mt-2 max-h-56 overflow-y-auto rounded-md border">
        {rows.length === 0 ? (
          <p className="text-muted-foreground p-4 text-center text-sm">
            {players.data?.length ? 'No player matches that.' : 'No player profiles exist yet.'}
          </p>
        ) : (
          <ul className="divide-y">
            {rows.map((player) => {
              const checked = selected.includes(player.id)
              return (
                <li key={player.id}>
                  <label className="hover:bg-muted/50 flex cursor-pointer items-center gap-3 px-3 py-2">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(next) => toggle(player.id, next === true)}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {player.user.username}
                      </span>
                      <span className="text-muted-foreground block truncate text-xs">
                        {player.team_name ?? 'No club listed'}
                      </span>
                    </span>
                    <span className="tabular text-muted-foreground font-mono text-xs">
                      {formatRating(player.rating)}
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <p className="text-muted-foreground mt-2 text-xs">
        <span className="tabular font-mono">{selected.length}</span> selected
      </p>
    </div>
  )
}
