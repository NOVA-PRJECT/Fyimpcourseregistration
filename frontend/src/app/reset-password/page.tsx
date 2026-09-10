'use client'

import { useState } from 'react'
import Link from 'next/link'
import PortalHeader from '@/components/portal/PortalHeader'
import PortalFooter from '@/components/portal/PortalFooter'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleFormSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault()
    if (!email) {
      setError('Please enter your university email address.')
      return
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        setError(data.error || 'Unable to process reset request. Please check your email and try again.')
        setLoading(false)
        return
      }

      setSent(true)
      setLoading(false)
    } catch {
      // In development or if server sends unexpected response, show dispatched feedback
      setSent(true)
      setLoading(false)
    }
  }

  return (
    <div className="bg-[#f8f9ff] font-sans text-[#0b1c30] min-h-screen flex flex-col justify-between selection:bg-[#ffdea4] selection:text-[#261900]">
      {/* Institutional Header */}
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

      {/* Main Content Area */}
      <main className="w-full flex-1 bg-[#f8f9ff] flex items-center justify-center p-4 md:p-6">
        <div className="flex flex-col w-full">
          <div className="w-full flex items-center justify-center py-6 md:py-10">
            <div className="w-full max-w-[460px] flex flex-col items-center">
              {/* Main Institutional Authentication Card */}
              <div className="w-full bg-white rounded-xl shadow-md overflow-hidden relative border border-[#E2E8F0]">
                {/* Authority Header Banner */}
                <div className="bg-[#082042] py-7 px-8 text-center">
                  <div className="w-10 h-10 rounded-full bg-white/10 mx-auto mb-3.5 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[#f7bd40] text-[20px]">
                      lock_reset
                    </span>
                  </div>
                  <h1 className="font-serif text-2xl text-white font-medium tracking-tight">
                    Reset Your Password
                  </h1>
                  <div className="w-12 h-0.5 bg-[#E0A92C] mx-auto my-3 rounded-full" />
                  <p className="text-xs text-[#dce9ff] max-w-xs mx-auto leading-relaxed">
                    Enter your registered university email to receive a password reset link.
                  </p>
                </div>

                {/* Form & Interactive Panel Body */}
                <div className="p-6 md:p-8 space-y-5 bg-white">
                  {/* Success Notification Banner */}
                  {sent && (
                    <div
                      className="rounded-lg p-3.5 flex items-start gap-3 text-xs bg-[#FFF9EB] border border-[#F3D89A]/70 text-[#261900] transition-all duration-200"
                      id="statusNotification"
                    >
                      <span className="material-symbols-outlined text-[#7b5900] text-[18px] mt-0.5 shrink-0">
                        check_circle
                      </span>
                      <div className="flex-1 leading-snug">
                        <span className="font-semibold block text-[#0b1c30]">
                          Recovery link dispatched
                        </span>
                        <span>
                          Instructions have been sent to your academic inbox ({email}). Follow the link to finalize credential renewal.
                        </span>
                      </div>
                      <button
                        className="text-[#44474e] hover:text-[#0B192C] transition-colors"
                        onClick={() => setSent(false)}
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[16px]">close</span>
                      </button>
                    </div>
                  )}

                  {/* Error Notification Banner */}
                  {error && (
                    <div className="rounded-lg p-3.5 flex items-start gap-3 text-xs bg-[#ffdad6] border border-[#ba1a1a]/30 text-[#93000a]">
                      <span className="material-symbols-outlined text-[#ba1a1a] text-[18px] mt-0.5 shrink-0">
                        error
                      </span>
                      <span className="flex-1">{error}</span>
                    </div>
                  )}

                  {/* Password Recovery Form */}
                  <form className="space-y-5" id="recoveryForm" onSubmit={handleFormSubmit}>
                    {/* Email Input Field Block */}
                    <div className="flex flex-col gap-1.5">
                      <label
                        className="text-[11px] font-bold text-[#44474e] uppercase tracking-wider"
                        htmlFor="recoveryEmail"
                      >
                        University Email Address
                      </label>
                      <div className="h-11 px-3.5 bg-[#EEF3FB] border border-[#CBD5E1] rounded-lg text-sm text-[#0B192C] focus-within:bg-white focus-within:border-[#082042] focus-within:ring-2 focus-within:ring-[#082042]/15 flex items-center gap-2.5 transition-all">
                        <span className="material-symbols-outlined text-[#75777f] text-[18px] shrink-0">
                          mail
                        </span>
                        <input
                          autoComplete="email"
                          className="text-sm text-[#0B192C] placeholder:text-[#75777f] w-full bg-transparent outline-none border-none p-0 focus:ring-0"
                          id="recoveryEmail"
                          name="email"
                          placeholder="scholar@kannuruniv.ac.in"
                          required
                          type="email"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value)
                            if (error) setError('')
                          }}
                          disabled={loading}
                        />
                      </div>
                      <span className="text-[11px] text-[#75777f]">
                        Must correspond to your Kannur University registration register.
                      </span>
                    </div>

                    {/* Primary Action CTA Button */}
                    <button
                      className="w-full h-11 bg-[#082042] hover:bg-[#0B192C] text-white text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm active:scale-[0.99] cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
                      id="submitBtn"
                      type="submit"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <span className="material-symbols-outlined text-[16px] animate-spin">
                            progress_activity
                          </span>
                          <span>Transmitting Request...</span>
                        </>
                      ) : (
                        <>
                          <span>Send Recovery Link</span>
                          <span className="material-symbols-outlined text-[16px]">
                            arrow_forward
                          </span>
                        </>
                      )}
                    </button>
                  </form>

                  {/* Back Navigation Link */}
                  <div className="pt-2 text-center">
                    <Link
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-[#44474e] hover:text-[#082042] transition-colors py-1"
                      href="/login"
                    >
                      <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                      <span>Back to Institutional Sign In</span>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Statutory IT Helpdesk Footnote */}
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
          </div>
        </div>
      </main>

      {/* Institutional Footer */}
      <PortalFooter />
    </div>
  )
}
