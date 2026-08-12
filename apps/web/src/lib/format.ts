/** Shared formatting, so two screens can't disagree about what a minute looks like. */

/** `95` → `1h 35m`, `45` → `45m`. Sessions are scheduled in whole minutes. */
export function formatDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '0m'
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (!hours) return `${rest}m`
  if (!rest) return `${hours}h`
  return `${hours}h ${rest}m`
}

const dateFormat = new Intl.DateTimeFormat(undefined, {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

/** ISO-8601 in, a readable date out. Never used for domain logic. */
export function formatDate(iso: string): string {
  const parsed = new Date(iso)
  return Number.isNaN(parsed.getTime()) ? '—' : dateFormat.format(parsed)
}

/**
 * The API neither states nor validates the unit on `PlayerProfile.height`
 * (docs/design/web.md §10), so this shows the number it was given and nothing
 * more. Guessing "cm" here would be inventing data.
 */
export function formatHeight(height: number | null): string {
  return height === null ? '—' : String(height)
}

export function formatRating(rating: number | null): string {
  return rating === null ? '—' : String(rating)
}

const roleLabels: Record<string, string> = {
  admin: 'Admin',
  coach: 'Coach',
  player: 'Player',
}

export function formatRole(role: string): string {
  return roleLabels[role] ?? role
}
