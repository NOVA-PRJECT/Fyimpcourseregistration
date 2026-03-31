'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import styles from './signup.module.css'

type Step = 1 | 2

interface StudentDetails {
  name: string
  email: string
  department_id: string
}

export default function SignupPage() {
  const router = useRouter()

  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [studentDetails, setStudentDetails] = useState<StudentDetails | null>(null)

  // Step 1 fields
  const [capNumber, setCapNumber] = useState('')
  const [dob, setDob] = useState('')
  const [step1Errors, setStep1Errors] = useState<{ capNumber?: string; dob?: string }>({})

  // Step 2 fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [step2Errors, setStep2Errors] = useState<{
    email?: string
    password?: string
    confirmPassword?: string
  }>({})

  // --- Step 1 Validation ---
  function validateStep1() {
    const errors: { capNumber?: string; dob?: string } = {}
    if (!capNumber.trim()) errors.capNumber = 'CAP number is required'
    if (!dob) errors.dob = 'Date of birth is required'
    setStep1Errors(errors)
    return Object.keys(errors).length === 0
  }

  // --- Step 2 Validation ---
  function validateStep2() {
    const errors: { email?: string; password?: string; confirmPassword?: string } = {}
    if (!email) errors.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(email)) errors.email = 'Invalid email address'
    if (!password) errors.password = 'Password is required'
    else if (password.length < 8) errors.password = 'Password must be at least 8 characters'
    if (!confirmPassword) errors.confirmPassword = 'Please confirm your password'
    else if (password !== confirmPassword) errors.confirmPassword = 'Passwords do not match'
    setStep2Errors(errors)
    return Object.keys(errors).length === 0
  }

  // --- API A: Check Eligibility ---
  async function handleVerify() {
    if (!validateStep1()) return

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/students/check-eligibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cap_number: capNumber.trim(),
          dob,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 404) {
          setError('No record found. Please check your CAP number and date of birth.')
        } else if (response.status === 409) {
          setError('This CAP number has already been claimed. Please login instead.')
        } else {
          setError('Verification failed. Please try again.')
        }
        setLoading(false)
        return
      }

      // Store student details and move to step 2
      setStudentDetails(data)
      setEmail(data.email ?? '')
      setStep(2)

    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // --- API B: Create Account ---
  async function handleCreateAccount() {
    if (!validateStep2()) return

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/students/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cap_number: capNumber.trim(),
          dob,
          email,
          password,
          confirm_password: confirmPassword,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error ?? 'Account creation failed. Please try again.')
        setLoading(false)
        return
      }

      // Success — redirect to login
      router.push('/login?registered=true')

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

        {/* Step Indicator */}
        <div className={styles.stepIndicator}>
          <div className={`${styles.step} ${step === 1 ? styles.active : styles.completed}`}>
            <div className={styles.stepDot}>
              {step > 1 ? '✓' : '1'}
            </div>
            Verify
          </div>
          <div className={styles.stepConnector} />
          <div className={`${styles.step} ${step === 2 ? styles.active : ''}`}>
            <div className={styles.stepDot}>2</div>
            Create Account
          </div>
        </div>

        {/* Card Body */}
        <div className={styles.cardBody}>

          {/* Global Error */}
          {error && (
            <div className={styles.errorBanner}>{error}</div>
          )}

          {/* ── STEP 1 ── */}
          {step === 1 && (
            <>
              <p className={styles.formTitle}>Verify Your Identity</p>
              <p className={styles.formSubtitle}>
                Enter your CAP application number and date of birth to claim your account.
              </p>

              <div className={styles.fieldGroup}>

                <div className={styles.field}>
                  <label className={styles.label}>CAP Application Number</label>
                  <input
                    type="text"
                    className={`${styles.input} ${step1Errors.capNumber ? styles.inputError : ''}`}
                    placeholder="e.g. 12345"
                    value={capNumber}
                    onChange={e => {
                      setCapNumber(e.target.value)
                      setStep1Errors(prev => ({ ...prev, capNumber: undefined }))
                    }}
                    inputMode="numeric"
                  />
                  {step1Errors.capNumber && (
                    <p className={styles.errorMsg}>{step1Errors.capNumber}</p>
                  )}
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Date of Birth</label>
                  <input
                    type="date"
                    className={`${styles.input} ${step1Errors.dob ? styles.inputError : ''}`}
                    value={dob}
                    onChange={e => {
                      setDob(e.target.value)
                      setStep1Errors(prev => ({ ...prev, dob: undefined }))
                    }}
                  />
                  {step1Errors.dob && (
                    <p className={styles.errorMsg}>{step1Errors.dob}</p>
                  )}
                </div>

              </div>

              <button
                className={styles.submitBtn}
                onClick={handleVerify}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className={styles.spinner} />
                    Verifying...
                  </>
                ) : (
                  'Verify Identity →'
                )}
              </button>
            </>
          )}

          {/* ── STEP 2 ── */}
          {step === 2 && studentDetails && (
            <>
              <p className={styles.formTitle}>Create Your Account</p>

              {/* Confirmation Card */}
              <div className={styles.confirmCard}>
                <p className={styles.confirmLabel}>Verified Student</p>
                <p className={styles.confirmName}>{studentDetails.name}</p>
                <p className={styles.confirmDept}>FYIMP — Semester 1</p>
              </div>

              <div className={styles.fieldGroup}>

                <div className={styles.field}>
                  <label className={styles.label}>Email Address</label>
                  <input
                    type="email"
                    className={`${styles.input} ${step2Errors.email ? styles.inputError : ''}`}
                    placeholder="your@email.com"
                    value={email}
                    onChange={e => {
                      setEmail(e.target.value)
                      setStep2Errors(prev => ({ ...prev, email: undefined }))
                    }}
                    inputMode="email"
                    autoComplete="email"
                  />
                  {step2Errors.email && (
                    <p className={styles.errorMsg}>{step2Errors.email}</p>
                  )}
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Password</label>
                  <input
                    type="password"
                    className={`${styles.input} ${step2Errors.password ? styles.inputError : ''}`}
                    placeholder="Min. 8 characters"
                    value={password}
                    onChange={e => {
                      setPassword(e.target.value)
                      setStep2Errors(prev => ({ ...prev, password: undefined }))
                    }}
                    autoComplete="new-password"
                  />
                  {step2Errors.password && (
                    <p className={styles.errorMsg}>{step2Errors.password}</p>
                  )}
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Confirm Password</label>
                  <input
                    type="password"
                    className={`${styles.input} ${step2Errors.confirmPassword ? styles.inputError : ''}`}
                    placeholder="Repeat your password"
                    value={confirmPassword}
                    onChange={e => {
                      setConfirmPassword(e.target.value)
                      setStep2Errors(prev => ({ ...prev, confirmPassword: undefined }))
                    }}
                    autoComplete="new-password"
                  />
                  {step2Errors.confirmPassword && (
                    <p className={styles.errorMsg}>{step2Errors.confirmPassword}</p>
                  )}
                </div>

              </div>

              <button
                className={styles.submitBtn}
                onClick={handleCreateAccount}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className={styles.spinner} />
                    Creating account...
                  </>
                ) : (
                  'Create Account →'
                )}
              </button>

              <button
                className={styles.backBtn}
                onClick={() => {
                  setStep(1)
                  setError('')
                  setStudentDetails(null)
                }}
                disabled={loading}
              >
                ← Back
              </button>
            </>
          )}

          {/* Login Link */}
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
