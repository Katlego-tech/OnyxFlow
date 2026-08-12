import { CalendarDaysIcon, LogOutIcon, UserRoundIcon, UsersIcon } from 'lucide-react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router'

import { ThemeToggle } from '@/components/ThemeToggle'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { useAuth } from '@/auth/useAuth'
import { formatRole } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Role } from '@/lib/types'

interface Lane {
  to: string
  label: string
  icon: typeof UsersIcon
  roles: readonly Role[]
}

/** Lanes a role can't use aren't shown — the API still refuses them either way. */
const LANES: readonly Lane[] = [
  { to: '/teams', label: 'Teams', icon: UsersIcon, roles: ['admin', 'coach'] },
  { to: '/trainings', label: 'Training', icon: CalendarDaysIcon, roles: ['admin', 'coach'] },
  { to: '/profile', label: 'My profile', icon: UserRoundIcon, roles: ['player'] },
]

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('text-base leading-none font-semibold tracking-tight', className)}>
      Onyx<span className="text-muted-foreground">Flow</span>
    </span>
  )
}

function initials(username: string) {
  return username.slice(0, 2).toUpperCase()
}

function currentTitle(pathname: string) {
  if (pathname.startsWith('/teams')) return 'Teams'
  if (pathname.startsWith('/trainings')) return 'Training'
  if (pathname.startsWith('/profile')) return 'My profile'
  return 'OnyxFlow'
}

export function AppShell() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const lanes = LANES.filter((lane) => (user ? lane.roles.includes(user.role) : false))

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <div className="flex items-center gap-2 px-2 py-1.5">
            <div className="bg-primary text-primary-foreground flex size-7 shrink-0 items-center justify-center rounded-md text-xs font-semibold">
              OF
            </div>
            <Wordmark className="group-data-[collapsible=icon]:hidden" />
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Club</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {lanes.map((lane) => (
                  <SidebarMenuItem key={lane.to}>
                    <SidebarMenuButton
                      isActive={location.pathname.startsWith(lane.to)}
                      tooltip={lane.label}
                      render={<NavLink to={lane.to} />}
                    >
                      <lane.icon />
                      <span>{lane.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                tooltip={user ? `${user.username} — sign out` : 'Sign out'}
                onClick={() => {
                  signOut()
                  navigate('/login', { replace: true })
                }}
              >
                <Avatar className="size-7 rounded-md">
                  <AvatarFallback className="rounded-md text-xs">
                    {user ? initials(user.username) : '—'}
                  </AvatarFallback>
                </Avatar>
                <span className="grid flex-1 text-left leading-tight">
                  <span className="truncate text-sm font-medium">{user?.username}</span>
                  <span className="text-muted-foreground truncate text-xs">
                    {user ? formatRole(user.role) : ''}
                  </span>
                </span>
                <LogOutIcon className="ml-auto" />
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        <header className="bg-background sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-1 !h-4" />
          <h1 className="text-sm font-medium">{currentTitle(location.pathname)}</h1>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Sign out"
              onClick={() => {
                signOut()
                navigate('/login', { replace: true })
              }}
            >
              <LogOutIcon />
            </Button>
          </div>
        </header>

        <div className="flex-1 p-4 md:p-6">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
