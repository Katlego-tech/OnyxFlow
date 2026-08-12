import { createContext } from 'react'
import type { RegisterPayload, Role, User } from '@/lib/types'

/** docs/design/web.md §5 — the states the whole shell is gated on. */
export type SessionStatus = 'restoring' | 'anonymous' | 'authenticated'

export interface AuthContextValue {
  status: SessionStatus
  user: User | null
  signIn: (username: string, password: string) => Promise<User>
  register: (role: Role, payload: RegisterPayload) => Promise<User>
  signOut: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
