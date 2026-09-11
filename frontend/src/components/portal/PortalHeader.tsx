'use client'

import Link from 'next/link'
import Image from 'next/image'
import React from 'react'

export interface PortalHeaderProps {
  variant?: 'home' | 'login' | 'back' | 'none'
  rightAction?: React.ReactNode
}

export default function PortalHeader({ variant = 'back', rightAction }: PortalHeaderProps) {
  return (
    <header className="w-full h-16 border-b border-slate-200 bg-white sticky top-0 z-50 px-6 md:px-8 flex items-center justify-between">
      {/* Left: Kannur University Institutional Identity */}
      <Link href="/" className="flex items-center gap-3 group">
        <Image
          src="/knrunilogo.png"
          alt="Kannur University"
          width={34}
          height={34}
          className="object-contain flex-shrink-0"
          priority
        />
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-[#0F172A] tracking-tight leading-tight block group-hover:text-[#082042] transition-colors">
            Kannur University
          </span>
          <span className="text-[10px] font-medium tracking-widest text-[#64748B] uppercase leading-none block mt-0.5">
            FIVE-YEAR INTEGRATED MASTERS PROGRAMME
          </span>
        </div>
      </Link>

      {/* Right: Actions / Links */}
      <div className="flex items-center gap-4">
        {rightAction ? (
          rightAction
        ) : variant === 'home' ? (
          <Link
            href="/login"
            className="text-xs font-semibold px-4 py-2 bg-[#082042] hover:bg-[#0B192C] text-white rounded-lg transition-colors shadow-sm"
          >
            Sign In
          </Link>
        ) : variant === 'login' ? (
          <Link
            href="/"
            className="text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors inline-flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">home</span>
            <span>Home</span>
          </Link>
        ) : variant === 'back' ? (
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>Back to Home</span>
          </Link>
        ) : null}
      </div>
    </header>
  )
}
