'use client'

export const dynamic = 'force-dynamic'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import PortalHeader from '@/components/portal/PortalHeader'
import PortalFooter from '@/components/portal/PortalFooter'

// ── Password strength helpers (matching change-password page) ──────────────────
type StrengthLevel = 'bad' | 'better' | 'good' | 'strong'

interface StrengthCheck {
  label: string
  met: boolean
}

function getChecks(password: string): StrengthCheck[] {
  return [
    { label: 'At least 10 characters', met: password.length >= 10 },
    { label: 'Contains a number', met: /[0-9]/.test(password) },
    { label: 'Contains uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'Contains lowercase letter', met: /[a-z]/.test(password) },
    { label: 'Contains special character', met: /[^A-Za-z0-9]/.test(password) },
  ]
}

function getStrengthLevel(password: string): StrengthLevel | null {
  if (!password) return null
  const metCount = getChecks(password).filter((c) => c.met).length
  if (metCount <= 1) return 'bad'
  if (metCount === 2) return 'better'
  if (metCount === 3 || metCount === 4) return 'good'
  return 'strong'
}

const STRENGTH_META: Record<StrengthLevel, { label: string; color: string }> = {
  bad:    { label: 'Bad',    color: '#ef4444' },
  better: { label: 'Better', color: '#f97316' },
  good:   { label: 'Good',   color: '#eab308' },
  strong: { label: 'Strong', color: '#22c55e' },
}

// ── Confirm Reset Form ────────────────────────────────────────────────────────

function ConfirmResetForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const code = searchParams.get('code')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const checks = getChecks(password)
  const strengthLevel = getStrengthLevel(password)
  const allChecksMet = checks.every((c) => c.met)

  function validate(): boolean {
    if (!password) { setError('Please enter a new password.'); return false }
    if (!allChecksMet) { setError('Your password does not meet all requirements.'); return false }
    if (!confirmPassword) { setError('Please confirm your new password.'); return false }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return false }
    return true
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/reset-password/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, new_password: password }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        setError(data.error || 'Failed to update password. The reset link may have expired. Please request a new one.')
        setLoading(false)
        return
      }

      setDone(true)
      setLoading(false)
    } catch {
      setError('Network error. Please check your connection and try again.')
      setLoading(false)
    }
  }

  // ── Invalid / Expired Link ────────────────────────────────────────────────
  if (!code) {
    return (
      <div className="w-full max-w-[460px] flex flex-col items-center">
        <div className="w-full bg-white rounded-xl shadow-md overflow-hidden relative border border-[#E2E8F0]">
          <div className="bg-[#082042] py-7 px-8 text-center">
            <div className="w-10 h-10 rounded-full bg-white/10 mx-auto mb-3.5 flex items-center justify-center">
              <span className="material-symbols-outlined text-[#f7bd40] text-[20px]">link_off</span>
            </div>
            <h1 className="font-serif text-2xl text-white font-medium tracking-tight">Link Expired</h1>
            <div className="w-12 h-0.5 bg-[#E0A92C] mx-auto my-3 rounded-full" />
            <p className="text-xs text-[#dce9ff] max-w-xs mx-auto leading-relaxed">
              This password reset link is invalid or has expired. Reset links are valid for 1 hour.
            </p>
          </div>
          <div className="p-6 md:p-8 space-y-4 bg-white">
            <Link
              href="/reset-password"
              className="w-full h-11 bg-[#082042] hover:bg-[#0B192C] text-white text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <span>Request New Link</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
            <div className="pt-1 text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#44474e] hover:text-[#082042] transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                <span>Back to Sign In</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Success State ─────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="w-full max-w-[460px] flex flex-col items-center">
        <div className="w-full bg-white rounded-xl shadow-md overflow-hidden relative border border-[#E2E8F0]">
          <div className="bg-[#082042] py-7 px-8 text-center">
            <div className="w-10 h-10 rounded-full bg-white/10 mx-auto mb-3.5 flex items-center justify-center">
              <span className="material-symbols-outlined text-[#4ade80] text-[22px]">check_circle</span>
            </div>
            <h1 className="font-serif text-2xl text-white font-medium tracking-tight">Password Updated</h1>
            <div className="w-12 h-0.5 bg-[#E0A92C] mx-auto my-3 rounded-full" />
            <p className="text-xs text-[#dce9ff] max-w-xs mx-auto leading-relaxed">
              Your password has been changed successfully. You can now sign in with your new password.
            </p>
          </div>
          <div className="p-6 md:p-8 space-y-4 bg-white">
            <button
              className="w-full h-11 bg-[#082042] hover:bg-[#0B192C] text-white text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
              onClick={() => router.push('/login')}
            >
              <span>Sign In Now</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Set New Password Form ─────────────────────────────────────────────────
  return (
    <div className="w-full max-w-[460px] flex flex-col items-center">
      <div className="w-full bg-white rounded-xl shadow-md overflow-hidden relative border border-[#E2E8F0]">
        {/* Header */}
        <div className="bg-[#082042] py-7 px-8 text-center">
          <div className="w-10 h-10 rounded-full bg-white/10 mx-auto mb-3.5 flex items-center justify-center">
            <span className="material-symbols-outlined text-[#f7bd40] text-[20px]">lock_reset</span>
          </div>
          <h1 className="font-serif text-2xl text-white font-medium tracking-tight">Set New Password</h1>
          <div className="w-12 h-0.5 bg-[#E0A92C] mx-auto my-3 rounded-full" />
          <p className="text-xs text-[#dce9ff] max-w-xs mx-auto leading-relaxed">
            Choose a strong password for your FYIMP portal account.
          </p>
        </div>

        {/* Body */}
        <div className="p-6 md:p-8 space-y-5 bg-white">
          {/* Error Banner */}
          {error && (
            <div className="rounded-lg p-3.5 flex items-start gap-3 text-xs bg-[#ffdad6] border border-[#ba1a1a]/30 text-[#93000a]">
              <span className="material-symbols-outlined text-[#ba1a1a] text-[18px] mt-0.5 shrink-0">error</span>
              <span className="flex-1">{error}</span>
              <button type="button" onClick={() => setError('')} className="text-[#93000a] hover:opacity-70">
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* New Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-[#44474e] uppercase tracking-wider" htmlFor="newPassword">
                New Password
              </label>
              <div className="h-11 px-3.5 bg-[#EEF3FB] border border-[#CBD5E1] rounded-lg text-sm focus-within:bg-white focus-within:border-[#082042] focus-within:ring-2 focus-within:ring-[#082042]/15 flex items-center gap-2.5 transition-all">
                <span className="material-symbols-outlined text-[#75777f] text-[18px] shrink-0">lock</span>
                <input
                  id="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  className="text-sm text-[#0B192C] placeholder:text-[#75777f] w-full bg-transparent outline-none border-none p-0 focus:ring-0"
                  placeholder="Min. 10 characters"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError('') }}
                  autoComplete="new-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[#75777f] hover:text-[#082042] transition-colors shrink-0"
                  tabIndex={-1}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>

              {/* Strength Level Label */}
              {password && strengthLevel && (
                <div className="flex items-center gap-2 mt-0.5">
                  <span
                    className="text-[11px] font-bold uppercase tracking-wider"
                    style={{ color: STRENGTH_META[strengthLevel].color }}
                  >
                    {STRENGTH_META[strengthLevel].label}
                  </span>
                </div>
              )}

              {/* Requirement Checklist */}
              {password && (
                <ul className="mt-1 space-y-1">
                  {checks.map((c) => (
                    <li key={c.label} className="flex items-center gap-2 text-[11px]">
                      <span
                        className="material-symbols-outlined text-[14px]"
                        style={{ color: c.met ? '#22c55e' : '#94a3b8' }}
                      >
                        {c.met ? 'check_circle' : 'radio_button_unchecked'}
                      </span>
                      <span style={{ color: c.met ? '#22c55e' : '#64748b' }}>{c.label}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Confirm Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-[#44474e] uppercase tracking-wider" htmlFor="confirmPassword">
                Confirm New Password
              </label>
              <div className="h-11 px-3.5 bg-[#EEF3FB] border border-[#CBD5E1] rounded-lg text-sm focus-within:bg-white focus-within:border-[#082042] focus-within:ring-2 focus-within:ring-[#082042]/15 flex items-center gap-2.5 transition-all">
                <span className="material-symbols-outlined text-[#75777f] text-[18px] shrink-0">lock_clock</span>
                <input
                  id="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  className="text-sm text-[#0B192C] placeholder:text-[#75777f] w-full bg-transparent outline-none border-none p-0 focus:ring-0"
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setError('') }}
                  autoComplete="new-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="text-[#75777f] hover:text-[#082042] transition-colors shrink-0"
                  tabIndex={-1}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {showConfirm ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
              {/* Match indicator */}
              {confirmPassword && (
                <p
                  className="text-[11px] flex items-center gap-1.5 mt-0.5"
                  style={{ color: password === confirmPassword ? '#22c55e' : '#ef4444' }}
                >
                  <span className="material-symbols-outlined text-[13px]">
                    {password === confirmPassword ? 'check_circle' : 'cancel'}
                  </span>
                  {password === confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              className="w-full h-11 bg-[#082042] hover:bg-[#0B192C] text-white text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm active:scale-[0.99] cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                  <span>Updating Password...</span>
                </>
              ) : (
                <>
                  <span>Set New Password</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </>
              )}
            </button>
          </form>

          <div className="pt-1 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#44474e] hover:text-[#082042] transition-colors py-1"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              <span>Back to Sign In</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-6 text-center text-xs text-slate-500">
        Need help?{' '}
        <a
          href="mailto:itcentre@kannuruniversity.ac.in"
          className="font-medium text-slate-700 underline underline-offset-2 hover:text-[#082042] transition-colors"
        >
          Contact support
        </a>
      </div>
    </div>
  )
}

// ── Page Shell ────────────────────────────────────────────────────────────────

export default function ConfirmResetPage() {
  return (
    <div className="bg-[#f8f9ff] font-sans text-[#0b1c30] min-h-screen flex flex-col justify-between selection:bg-[#ffdea4] selection:text-[#261900]">
      <PortalHeader
        rightAction={
          <Link
            href="/login"
            className="text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors inline-flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>Back to Sign In</span>
          </Link>
        }
      />

      <main className="w-full flex-1 bg-[#f8f9ff] flex items-center justify-center p-4 md:p-6">
        <div className="flex flex-col w-full">
          <div className="w-full flex items-center justify-center py-6 md:py-10">
            <Suspense
              fallback={
                <div className="w-full max-w-[460px]">
                  <div className="w-full bg-white rounded-xl shadow-md border border-[#E2E8F0] overflow-hidden">
                    <div className="bg-[#082042] py-7 px-8 text-center">
                      <div className="w-10 h-10 rounded-full bg-white/10 mx-auto mb-3.5 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[#f7bd40] text-[20px] animate-spin">
                          progress_activity
                        </span>
                      </div>
                      <h1 className="font-serif text-2xl text-white font-medium tracking-tight">Verifying Link</h1>
                      <div className="w-12 h-0.5 bg-[#E0A92C] mx-auto my-3 rounded-full" />
                    </div>
                    <div className="p-6 text-center">
                      <p className="text-xs text-[#75777f]">Verifying your reset link...</p>
                    </div>
                  </div>
                </div>
              }
            >
              <ConfirmResetForm />
            </Suspense>
          </div>
        </div>
      </main>

      <PortalFooter />
    </div>
  )
}
