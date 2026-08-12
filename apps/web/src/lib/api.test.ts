import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError, SessionExpiredError, apiFetch, describeApiError } from './api'
import { clearTokens, readTokens, writeTokens } from './tokens'

/**
 * These cover the flow drawn in docs/design/web.md §4. The point of each is the
 * *shape* of the traffic — how many refreshes, in what order, and what is left
 * in the store afterwards — not merely that a promise resolved.
 */

function jsonResponse(status: number, body: unknown) {
  return new Response(body === undefined ? '' : JSON.stringify(body), {
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

describe('apiFetch', () => {
  it('sends the access token as a bearer header', async () => {
    writeTokens({ access: 'access-1', refresh: 'refresh-1' })
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { id: 1 }))

    await apiFetch('/api/me/')

    const [, init] = fetchMock.mock.calls[0]
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer access-1')
  })

  it('omits the bearer header when the endpoint takes no token', async () => {
    writeTokens({ access: 'access-1', refresh: 'refresh-1' })
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { access: 'a', refresh: 'r' }))

    await apiFetch('/api/token/', {
      method: 'POST',
      body: { username: 'ada', password: 'x' },
      authenticated: false,
    })

    const [, init] = fetchMock.mock.calls[0]
    expect((init?.headers as Record<string, string>).Authorization).toBeUndefined()
  })

  it('refreshes once on a 401 and retries the original request', async () => {
    writeTokens({ access: 'stale', refresh: 'refresh-1' })
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { detail: 'Token is invalid' }))
      .mockResolvedValueOnce(jsonResponse(200, { access: 'fresh' }))
      .mockResolvedValueOnce(jsonResponse(200, [{ id: 7 }]))

    const teams = await apiFetch<{ id: number }[]>('/api/teams/')

    expect(teams).toEqual([{ id: 7 }])
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(fetchMock.mock.calls[1][0]).toContain('/api/token/refresh/')
    expect(readTokens().access).toBe('fresh')
    // The refresh token is untouched by a refresh.
    expect(readTokens().refresh).toBe('refresh-1')
  })

  it('refreshes only once when several requests fail on the same expired token', async () => {
    writeTokens({ access: 'stale', refresh: 'refresh-1' })
    fetchMock.mockImplementation(async (input, init) => {
      if (String(input).includes('/api/token/refresh/')) {
        return jsonResponse(200, { access: 'fresh' })
      }
      // Only the stale token is refused; the retry with the fresh one succeeds.
      const headers = (init?.headers ?? {}) as Record<string, string>
      return headers.Authorization === 'Bearer stale'
        ? jsonResponse(401, { detail: 'Token is invalid' })
        : jsonResponse(200, { ok: true })
    })

    await Promise.all([
      apiFetch('/api/teams/'),
      apiFetch('/api/trainings/'),
      apiFetch('/api/me/'),
    ])

    const refreshCalls = fetchMock.mock.calls.filter(([input]) =>
      String(input).includes('/api/token/refresh/'),
    )
    expect(refreshCalls).toHaveLength(1)
  })

  it('clears the session and throws SessionExpiredError when the refresh is rejected', async () => {
    writeTokens({ access: 'stale', refresh: 'expired' })
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { detail: 'Token is invalid' }))
      .mockResolvedValueOnce(jsonResponse(401, { detail: 'Token is invalid or expired' }))

    await expect(apiFetch('/api/teams/')).rejects.toBeInstanceOf(SessionExpiredError)
    expect(readTokens()).toEqual({ access: null, refresh: null })
  })

  it('does not attempt a refresh when there is no refresh token', async () => {
    writeTokens({ access: 'stale', refresh: '' })
    fetchMock.mockResolvedValueOnce(jsonResponse(401, { detail: 'Token is invalid' }))

    await expect(apiFetch('/api/teams/')).rejects.toBeInstanceOf(SessionExpiredError)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('surfaces a 403 as an ApiError without clearing the session', async () => {
    writeTokens({ access: 'access-1', refresh: 'refresh-1' })
    fetchMock.mockResolvedValueOnce(
      jsonResponse(403, { detail: 'You do not have permission to perform this action.' }),
    )

    await expect(apiFetch('/api/teams/')).rejects.toMatchObject({
      status: 403,
      message: 'You do not have permission to perform this action.',
    })
    expect(readTokens().access).toBe('access-1')
  })

  it('reports an unreachable API as status 0 rather than a rejected promise', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))

    const error = await apiFetch('/api/teams/', { authenticated: false }).catch((e) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(0)
  })

  it('returns undefined for 204 instead of trying to parse a body', async () => {
    writeTokens({ access: 'access-1', refresh: 'refresh-1' })
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }))

    await expect(apiFetch('/api/teams/1/', { method: 'DELETE' })).resolves.toBeUndefined()
  })
})

describe('describeApiError', () => {
  it('uses DRF detail when there is one', () => {
    expect(describeApiError(403, { detail: 'Only the team owner may delete this team.' })).toBe(
      'Only the team owner may delete this team.',
    )
  })

  it('flattens field errors into a readable sentence', () => {
    expect(describeApiError(400, { duration_minutes: ['A valid integer is required.'] })).toBe(
      'Duration minutes: A valid integer is required.',
    )
  })

  it('passes non-field errors through unlabelled', () => {
    expect(describeApiError(400, { non_field_errors: ['Passwords do not match.'] })).toBe(
      'Passwords do not match.',
    )
  })

  it('falls back to something actionable when the body says nothing', () => {
    expect(describeApiError(500, null)).toContain('Try again')
  })
})
