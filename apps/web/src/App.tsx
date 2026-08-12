import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router'

import { AppShell } from '@/components/AppShell'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/auth/AuthProvider'
import { RequireAuth, RequireRole, RoleHome } from '@/auth/guards'
import { LoginPage } from '@/pages/LoginPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { RegisterPage } from '@/pages/RegisterPage'
import { TeamDetailPage } from '@/pages/TeamDetailPage'
import { TeamsPage } from '@/pages/TeamsPage'
import { TrainingsPage } from '@/pages/TrainingsPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Long enough that moving between screens doesn't re-fetch a list you just
      // looked at; short enough that another coach's change shows up.
      staleTime: 15_000,
    },
  },
})

const STAFF = ['admin', 'coach'] as const
const PLAYERS = ['player'] as const

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* The sidebar's collapsed-state tooltips need this above the router. */}
      <TooltipProvider>
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              <Route element={<RequireAuth />}>
                <Route element={<AppShell />}>
                  <Route index element={<RoleHome />} />

                  <Route element={<RequireRole allow={STAFF} />}>
                    <Route path="teams" element={<TeamsPage />} />
                    <Route path="teams/:teamId" element={<TeamDetailPage />} />
                    <Route path="trainings" element={<TrainingsPage />} />
                  </Route>

                  <Route element={<RequireRole allow={PLAYERS} />}>
                    <Route path="profile" element={<ProfilePage />} />
                  </Route>

                  <Route path="*" element={<NotFoundPage />} />
                </Route>
              </Route>
            </Routes>
            <Toaster position="bottom-right" />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  )
}
