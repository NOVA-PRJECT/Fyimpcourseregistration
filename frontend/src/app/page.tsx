'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ROLE_DASHBOARD_MAP } from '@/core/security/routeConfig'
import { Role } from '@/core/constants/roles'
import PortalHeader from '@/components/portal/PortalHeader'
import PortalFooter from '@/components/portal/PortalFooter'

export default function Home() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    async function checkSession(isBfcache: boolean) {
      try {
        const response = await fetch('/api/auth/profile')
        if (response.ok) {
          const data = await response.json()
          if (data.role) {
            const target = ROLE_DASHBOARD_MAP[data.role as Role] || '/dashboard/student'
            router.replace(target)
            return
          }
        }
      } catch (err) {
        console.error('Session check failed:', err)
      }
      setChecking(false)
    }

    checkSession(false)

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        setChecking(true)
        checkSession(true)
      }
    }

    window.addEventListener('pageshow', handlePageShow)
    return () => {
      window.removeEventListener('pageshow', handlePageShow)
    }
  }, [router])

  if (checking) {
    return (
      <div className="min-h-screen bg-[#082042] flex items-center justify-center">
        <div className="w-12 h-12 border-3 border-[#E0A92C]/20 border-t-[#E0A92C] rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="bg-[#f8f9ff] text-[#0b1c30] flex flex-col min-h-screen selection:bg-[#d3e4fe] selection:text-[#0b1c30]">
      {/* Institutional Navigation Bar */}
      <PortalHeader variant="home" />

      {/* Main Hero Section */}
      <main className="flex-grow flex flex-col items-center justify-center px-4 sm:px-6 md:px-8 py-16 md:py-24">
        <div className="w-full max-w-4xl mx-auto flex flex-col items-center text-center">
          {/* Hero Tag Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#eff4ff] rounded-full mb-6 border border-[#E0A92C]/40 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#E0A92C]" />
            <span className="text-xs font-semibold tracking-wide text-[#0b1c30]">
              Five-Year Integrated Masters Programme
            </span>
          </div>

          {/* Editorial Headline */}
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl text-[#0b1c30] tracking-tight max-w-3xl mx-auto mb-4 font-normal">
            Welcome to FYIMP Portal
          </h1>

          <div className="w-12 h-0.5 bg-[#E0A92C] rounded-full mx-auto mb-8" />

          <p className="text-sm sm:text-base text-slate-600 max-w-xl mx-auto mb-10 leading-relaxed font-normal">
            Unified institutional platform for curriculum registration, course preference allocation, and academic governance.
          </p>

          {/* Primary & Secondary CTA */}
          <div className="flex flex-wrap items-center justify-center gap-4 mb-16">
            <Link
              href="/login"
              className="px-6 py-3 bg-[#0B192C] text-white rounded-lg text-sm font-medium hover:bg-[#152846] transition-all inline-flex items-center gap-2 shadow-sm border border-[#0B192C]"
            >
              <span>Access Unified Portal</span>
              <span className="material-symbols-outlined text-[18px] text-[#E0A92C]">arrow_forward</span>
            </Link>
            <Link
              href="/terms-of-use"
              className="px-5 py-3 text-[#0B192C] hover:bg-[#dce9ff]/50 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-2 border border-[#E0A92C]/30 bg-white"
            >
              <span className="material-symbols-outlined text-[18px] text-[#E0A92C]">menu_book</span>
              <span>Academic Guidelines</span>
            </Link>
          </div>
        </div>
      </main>

      {/* Statutory Institutional Footer */}
      <PortalFooter />
    </div>
  )
}
