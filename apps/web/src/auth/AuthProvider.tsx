import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { apiFetch } from '@/lib/api'
import { clearTokens, readTokens, subscribeToTokens, writeTokens } from '@/lib/tokens'
import type { RegisterPayload, RegisterResponse, Role, TokenPair, User } from '@/lib/types'

import { AuthContext, type SessionStatus } from './context'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<SessionStatus>('restoring')
  const [user, setUser] = useState<User | null>(null)

  // Restore the session before the router decides anything. Rendering /login at
  // a signed-in user who merely reloaded the page is the bug this prevents.
  useEffect(() => {
    let cancelled = false
    const { access, refresh } = readTokens()

    if (!access && !refresh) {
      setStatus('anonymous')
      return
    }

    apiFetch<User>('/api/me/')
      .then((restored) => {
        if (cancelled) return
        setUser(restored)
        setStatus('authenticated')
      })
      .catch(() => {
        if (cancelled) return
        clearTokens()
        setUser(null)
        setStatus('anonymous')
      })

    return () => {
      cancelled = true
    }
  }, [])

  // A refresh rejected inside apiFetch clears the store. That is the signal the
  // session ended, wherever in the app it happened.
  useEffect(
    () =>
      subscribeToTokens((tokens) => {
        if (!tokens.access && !tokens.refresh) {
          setUser(null)
          setStatus((current) => (current === 'restoring' ? current : 'anonymous'))
        }
      }),
    [],
  )

  const signIn = useCallback(
    async (username: string, password: string) => {
      const tokens = await apiFetch<TokenPair>('/api/token/', {
        method: 'POST',
        body: { username, password },
        authenticated: false,
      })
      writeTokens(tokens)

      const signedIn = await apiFetch<User>('/api/me/')
      setUser(signedIn)
      setStatus('authenticated')
      return signedIn
    },
    [],
  )

  const register = useCallback(async (role: Role, payload: RegisterPayload) => {
    const created = await apiFetch<RegisterResponse>(`/api/auth/register/${role}/`, {
      method: 'POST',
      body: payload,
      authenticated: false,
    })
    writeTokens({ access: created.access, refresh: created.refresh })
    setUser(created.user)
    setStatus('authenticated')
    return created.user
  }, [])

  const signOut = useCallback(() => {
    clearTokens()
    setUser(null)
    setStatus('anonymous')
    // Another account must never see the previous one's cached rows.
    queryClient.clear()
  }, [queryClient])

  const value = useMemo(
    () => ({ status, user, signIn, register, signOut }),
    [status, user, signIn, register, signOut],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
