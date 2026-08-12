import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { PlayerPicker } from './PlayerPicker'

/**
 * The one thing that must not regress here: the picker emits **PlayerProfile**
 * pks. `user.id` is a different number for the same person, and sending it would
 * assign somebody else without the API complaining.
 */

const fetchMock = vi.fn<typeof fetch>()

// Profile ids and user ids are deliberately disjoint, so a mix-up can't pass.
const PLAYERS = [
  { id: 8, user: { id: 12, username: 'dara', role: 'player' }, rating: 59, team_name: 'Onyx Reserves' },
  { id: 5, user: { id: 9, username: 'imani', role: 'player' }, rating: 84, team_name: 'Onyx Athletic' },
]

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  fetchMock.mockReset()
  fetchMock.mockResolvedValue(
    new Response(JSON.stringify(PLAYERS), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function renderPicker(selected: number[] = []) {
  const onChange = vi.fn()
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <PlayerPicker selected={selected} onChange={onChange} />
    </QueryClientProvider>,
  )
  return onChange
}

describe('PlayerPicker', () => {
  it('emits the profile id, not the user id', async () => {
    const onChange = renderPicker()

    const checkbox = await screen.findByRole('checkbox', { name: /dara/ })
    await userEvent.click(checkbox)

    expect(onChange).toHaveBeenCalledWith([8])
    expect(onChange).not.toHaveBeenCalledWith([12])
  })

  it('removes a player without disturbing the rest of the selection', async () => {
    const onChange = renderPicker([8, 5])

    await userEvent.click(await screen.findByRole('checkbox', { name: /imani/ }))

    expect(onChange).toHaveBeenCalledWith([8])
  })

  it('reflects the current selection as checked', async () => {
    renderPicker([5])

    expect(await screen.findByRole('checkbox', { name: /imani/ })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: /dara/ })).not.toBeChecked()
  })

  it('filters by username without losing what is already selected', async () => {
    const onChange = renderPicker([8])

    await userEvent.type(await screen.findByLabelText('Filter players'), 'imani')

    await waitFor(() => expect(screen.queryByText('dara')).not.toBeInTheDocument())
    await userEvent.click(screen.getByRole('checkbox', { name: /imani/ }))

    // dara (8) is off-screen but must survive the change.
    expect(onChange).toHaveBeenCalledWith([8, 5])
  })

  it('reads the staff-only directory endpoint', async () => {
    renderPicker()

    await screen.findByRole('checkbox', { name: /dara/ })

    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/players/')
  })
})
