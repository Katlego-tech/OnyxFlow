/**
 * The single door to the API.
 *
 * Everything the client knows about HTTP lives here: the base URL, the bearer
 * header, and the access-token refresh described in docs/design/web.md §4.
 * Screens call typed helpers in `src/api/queries.ts`; nothing else calls `fetch`.
 */

import { clearTokens, readTokens, writeAccess } from './tokens'

const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000').replace(/\/+$/, '')

export class ApiError extends Error {
  /** HTTP status, or 0 when the request never reached the server. */
  readonly status: number
  /** The parsed response body, when there was one. */
  readonly payload: unknown

  constructor(status: number, message: string, payload?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.payload = payload
  }
}

/**
 * The refresh token is gone or was rejected. Not an error the user caused, so
 * screens let it fall through to the auth context rather than reporting it.
 */
export class SessionExpiredError extends ApiError {
  constructor() {
    super(401, 'Your session has ended. Sign in again to continue.')
    this.name = 'SessionExpiredError'
  }
}

/**
 * DRF speaks three error dialects: `{detail}`, `{field: [messages]}`, and
 * `{non_field_errors: [...]}`. Turn any of them into one sentence a person can
 * act on, without inventing wording the server didn't send.
 */
export function describeApiError(status: number, payload: unknown): string {
  if (typeof payload === 'string' && payload.trim()) return payload

  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>

    if (typeof record.detail === 'string') return record.detail

    const parts: string[] = []
    for (const [field, value] of Object.entries(record)) {
      const messages = Array.isArray(value) ? value : [value]
      const text = messages.filter((m) => typeof m === 'string').join(' ')
      if (!text) continue
      parts.push(field === 'non_field_errors' ? text : `${humanizeField(field)}: ${text}`)
    }
    if (parts.length) return parts.join(' ')
  }

  if (status === 403) return 'Your role does not allow that.'
  if (status === 404) return 'That is not here.'
  if (status >= 500) return 'The API failed on that request. Try again in a moment.'
  return `The request failed (${status}).`
}

function humanizeField(field: string): string {
  const words = field.replace(/_/g, ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}

/**
 * Single-flight refresh. Several queries routinely fail together on one expired
 * token; without this they would each spend a refresh round-trip and race one
 * another into a cleared store.
 */
let refreshInFlight: Promise<string> | null = null

async function refreshAccessToken(): Promise<string> {
  if (refreshInFlight) return refreshInFlight

  refreshInFlight = (async () => {
    const { refresh } = readTokens()
    if (!refresh) throw new SessionExpiredError()

    let response: Response
    try {
      response = await fetch(`${BASE_URL}/api/token/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ refresh }),
      })
    } catch {
      throw new ApiError(0, unreachableMessage())
    }

    if (!response.ok) {
      clearTokens()
      throw new SessionExpiredError()
    }

    const body = (await response.json()) as { access?: string }
    if (!body.access) {
      clearTokens()
      throw new SessionExpiredError()
    }

    writeAccess(body.access)
    return body.access
  })()

  try {
    return await refreshInFlight
  } finally {
    refreshInFlight = null
  }
}

function unreachableMessage() {
  return `Can't reach the API at ${BASE_URL}. Start it with \`python manage.py runserver\`.`
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  /** Set false for the token and register endpoints, which take no bearer. */
  authenticated?: boolean
  signal?: AbortSignal
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, authenticated = true, signal } = options

  const send = async (accessToken: string | null) => {
    const headers: Record<string, string> = { Accept: 'application/json' }
    if (body !== undefined) headers['Content-Type'] = 'application/json'
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`

    try {
      return await fetch(`${BASE_URL}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal,
      })
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error
      throw new ApiError(0, unreachableMessage())
    }
  }

  let response = await send(authenticated ? readTokens().access : null)

  if (authenticated && response.status === 401 && readTokens().refresh) {
    const access = await refreshAccessToken()
    response = await send(access)

    // A fresh token that is still refused means the session is genuinely over.
    if (response.status === 401) {
      clearTokens()
      throw new SessionExpiredError()
    }
  }

  if (response.status === 401 && authenticated) {
    clearTokens()
    throw new SessionExpiredError()
  }

  if (response.status === 204) return undefined as T

  const text = await response.text()
  const payload = text ? safeParse(text) : null

  if (!response.ok) {
    throw new ApiError(response.status, describeApiError(response.status, payload), payload)
  }

  return payload as T
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}
