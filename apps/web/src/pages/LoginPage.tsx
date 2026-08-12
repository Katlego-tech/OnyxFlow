import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
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

export function LoginPage() {
  const { status, signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (status === 'authenticated') return <Navigate to="/" replace />

  const from = (location.state as { from?: string } | null)?.from ?? '/'

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const user = await signIn(username, password)
      toast.success(`Signed in as ${user.username}`)
      navigate(from, { replace: true })
    } catch (caught) {
      // Wrong credentials belong beside the form, not in a toast that slides away.
      setError(
        caught instanceof ApiError && caught.status === 401
          ? 'That username and password do not match an account.'
          : caught instanceof ApiError
            ? caught.message
            : 'Sign in failed.',
      )
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
            {/* A real h1: this screen is outside the app shell, so it owns the
                document's top-level heading. */}
            <h1>Sign in</h1>
          </CardTitle>
          <CardDescription>
            Squads, training load and team sheets, in one place the whole club reads from.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                autoComplete="username"
                autoFocus
                required
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full"
              />
            </div>

            {error && (
              <p role="alert" className="text-destructive text-sm">
                {error}
              </p>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={submitting}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <p className="text-muted-foreground mt-6 text-center text-sm">
            No account yet?{' '}
            <Link to="/register" className="text-foreground underline underline-offset-4">
              Create one
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
