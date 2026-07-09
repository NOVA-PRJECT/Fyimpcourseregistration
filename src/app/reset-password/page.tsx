'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { getSupabaseBrowserClient } from '@/core/database/supabaseBrowserClient'
import styles from './reset-password.module.css'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const supabase = getSupabaseBrowserClient()

  async function handleReset() {
    if (!email) { setError('Please enter your email address'); return }
    if (!/\S+@\S+\.\S+/.test(email)) { setError('Please enter a valid email address'); return }

    setLoading(true)
    setError('')

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password/confirm`,
    })

    if (resetError) {
      setError('Failed to send reset email. Please try again.')
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.card}>

        {/* Header */}
        <div className={styles.cardHeader}>
          <div className={styles.logoWrapper}>
            <Image src="/logo.png" alt="Kannur University" width={40} height={40} className={styles.logo} />
          </div>
          <h1 className={styles.portalTitle}>FYIMP Registration Portal</h1>
          <div className={styles.goldLine} />
        </div>

        {/* Body */}
        <div className={styles.cardBody}>

          {!sent ? (
            <>
              <p className={styles.formTitle}>Reset Password</p>
              <p className={styles.formSubtitle}>
                Enter your registered email address. We will send you a link to reset your password.
              </p>

              {error && <div className={styles.errorBanner}>{error}</div>}

              <div className={styles.field}>
                <label className={styles.label}>Email Address</label>
                <input
                  type="email"
                  className={styles.input}
                  placeholder="your@email.com"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError('') }}
                  inputMode="email"
                  autoComplete="email"
                />
              </div>

              <button
                className={styles.submitBtn}
                onClick={handleReset}
                disabled={loading}
              >
                {loading ? (
                  <><span className={styles.spinner} /> Sending...</>
                ) : (
                  'Send Reset Link →'
                )}
              </button>

              <p className={styles.backLink}>
                <Link href="/login">← Back to Login</Link>
              </p>
            </>
          ) : (
            <>
              {/* Success State */}
              <div className={styles.successIcon}>📬</div>
              <p className={styles.formTitle}>Check Your Email</p>
              <p className={styles.formSubtitle}>
                A password reset link has been sent to <strong>{email}</strong>.
                Open it on this device to set a new password.
              </p>
              <div className={styles.infoBanner}>
                The link expires in 1 hour. Check your spam folder if you don't see it.
              </div>
              <p className={styles.backLink}>
                <Link href="/login">← Back to Login</Link>
              </p>
            </>
          )}

        </div>
      </div>

      <p className={styles.footer}>
        © 2026 Kannur University • Internal Systems Division
      </p>
    </div>
  )
}
