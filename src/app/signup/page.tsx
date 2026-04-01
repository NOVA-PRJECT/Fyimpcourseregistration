'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import styles from './signup.module.css'

interface Department {
  id: string
  name: string
}

export default function SignupPage() {
  const router = useRouter()

  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingDepts, setLoadingDepts] = useState(true)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{
    full_name?: string
    email?: string
    password?: string
    confirm_password?: string
    department_id?: string
  }>({})

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [departmentId, setDepartmentId] = useState('')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Load departments on mount
  useEffect(() => {
    async function loadDepartments() {
      const { data } = await supabase
        .from('departments')
        .select('id, name')
        .order('name')

      if (data) setDepartments(data)
      setLoadingDepts(false)
    }
    loadDepartments()
  }, [])

  function validate() {
    const errors: typeof fieldErrors = {}
    if (!fullName.trim()) errors.full_name = 'Full name is required'
    if (!email) errors.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(email)) errors.email = 'Invalid email address'
    if (!password) errors.password = 'Password is required'
    else if (password.length < 8) errors.password = 'Password must be at least 8 characters'
    if (!confirmPassword) errors.confirm_password = 'Please confirm your password'
    else if (password !== confirmPassword) errors.confirm_password = 'Passwords do not match'
    if (!departmentId) errors.department_id = 'Please select your department'
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSignup() {
    if (!validate()) return

    setLoading(true)
    setError('')

    const response = await fetch('/api/students/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: fullName.trim(),
        email,
        password,
        department_id: departmentId,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      setError(data.error ?? 'Signup failed. Please try again.')
      setLoading(false)
      return
    }

    // Sign in automatically after signup
    await supabase.auth.signInWithPassword({ email, password })

    // Redirect to pending approval page
    router.push('/signup/pending')
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
              width={40}
              height={40}
              className={styles.logo}
            />
          </div>
          <h1 className={styles.portalTitle}>
            FYIMP Registration Portal
          </h1>
          <div className={styles.goldLine} />
        </div>

        {/* Card Body */}
        <div className={styles.cardBody}>

          <p className={styles.formTitle}>New Student Registration</p>
          <p className={styles.formSubtitle}>
            Create your account. Your HOD will verify and approve your request.
          </p>

          {error && <div className={styles.errorBanner}>{error}</div>}

          <div className={styles.fieldGroup}>

            <div className={styles.field}>
              <label className={styles.label}>Full Name</label>
              <input
                type="text"
                className={`${styles.input} ${fieldErrors.full_name ? styles.inputError : ''}`}
                placeholder="Your full name"
                value={fullName}
                onChange={e => {
                  setFullName(e.target.value)
                  setFieldErrors(prev => ({ ...prev, full_name: undefined }))
                }}
                autoComplete="name"
              />
              {fieldErrors.full_name && (
                <p className={styles.errorMsg}>{fieldErrors.full_name}</p>
              )}
            </div>

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
                inputMode="email"
                autoComplete="email"
              />
              {fieldErrors.email && (
                <p className={styles.errorMsg}>{fieldErrors.email}</p>
              )}
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Department</label>
              <select
                className={`${styles.input} ${fieldErrors.department_id ? styles.inputError : ''}`}
                value={departmentId}
                onChange={e => {
                  setDepartmentId(e.target.value)
                  setFieldErrors(prev => ({ ...prev, department_id: undefined }))
                }}
                disabled={loadingDepts}
              >
                <option value="">
                  {loadingDepts ? 'Loading departments...' : '— Select your department —'}
                </option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
              {fieldErrors.department_id && (
                <p className={styles.errorMsg}>{fieldErrors.department_id}</p>
              )}
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Password</label>
              <input
                type="password"
                className={`${styles.input} ${fieldErrors.password ? styles.inputError : ''}`}
                placeholder="Min. 8 characters"
                value={password}
                onChange={e => {
                  setPassword(e.target.value)
                  setFieldErrors(prev => ({ ...prev, password: undefined }))
                }}
                autoComplete="new-password"
              />
              {fieldErrors.password && (
                <p className={styles.errorMsg}>{fieldErrors.password}</p>
              )}
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Confirm Password</label>
              <input
                type="password"
                className={`${styles.input} ${fieldErrors.confirm_password ? styles.inputError : ''}`}
                placeholder="Repeat your password"
                value={confirmPassword}
                onChange={e => {
                  setConfirmPassword(e.target.value)
                  setFieldErrors(prev => ({ ...prev, confirm_password: undefined }))
                }}
                autoComplete="new-password"
              />
              {fieldErrors.confirm_password && (
                <p className={styles.errorMsg}>{fieldErrors.confirm_password}</p>
              )}
            </div>

          </div>

          <button
            className={styles.submitBtn}
            onClick={handleSignup}
            disabled={loading || loadingDepts}
          >
            {loading ? (
              <>
                <span className={styles.spinner} />
                Creating account...
              </>
            ) : (
              'Submit for Approval →'
            )}
          </button>

          <p className={styles.loginLink}>
            Already have an account?{' '}
            <Link href="/login">Sign in →</Link>
          </p>

        </div>
      </div>

      <p className={styles.footer}>
        © 2026 Kannur University • Internal Systems Division
      </p>

    </div>
  )
}
