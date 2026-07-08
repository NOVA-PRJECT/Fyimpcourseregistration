'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import styles from './change-password.module.css'

export default function ChangePasswordPage() {
  const router = useRouter()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ new_password?: string; confirm_password?: string }>({})

  function validate() {
    const errors: typeof fieldErrors = {}
    if (!newPassword) errors.new_password = 'New password is required'
    else if (newPassword.length < 8) errors.new_password = 'Password must be at least 8 characters'
    else if (!/[A-Za-z]/.test(newPassword)) errors.new_password = 'Password must contain at least one letter'
    else if (!/[0-9]/.test(newPassword)) errors.new_password = 'Password must contain at least one number'
    if (!confirmPassword) errors.confirm_password = 'Please confirm your password'
    else if (newPassword !== confirmPassword) errors.confirm_password = 'Passwords do not match'
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    setError('')

    const response = await fetch('/api/student/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        new_password: newPassword,
        confirm_password: confirmPassword,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      setError(data.error ?? 'Failed to change password. Please try again.')
      setLoading(false)
      return
    }

    window.location.href = '/dashboard/student'
  }

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.glowTop} />

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.logoWrapper}>
            <Image src="/logo.png" alt="Kannur University" width={44} height={44} className={styles.logo} />
          </div>
          <h1 className={styles.title}>Set Your Password</h1>
          <p className={styles.subtitle}>
            Your account was created with a temporary password. Please set a new password to continue.
          </p>
          <div className={styles.goldLine} />
        </div>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          {error && <div className={styles.errorBanner}>{error}</div>}

          <div className={styles.field}>
            <label className={styles.label} htmlFor="new-password">New Password</label>
            <input
              id="new-password"
              type="password"
              className={`${styles.input} ${fieldErrors.new_password ? styles.inputError : ''}`}
              placeholder="Min. 8 characters, include a number"
              value={newPassword}
              onChange={e => {
                setNewPassword(e.target.value)
                setFieldErrors(prev => ({ ...prev, new_password: undefined }))
              }}
              autoComplete="new-password"
            />
            {fieldErrors.new_password && (
              <p className={styles.fieldError}>{fieldErrors.new_password}</p>
            )}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="confirm-password">Confirm Password</label>
            <input
              id="confirm-password"
              type="password"
              className={`${styles.input} ${fieldErrors.confirm_password ? styles.inputError : ''}`}
              placeholder="Repeat your new password"
              value={confirmPassword}
              onChange={e => {
                setConfirmPassword(e.target.value)
                setFieldErrors(prev => ({ ...prev, confirm_password: undefined }))
              }}
              autoComplete="new-password"
            />
            {fieldErrors.confirm_password && (
              <p className={styles.fieldError}>{fieldErrors.confirm_password}</p>
            )}
          </div>

          <div className={styles.requirements}>
            <p className={styles.reqTitle}>Password must:</p>
            <ul className={styles.reqList}>
              <li className={newPassword.length >= 8 ? styles.met : ''}>Be at least 8 characters</li>
              <li className={/[A-Za-z]/.test(newPassword) ? styles.met : ''}>Contain at least one letter</li>
              <li className={/[0-9]/.test(newPassword) ? styles.met : ''}>Contain at least one number</li>
            </ul>
          </div>

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={loading}
          >
            {loading ? <><span className={styles.spinner} /> Updating...</> : 'Set Password & Continue →'}
          </button>
        </form>
      </div>

      <p className={styles.footer}>
        © 2026 Kannur University • Internal Systems Division
      </p>
    </div>
  )
}
