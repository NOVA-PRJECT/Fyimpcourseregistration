'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import styles from './login.module.css'

export default function LoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  function validate() {
    const errors: { email?: string; password?: string } = {}
    if (!email) errors.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(email)) errors.email = 'Invalid email address'
    if (!password) errors.password = 'Password is required'
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleLogin() {
    if (!validate()) return

    setLoading(true)
    setError('')

    try {
      // Step 1 — Sign in with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError || !authData.user) {
        setError('Invalid email or password. Please try again.')
        setLoading(false)
        return
      }

      // Step 2 — Call route-user API to determine role and get redirect
      const response = await fetch('/api/auth/route-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auth_user_id: authData.user.id }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError('Account not recognized. Please contact your administrator.')
        setLoading(false)
        return
      }

      // Step 3 — Redirect to correct dashboard
      router.push(data.redirectTo)

    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className={styles.pageWrapper}>

      <div className={styles.card}>

        {/* Card Header */}
        <div className={styles.cardHeader}>
          <div className={styles.logoWrapper}>
            <Image
              src="/logo.png"
              alt="Kannur University"
              width={48}
              height={48}
              className={styles.logo}
            />
          </div>
          <p className={styles.universityName}>Kannur University</p>
          <h1 className={styles.portalTitle}>
            FYIMP Registration Portal
          </h1>
          <div className={styles.goldLine} />
        </div>

        {/* Card Body */}
        <div className={styles.cardBody}>

          <p className={styles.formTitle}>Sign In</p>

          {/* Global Error */}
          {error && (
            <div className={styles.errorBanner}>
              {error}
            </div>
          )}

          {/* Form Fields */}
          <div className={styles.fieldGroup}>

            <div className={styles.field}>
              <label className={styles.label}>Email Address</label>
              <input
                type="email"
                className={`${styles.input} ${fieldErrors.email ? styles.inputError : ''}`}
                placeholder="your@email.com"
                value={email}
                onChange={e => {
                  setEmail(e.target.value)
                  setFieldErrors(prev => ({ ...prev, email: undefined }))
                }}
                autoComplete="email"
                inputMode="email"
              />
              {fieldErrors.email && (
                <p className={styles.errorMsg}>{fieldErrors.email}</p>
              )}
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Password</label>
              <input
                type="password"
                className={`${styles.input} ${fieldErrors.password ? styles.inputError : ''}`}
                placeholder="••••••••"
                value={password}
                onChange={e => {
                  setPassword(e.target.value)
                  setFieldErrors(prev => ({ ...prev, password: undefined }))
                }}
                autoComplete="current-password"
              />
              {fieldErrors.password && (
                <p className={styles.errorMsg}>{fieldErrors.password}</p>
              )}
            </div>

          </div>

          {/* Submit */}
          <button
            className={styles.submitBtn}
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className={styles.spinner} />
                Signing in...
              </>
            ) : (
              'Sign In →'
            )}
          </button>

          {/* Divider */}
          <div className={styles.divider}>
            <div className={styles.dividerLine} />
            <span className={styles.dividerText}>New Student?</span>
            <div className={styles.dividerLine} />
          </div>

          {/* Signup Link */}
          <p className={styles.signupLink}>
            Claim your account{' '}
            <Link href="/signup">here →</Link>
          </p>

        </div>
      </div>

      {/* Footer */}
      <p className={styles.footer}>
        © 2026 Kannur University • Internal Systems Division
      </p>

    </div>
  )
}
