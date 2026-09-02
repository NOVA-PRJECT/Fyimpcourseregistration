'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Guards dashboard pages against bfcache back-button attacks.
 *
 * When a user logs out and presses the browser Back button, the browser may
 * restore the previous dashboard page from bfcache (an in-memory snapshot)
 * without making any server request. This hook detects that event and
 * immediately re-validates the session. If the session is gone, it redirects
 * to /login.
 *
 * Must be called at the top level of every dashboard client component.
 */
export function useBfcacheGuard() {
  const router = useRouter()

  useEffect(() => {
    async function validateSession() {
      try {
        const res = await fetch('/api/auth/profile', { cache: 'no-store' })
        if (!res.ok) {
          router.replace('/login')
        }
      } catch {
        router.replace('/login')
      }
    }

    const handlePageShow = (e: PageTransitionEvent) => {
      // event.persisted is true only for genuine bfcache restorations
      if (e.persisted) {
        validateSession()
      }
    }

    window.addEventListener('pageshow', handlePageShow)
    return () => window.removeEventListener('pageshow', handlePageShow)
  }, [router])
}
