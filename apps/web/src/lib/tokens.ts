/**
 * Where the JWT pair lives, and the only module that touches storage.
 *
 * `localStorage` is a deliberate, recorded trade-off (docs/design/web.md §8): the
 * refresh token lives a day, so keeping it in memory alone would sign the user
 * out on every reload. Subscribers exist so that a refresh rejected deep inside
 * `apiFetch` can drop the whole app to signed-out without that call knowing
 * anything about React.
 */

const ACCESS_KEY = 'onyxflow.access'
const REFRESH_KEY = 'onyxflow.refresh'

export interface StoredTokens {
  access: string | null
  refresh: string | null
}

type Listener = (tokens: StoredTokens) => void

const listeners = new Set<Listener>()

/** Storage throws in Safari private browsing rather than being absent. */
function safeRead(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeWrite(key: string, value: string | null) {
  try {
    if (value === null) {
      window.localStorage.removeItem(key)
    } else {
      window.localStorage.setItem(key, value)
    }
  } catch {
    // A browser that refuses to persist still gets a working session, it just
    // ends when the tab does. Nothing here should throw into a request path.
  }
}

function announce() {
  const snapshot = readTokens()
  for (const listener of listeners) listener(snapshot)
}

export function readTokens(): StoredTokens {
  return { access: safeRead(ACCESS_KEY), refresh: safeRead(REFRESH_KEY) }
}

export function writeTokens(tokens: { access: string; refresh: string }) {
  safeWrite(ACCESS_KEY, tokens.access)
  safeWrite(REFRESH_KEY, tokens.refresh)
  announce()
}

/** A refresh replaces the access token and leaves the refresh token alone. */
export function writeAccess(access: string) {
  safeWrite(ACCESS_KEY, access)
  announce()
}

export function clearTokens() {
  safeWrite(ACCESS_KEY, null)
  safeWrite(REFRESH_KEY, null)
  announce()
}

export function subscribeToTokens(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
