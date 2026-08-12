import { useEffect, useState } from 'react'
import { MoonIcon, SunIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'

const STORAGE_KEY = 'onyxflow.theme'

/**
 * Sheet or onyx. The initial class is set by the inline script in index.html so
 * the first paint is already correct; this only flips it afterwards.
 */
export function ThemeToggle() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    try {
      window.localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light')
    } catch {
      // A browser that won't persist the choice still honours it this session.
    }
  }, [dark])

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={() => setDark((current) => !current)}
      aria-label={dark ? 'Switch to the light sheet' : 'Switch to the dark sheet'}
    >
      {dark ? <SunIcon /> : <MoonIcon />}
    </Button>
  )
}
