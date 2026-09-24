'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export default function ConsentGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    // Exclude public pages from consent check
    if (
      pathname.startsWith('/privacy-policy') ||
      pathname.startsWith('/terms-of-use') ||
      pathname.startsWith('/consent') ||
      pathname.startsWith('/login')
    ) {
      setChecked(true)
      return
    }

    async function checkConsent() {
      try {
        const res = await fetch('/api/consent/status')
        if (res.ok) {
          const data = await res.json()
          if (!data.accepted) {
            router.replace('/consent')
            return
          }
        }
      } catch (err) {
        console.warn('Consent verification check failed:', err)
      } finally {
        setChecked(true)
      }
    }

    checkConsent()
  }, [pathname, router])

  if (!checked) {
    return null // Keep UI unrendered until consent validation passes
  }

  return <>{children}</>
}
