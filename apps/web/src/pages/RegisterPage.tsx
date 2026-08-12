import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { toast } from 'sonner'

import { Wordmark } from '@/components/AppShell'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/auth/useAuth'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { Role } from '@/lib/types'

/** Registration is per-role on the API, so the role is picked before anything else. */
const ROLE_CHOICES: readonly { role: Role; label: string; blurb: string }[] = [
  { role: 'admin', label: 'Admin', blurb: 'Owns teams and keeps them when a coach moves on.' },
  { role: 'coach', label: 'Coach', blurb: 'Runs the squad and schedules training.' },
  { role: 'player', label: 'Player', blurb: 'Trains, and keeps their own profile current.' },
]

export function RegisterPage() {
  const { status, register } = useAuth()
  const navigate = useNavigate()

  const [role, setRole] = useState<Role>('coach')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (status === 'authenticated') return <Navigate to="/" replace />

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const user = await register(role, { username, email, password, password2 })
      toast.success(`Account created for ${user.username}`)
      navigate('/', { replace: true })
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Registration failed.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-muted/40 flex min-h-dvh flex-col items-center justify-center gap-6 p-6">
      <div className="flex items-center gap-2">
        <div className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-md text-xs font-semibold">
          OF
        </div>
        <Wordmark />
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>
            <h1>Create an account</h1>
          </CardTitle>
          <CardDescription>Your role decides which screens you get.</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <fieldset>
              <legend className="text-sm font-medium">Role</legend>
              <div className="mt-2 grid gap-2">
                {ROLE_CHOICES.map((choice) => (
                  <label
                    key={choice.role}
                    className={cn(
                      'flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2.5 transition-colors',
                      role === choice.role
                        ? 'border-primary bg-accent/50'
                        : 'hover:border-foreground/30',
                    )}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={choice.role}
                      checked={role === choice.role}
                      onChange={() => setRole(choice.role)}
                      className="accent-primary mt-1"
                    />
                    <span>
                      <span className="block text-sm font-medium">{choice.label}</span>
                      <span className="text-muted-foreground block text-xs">{choice.blurb}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                autoComplete="username"
                required
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password2">Confirm password</Label>
              <Input
                id="password2"
                type="password"
                autoComplete="new-password"
                required
                value={password2}
                onChange={(event) => setPassword2(event.target.value)}
                className="w-full"
              />
            </div>

            {error && (
              <p role="alert" className="text-destructive text-sm">
                {error}
              </p>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create account'}
            </Button>
          </form>

          <p className="text-muted-foreground mt-6 text-center text-sm">
            Already have one?{' '}
            <Link to="/login" className="text-foreground underline underline-offset-4">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
