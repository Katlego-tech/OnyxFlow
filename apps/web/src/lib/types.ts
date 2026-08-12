/**
 * The API contract, once.
 *
 * These mirror `backend/api/serializers.py` exactly — see docs/design/web.md §6.
 * No screen redeclares a response shape; if the API changes, it changes here and
 * `tsc` finds every consumer.
 */

export type Role = 'admin' | 'coach' | 'player'

export const ROLES: readonly Role[] = ['admin', 'coach', 'player']

/** `UserSerializer` */
export interface User {
  id: number
  username: string
  role: Role
}

/**
 * `PlayerPublicSerializer`.
 *
 * `id` is the **PlayerProfile** pk — the key `Team.players` and
 * `TrainingSession.players` are written with. It is not `user.id`, and
 * conflating the two silently assigns the wrong person.
 */
export interface PlayerPublic {
  id: number
  user: User
  rating: number | null
  team_name: string | null
}

/** `PlayerSelfSerializer` — the caller's own profile, players only. */
export interface PlayerProfile {
  id: number
  user: User
  height: number | null
  team_name: string | null
}

/** `TeamReadSerializer` */
export interface Team {
  id: number
  name: string
  admin_owner: User
  current_coach: User | null
  players: PlayerPublic[]
  created_at: string
}

/** `CoachTrainingSerializer` (`fields = '__all__'`). */
export interface TrainingSession {
  id: number
  created_by: number
  team: number | null
  players: PlayerPublic[]
  focus: string
  duration_minutes: number
  created_at: string
}

/** `TokenObtainPairView` */
export interface TokenPair {
  access: string
  refresh: string
}

/** The register views return the user alongside a fresh token pair. */
export interface RegisterResponse extends TokenPair {
  user: User
}

export interface RegisterPayload {
  username: string
  email: string
  password: string
  password2: string
}
