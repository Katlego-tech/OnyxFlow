import { use } from 'react'

import { AuthContext, type AuthContextValue } from './context'

export function useAuth(): AuthContextValue {
  const value = use(AuthContext)
  if (!value) throw new Error('useAuth was called outside AuthProvider.')
  return value
}
