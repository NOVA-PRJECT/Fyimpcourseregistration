'use client'

import Link from 'next/link'
import React from 'react'

export interface PortalFooterProps {
  className?: string
  currentYear?: number
}

export default function PortalFooter({ className = '', currentYear = 2024 }: PortalFooterProps) {
  return (
    <footer
      className={`w-full border-t border-slate-200/60 bg-white py-5 sm:py-6 px-6 md:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-[#64748B] gap-4 ${className}`}
    >
      <div>© {currentYear} Kannur University. All rights reserved.</div>
      <div className="flex items-center gap-6">
        <Link className="hover:text-slate-900 transition-colors" href="/privacy-policy">
          Privacy Policy
        </Link>
        <Link className="hover:text-slate-900 transition-colors" href="/terms-of-use">
          Terms of Use
        </Link>
      </div>
    </footer>
  )
}
