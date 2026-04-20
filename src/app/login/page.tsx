'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
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
  if (!email) { setFieldErrors(prev => ({ ...prev, email: 'Email is required' })); return }
  if (!password) { setFieldErrors(prev => ({ ...prev, password: 'Password is required' })); return }

  setLoading(true)
  setError('')

  const result = await signIn('credentials', {
    email: email.toLowerCase().trim(),
    password,
    redirect: false,
  })

  if (result?.error) {
    setError('Invalid email or password')
    setLoading(false)
    return
  }

  // Get session to find role for redirect
  const { getSession } = await import('next-auth/react')
  const session = await getSession()
  const role = (session?.user as any)?.role

  const ROLE_DASHBOARD_MAP: Record<string, string> = {
    superadmin: '/dashboard/superadmin',
    campus_director: '/dashboard/director',
    hod: '/dashboard/hod',
    teaching_staff: '/dashboard/teacher',
    student: '/dashboard/student',
  }

  router.push(ROLE_DASHBOARD_MAP[role] ?? '/login')
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
          <p className={styles.forgotLink}>
            <Link href="/reset-password">Forgot password?</Link>
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
