'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import styles from './change-password.module.css'
import { useBfcacheGuard } from '@/core/hooks/useBfcacheGuard'
import PortalHeader from '@/components/portal/PortalHeader'
import PortalFooter from '@/components/portal/PortalFooter'
import {
  Eye,
  EyeOff,
  Lock,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  Circle,
  AlertCircle,
  LogOut,
  ArrowRight,
  Info,
} from 'lucide-react'

import {
  hasMinLength as checkMinLength,
  hasLetter as checkLetter,
  hasNumber as checkNumber,
  hasSpecial as checkSpecial,
  getPasswordLevel,
} from '@/core/validation/passwordValidation'

export default function ChangePasswordPage() {
  useBfcacheGuard()
  const router = useRouter()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{
    current_password?: string
    new_password?: string
    confirm_password?: string
  }>({})

  // Dynamic password validation rules from shared module
  const hasMinLength = checkMinLength(newPassword)
  const hasLetter = checkLetter(newPassword)
  const hasNumber = checkNumber(newPassword)
  const hasSpecial = checkSpecial(newPassword)
  const passwordLevel = getPasswordLevel(newPassword)

  function validate() {
    const errors: typeof fieldErrors = {}
    if (!currentPassword) errors.current_password = 'Current password is required'
    if (!newPassword) errors.new_password = 'New password is required'
    else if (!hasMinLength) errors.new_password = 'Password must be at least 10 characters'
    else if (!hasLetter) errors.new_password = 'Password must contain at least one letter'
    else if (!hasNumber) errors.new_password = 'Password must contain at least one number'

    if (!confirmPassword) errors.confirm_password = 'Please confirm your new password'
    else if (newPassword !== confirmPassword) errors.confirm_password = 'Passwords do not match'

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/student/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error ?? data.message ?? 'Failed to update password. Please try again.')
        setLoading(false)
        return
      }

      // Clear any cached summary to force fresh fetch with must_change_password = false
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('fyimp_student_summary')
      }

      window.location.href = '/dashboard/student'
    } catch {
      setError('Network error updating password. Please check your connection.')
      setLoading(false)
    }
  }

  async function handleLogout() {
    setLoggingOut(true)
    if (typeof window !== 'undefined') {
      sessionStorage.clear()
      localStorage.clear()
    }
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  return (
    <div className={styles.pageWrapper}>
      {/* ── Official Institutional Portal Header ── */}
      <PortalHeader
        variant="none"
        rightAction={
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="text-xs font-medium px-3.5 py-1.5 border border-slate-200 hover:bg-slate-100 hover:text-slate-900 text-slate-600 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <LogOut size={13} />
            <span>{loggingOut ? 'Signing out...' : 'Sign Out'}</span>
          </button>
        }
      />

      {/* ── Central Main Card Container ── */}
      <main className={styles.mainContent}>
        <div className={styles.card}>
          {/* Card Header */}
          <div className={styles.cardHeader}>
            <div className={styles.logoWrapper}>
              <Image
                src="/knrunilogo.png"
                alt="Kannur University Crest"
                width={48}
                height={48}
                className={styles.logo}
                priority
              />
            </div>
            <p className={styles.universityName}>Kannur University</p>
            <h1 className={styles.title}>Update Your Password</h1>
            <p className={styles.subtitle}>
              Set a secure, permanent password for your student portal account.
            </p>
            <div className={styles.goldLine} />
          </div>

          {/* Card Body */}
          <div className={styles.cardBody}>
            {/* Information Notice */}
            <div className={styles.infoBanner}>
              <Info size={16} className="text-emerald-700 flex-shrink-0 mt-0.5" />
              <p className={styles.infoBannerText}>
                Your account was initiated with a temporary password. Once updated, you will use your new password for all future sign-ins.
              </p>
            </div>

            {/* Global Error Banner */}
            {error && (
              <div className={styles.errorBanner} role="alert">
                <AlertCircle size={16} className="text-red-700 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Password Form */}
            <form className={styles.form} onSubmit={handleSubmit} noValidate>
              {/* 1. Current Password */}
              <div className={styles.field}>
                <label className={styles.label} htmlFor="current-password">
                  Current Password
                </label>
                <div className={styles.inputWrapper}>
                  <span className={styles.leadingIcon}>
                    <KeyRound size={17} />
                  </span>
                  <input
                    id="current-password"
                    type={showCurrentPassword ? 'text' : 'password'}
                    className={`${styles.input} ${fieldErrors.current_password ? styles.inputError : ''}`}
                    placeholder="Enter current temporary password"
                    value={currentPassword}
                    onChange={(e) => {
                      setCurrentPassword(e.target.value)
                      if (fieldErrors.current_password) {
                        setFieldErrors((prev) => ({ ...prev, current_password: undefined }))
                      }
                    }}
                    autoComplete="current-password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className={styles.toggleBtn}
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}
                  >
                    {showCurrentPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                {fieldErrors.current_password && (
                  <p className={styles.fieldError}>{fieldErrors.current_password}</p>
                )}
              </div>

              {/* 2. New Password */}
              <div className={styles.field}>
                <label className={styles.label} htmlFor="new-password">
                  New Password
                </label>
                <div className={styles.inputWrapper}>
                  <span className={styles.leadingIcon}>
                    <Lock size={17} />
                  </span>
                  <input
                    id="new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    className={`${styles.input} ${fieldErrors.new_password ? styles.inputError : ''}`}
                    placeholder="Create a strong password"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value)
                      if (fieldErrors.new_password) {
                        setFieldErrors((prev) => ({ ...prev, new_password: undefined }))
                      }
                    }}
                    autoComplete="new-password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className={styles.toggleBtn}
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                  >
                    {showNewPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                {fieldErrors.new_password && (
                  <p className={styles.fieldError}>{fieldErrors.new_password}</p>
                )}
              </div>

              {/* Dynamic Password Level & Requirements Checklist */}
              {newPassword.length > 0 && passwordLevel && (
                <div className={styles.strengthSection}>
                  <div className={styles.strengthHeader}>
                    <span className={styles.strengthLabel}>Password Level</span>
                    <span
                      className={styles.strengthBadge}
                      style={{
                        color: passwordLevel.color,
                        backgroundColor: passwordLevel.bg,
                        borderColor: passwordLevel.border,
                      }}
                    >
                      {passwordLevel.label}
                    </span>
                  </div>

                  <div className={styles.requirementsList}>
                    <div className={`${styles.reqItem} ${hasMinLength ? styles.reqItemMet : ''}`}>
                      {hasMinLength ? (
                        <CheckCircle2 size={15} className={styles.reqIconMet} />
                      ) : (
                        <Circle size={15} className={styles.reqIconUnmet} />
                      )}
                      <span>At least 10 characters</span>
                    </div>
                    <div className={`${styles.reqItem} ${hasLetter ? styles.reqItemMet : ''}`}>
                      {hasLetter ? (
                        <CheckCircle2 size={15} className={styles.reqIconMet} />
                      ) : (
                        <Circle size={15} className={styles.reqIconUnmet} />
                      )}
                      <span>Contains at least one letter</span>
                    </div>
                    <div className={`${styles.reqItem} ${hasNumber ? styles.reqItemMet : ''}`}>
                      {hasNumber ? (
                        <CheckCircle2 size={15} className={styles.reqIconMet} />
                      ) : (
                        <Circle size={15} className={styles.reqIconUnmet} />
                      )}
                      <span>Contains at least one number</span>
                    </div>
                    <div className={`${styles.reqItem} ${hasSpecial ? styles.reqItemMet : ''}`}>
                      {hasSpecial ? (
                        <CheckCircle2 size={15} className={styles.reqIconMet} />
                      ) : (
                        <Circle size={15} className={styles.reqIconUnmet} />
                      )}
                      <span>Special symbol or character (for Strong)</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. Confirm Password */}
              <div className={styles.field}>
                <label className={styles.label} htmlFor="confirm-password">
                  Confirm New Password
                </label>
                <div className={styles.inputWrapper}>
                  <span className={styles.leadingIcon}>
                    <ShieldCheck size={17} />
                  </span>
                  <input
                    id="confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    className={`${styles.input} ${fieldErrors.confirm_password ? styles.inputError : ''}`}
                    placeholder="Re-enter your new password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value)
                      if (fieldErrors.confirm_password) {
                        setFieldErrors((prev) => ({ ...prev, confirm_password: undefined }))
                      }
                    }}
                    autoComplete="new-password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className={styles.toggleBtn}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                {fieldErrors.confirm_password && (
                  <p className={styles.fieldError}>{fieldErrors.confirm_password}</p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className={styles.submitBtn}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className={styles.spinner} />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <span>Save Password & Continue</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              {/* Secondary Action */}
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={handleLogout}
                disabled={loading || loggingOut}
              >
                <LogOut size={13} />
                <span>Cancel & Sign Out</span>
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* ── Official Institutional Portal Footer ── */}
      <PortalFooter />
    </div>
  )
}
