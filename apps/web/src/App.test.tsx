import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

import App from './App'

/**
 * The whole app, mounted. This is the test that catches a broken provider order,
 * a bad alias, or a component that throws on first render — things a unit test of
 * any single module passes straight through.
 */

const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  fetchMock.mockReset()
  window.localStorage.clear()
  window.history.pushState({}, '', '/')
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('App', () => {
  it('mounts and sends a signed-out visitor to the sign-in sheet', async () => {
    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    expect(screen.getByLabelText('Username')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    // Nothing should have been asked of the API for an anonymous visitor.
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('renders the signed-in shell with only the lanes that role can use', async () => {
    window.localStorage.setItem('onyxflow.access', 'access-1')
    window.localStorage.setItem('onyxflow.refresh', 'refresh-1')
    fetchMock.mockImplementation(async (input) => {
      const body = String(input).includes('/api/me/')
        ? { id: 1, username: 'pat', role: 'player' }
        : { id: 1, user: { id: 1, username: 'pat', role: 'player' }, height: 183, team_name: null }
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    })

    render(<App />)

    expect(await screen.findByRole('link', { name: 'My profile' })).toBeInTheDocument()
    // Teams and Training belong to staff; a player must not see those lanes.
    expect(screen.queryByRole('link', { name: 'Teams' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Training' })).not.toBeInTheDocument()
  })

  it('offers the registration route with all three roles', async () => {
    window.history.pushState({}, '', '/register')

    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Create an account' })).toBeInTheDocument()
    for (const role of ['Admin', 'Coach', 'Player']) {
      expect(screen.getByRole('radio', { name: new RegExp(role) })).toBeInTheDocument()
    }
  })
})
