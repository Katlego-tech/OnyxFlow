import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Navigate, Route, Routes } from 'react-router'

import { clearTokens, readTokens, writeTokens } from '@/lib/tokens'
import type { Role } from '@/lib/types'

import { AuthProvider } from './AuthProvider'
import { RequireAuth, RequireRole, RoleHome } from './guards'
import { useAuth } from './useAuth'

/** The state machine in docs/design/web.md §5, and the guards built on it. */

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  fetchMock.mockReset()
  clearTokens()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function SessionProbe() {
  const { status, user, signOut } = useAuth()
  return (
    <div>
      <p data-testid="status">{status}</p>
      <p data-testid="user">{user ? `${user.username}:${user.role}` : 'none'}</p>
      <button onClick={signOut}>Sign out</button>
    </div>
  )
}

function renderApp(ui: React.ReactNode, { route = '/' } = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        <AuthProvider>{ui}</AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function stubCurrentUser(role: Role, username = 'ada') {
  fetchMock.mockImplementation(async (input) => {
    if (String(input).includes('/api/me/')) {
      return jsonResponse(200, { id: 1, username, role })
    }
    return jsonResponse(200, [])
  })
}

describe('session restore', () => {
  it('settles on anonymous without calling the API when there is no token', async () => {
    renderApp(<SessionProbe />)

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('anonymous'))
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('restores the user from a stored token instead of signing them out on reload', async () => {
    writeTokens({ access: 'access-1', refresh: 'refresh-1' })
    stubCurrentUser('coach', 'ruth')

    renderApp(<SessionProbe />)

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'))
    expect(screen.getByTestId('user')).toHaveTextContent('ruth:coach')
  })

  it('drops to anonymous and clears the tokens when the stored session is dead', async () => {
    writeTokens({ access: 'stale', refresh: 'expired' })
    fetchMock.mockResolvedValue(jsonResponse(401, { detail: 'Token is invalid or expired' }))

    renderApp(<SessionProbe />)

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('anonymous'))
    expect(readTokens()).toEqual({ access: null, refresh: null })
  })

  it('clears the stored tokens on sign out', async () => {
    writeTokens({ access: 'access-1', refresh: 'refresh-1' })
    stubCurrentUser('admin')

    renderApp(<SessionProbe />)
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'))

    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }))

    expect(screen.getByTestId('status')).toHaveTextContent('anonymous')
    expect(readTokens()).toEqual({ access: null, refresh: null })
  })
})

describe('route guards', () => {
  const routes = (
    <Routes>
      <Route path="/login" element={<p>Sign in</p>} />
      <Route element={<RequireAuth />}>
        <Route index element={<RoleHome />} />
        <Route element={<RequireRole allow={['admin', 'coach']} />}>
          <Route path="teams" element={<p>Teams sheet</p>} />
        </Route>
        <Route element={<RequireRole allow={['player']} />}>
          <Route path="profile" element={<p>Profile sheet</p>} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )

  it('sends an anonymous visitor to the sign-in screen', async () => {
    renderApp(routes, { route: '/teams' })

    expect(await screen.findByText('Sign in')).toBeInTheDocument()
  })

  it('never flashes the sign-in screen while the session is being restored', () => {
    writeTokens({ access: 'access-1', refresh: 'refresh-1' })
    stubCurrentUser('coach')

    renderApp(routes, { route: '/teams' })

    expect(screen.queryByText('Sign in')).not.toBeInTheDocument()
  })

  it('lands staff on the teams sheet and players on their profile', async () => {
    writeTokens({ access: 'access-1', refresh: 'refresh-1' })
    stubCurrentUser('coach')
    const staff = renderApp(routes, { route: '/' })
    expect(await screen.findByText('Teams sheet')).toBeInTheDocument()
    staff.unmount()

    stubCurrentUser('player', 'pat')
    renderApp(routes, { route: '/' })
    expect(await screen.findByText('Profile sheet')).toBeInTheDocument()
  })

  it('routes a player away from a staff-only screen', async () => {
    writeTokens({ access: 'access-1', refresh: 'refresh-1' })
    stubCurrentUser('player', 'pat')

    renderApp(routes, { route: '/teams' })

    expect(await screen.findByText('Profile sheet')).toBeInTheDocument()
    expect(screen.queryByText('Teams sheet')).not.toBeInTheDocument()
  })
})
