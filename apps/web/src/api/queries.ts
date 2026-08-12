/**
 * One hook per endpoint the app actually uses (docs/design/web.md §6).
 *
 * Every mutation names the keys it invalidates, because a stale list after a
 * successful write is the same bug as showing the wrong data.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { SessionExpiredError, apiFetch } from '@/lib/api'
import type { PlayerProfile, PlayerPublic, Team, TrainingSession, User } from '@/lib/types'

export const queryKeys = {
  teams: ['teams'] as const,
  team: (id: number) => ['teams', id] as const,
  trainings: ['trainings'] as const,
  profile: ['profile'] as const,
  coaches: ['coaches'] as const,
  players: ['players'] as const,
}

/** An ended session is handled by the auth context; retrying it is pointless. */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof SessionExpiredError) return false
  return failureCount < 2
}

export function useTeams() {
  return useQuery({
    queryKey: queryKeys.teams,
    queryFn: () => apiFetch<Team[]>('/api/teams/'),
    retry: shouldRetry,
  })
}

export function useTeam(id: number) {
  return useQuery({
    queryKey: queryKeys.team(id),
    queryFn: () => apiFetch<Team>(`/api/teams/${id}/`),
    retry: shouldRetry,
    enabled: Number.isFinite(id),
  })
}

export function useCreateTeam() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) =>
      apiFetch<{ id: number; name: string }>('/api/teams/', { method: 'POST', body: { name } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.teams }),
  })
}

/** Every field `TeamWriteSerializer` accepts. `players` holds PlayerProfile pks. */
export interface TeamPatch {
  name?: string
  current_coach?: number | null
  players?: number[]
}

export function useUpdateTeam(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (patch: TeamPatch) =>
      apiFetch<{ id: number; name: string }>(`/api/teams/${id}/`, {
        method: 'PATCH',
        body: patch,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.team(id) })
      await queryClient.invalidateQueries({ queryKey: queryKeys.teams })
    },
  })
}

/**
 * The two staff-only directories that make assignment addressable. A player
 * calling either gets 403, which is why no player-facing screen uses them.
 */
export function useCoaches() {
  return useQuery({
    queryKey: queryKeys.coaches,
    queryFn: () => apiFetch<User[]>('/api/coaches/'),
    retry: shouldRetry,
  })
}

export function usePlayers() {
  return useQuery({
    queryKey: queryKeys.players,
    queryFn: () => apiFetch<PlayerPublic[]>('/api/players/'),
    retry: shouldRetry,
  })
}

export function useDeleteTeam() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiFetch<void>(`/api/teams/${id}/`, { method: 'DELETE' }),
    onSuccess: async (_result, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.team(id) })
      await queryClient.invalidateQueries({ queryKey: queryKeys.teams })
      // A deleted team drops off its sessions, which the list is showing.
      await queryClient.invalidateQueries({ queryKey: queryKeys.trainings })
    },
  })
}

export function useTrainings() {
  return useQuery({
    queryKey: queryKeys.trainings,
    queryFn: () => apiFetch<TrainingSession[]>('/api/trainings/'),
    retry: shouldRetry,
  })
}

export interface TrainingDraft {
  focus: string
  duration_minutes: number
  team: number | null
  /** PlayerProfile pks, not user pks. */
  players: number[]
}

export function useCreateTraining() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (draft: TrainingDraft) =>
      apiFetch<TrainingSession>('/api/trainings/', { method: 'POST', body: draft }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.trainings }),
  })
}

export function useUpdateTraining() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...draft }: TrainingDraft & { id: number }) =>
      apiFetch<TrainingSession>(`/api/trainings/${id}/`, { method: 'PATCH', body: draft }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.trainings }),
  })
}

export function useDeleteTraining() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiFetch<void>(`/api/trainings/${id}/`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.trainings }),
  })
}

export function useProfile() {
  return useQuery({
    queryKey: queryKeys.profile,
    queryFn: () => apiFetch<PlayerProfile>('/api/profiles/'),
    retry: shouldRetry,
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (height: number | null) =>
      apiFetch<PlayerProfile>('/api/profiles/', { method: 'PATCH', body: { height } }),
    onSuccess: (updated) => queryClient.setQueryData(queryKeys.profile, updated),
  })
}
