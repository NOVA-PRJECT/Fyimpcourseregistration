// 'use client'
// 
// export const dynamic = 'force-dynamic'
// 
// import { useState, Suspense } from 'react'
// import Image from 'next/image'
// import Link from 'next/link'
// import { useRouter, useSearchParams } from 'next/navigation'
// import styles from '../reset-password.module.css'
// 
// function getPasswordStrength(password: string): 'weak' | 'medium' | 'strong' | null {
//   if (!password) return null;
//   if (password.length < 10) return 'weak';
// 
//   let score = 0;
//   if (/[A-Z]/.test(password)) score++;
//   if (/[a-z]/.test(password)) score++;
//   if (/[0-9]/.test(password)) score++;
//   if (/[^A-Za-z0-9]/.test(password)) score++;
// 
//   if (score === 4) return 'strong';
//   if (score === 3) return 'medium';
//   return 'weak';
// }
// 
// function ConfirmResetForm() {
//   const router = useRouter()
//   const searchParams = useSearchParams()
//   const code = searchParams.get('code')
// 
//   const [password, setPassword] = useState('')
//   const [confirmPassword, setConfirmPassword] = useState('')
//   const [loading, setLoading] = useState(false)
//   const [done, setDone] = useState(false)
//   const [error, setError] = useState('')
//   const [fieldErrors, setFieldErrors] = useState<{
//     password?: string
//     confirmPassword?: string
//   }>({})
// 
//   const validSession = !!code
// 
//   - validate() {
//     const errors: typeof fieldErrors = {}
//     if (!password) errors.password = 'Password is required'
//     else if (password.length < 10) errors.password = 'Password must be at least 10 characters'
//     else if (getPasswordStrength(password) === 'weak') errors.password = 'Password is too weak — add uppercase, numbers, or symbols'
//     if (!confirmPassword) errors.confirmPassword = 'Please confirm your password'
//     else if (password !== confirmPassword) errors.confirmPassword = 'Passwords do not match'
//     setFieldErrors(errors)
//     return Object.keys(errors).length === 0
//   }
// 
//   async function handleUpdatePassword() {
//     if (!validate()) return
// 
//     setLoading(true)
//     setError('')
// 
//     const response = await fetch('/api/auth/reset-password/confirm', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ code, new_password: password }),
//     })
// 
//     if (!response.ok) {
//       const data = await response.json()
//       setError(data.error || 'Failed to update password. The reset link may have expired. Please request a new one.')
//       setLoading(false)
//       return
//     }
// 
//     setDone(true)
//     setLoading(false)
//   }
// 
//   const strength = getPasswordStrength(password)
// 
//   // Invalid or expired link
//   if (!validSession) {
//     return (
//       <div className={styles.pageWrapper}>
//         <div className={styles.card}>
//           <div className={styles.cardHeader}>
//             <div className={styles.logoWrapper}>
//               <Image src="/logo.png" alt="Kannur University" width={40} height={40} className={styles.logo} />
//             </div>
//             <h1 className={styles.portalTitle}>FYIMP Registration Portal</h1>
//             <div className={styles.goldLine} />
//           </div>
//           <div className={styles.cardBody}>
//             <div className={styles.successIcon}>⚠️</div>
//             <p className={styles.formTitle}>Link Expired</p>
//             <p className={styles.formSubtitle}>
//               This password reset link is invalid or has expired. Reset links are valid for 1 hour.
//               Please request a new one.
//             </p>
//             <Link href="/reset-password" style={{
//               display: 'block',
//               width: '100%',
//               padding: '0.8rem',
//               background: '#002147',
//               color: '#ffffff',
//               textAlign: 'center',
//               borderRadius: '0.5rem',
//               textDecoration: 'none',
//               fontWeight: 700,
//               fontSize: '0.85rem',
//               marginBottom: '1rem',
//             }}>
//               Request New Link →
//             </Link>
//             <p className={styles.backLink}>
//               <Link href="/login">← Back to Login</Link>
//             </p>
//           </div>
//         </div>
//         <p className={styles.footer}>© 2026 Kannur University • Internal Systems Division</p>
//       </div>
//     )
//   }
// 
//   return (
//     <div className={styles.pageWrapper}>
//       <div className={styles.card}>
//         <div className={styles.cardHeader}>
//           <div className={styles.logoWrapper}>
//             <Image src="/logo.png" alt="Kannur University" width={40} height={40} className={styles.logo} />
//           </div>
//           <h1 className={styles.portalTitle}>FYIMP Registration Portal</h1>
//           <div className={styles.goldLine} />
//         </div>
// 
//         <div className={styles.cardBody}>
//           {!done ? (
//             <>
//               <p className={styles.formTitle}>Set New Password</p>
//               <p className={styles.formSubtitle}>
//                 Choose a strong password for your account.
//               </p>
// 
//               {error && <div className={styles.errorBanner}>{error}</div>}
// 
//               <div className={styles.field}>
//                 <label className={styles.label}>New Password</label>
//                 <input
//                   type="password"
//                   className={`${styles.input} ${fieldErrors.password ? styles.inputError : ''}`}
//                   placeholder="Min. 10 characters"
//                   value={password}
//                   onChange={e => {
//                     setPassword(e.target.value)
//                     setFieldErrors(prev => ({ ...prev, password: undefined }))
//                   }}
//                   autoComplete="new-password"
//                 />
//                 {password && (
//                   <>
//                     <div className={`${styles.strengthBar} ${
//                       strength === 'weak' ? styles.strengthWeak
//                       : strength === 'medium' ? styles.strengthMedium
//                       : strength === 'strong' ? styles.strengthStrong
//                       : ''
//                     }`} />
//                     <p className={`${styles.strengthLabel} ${strength ?? ''}`}>
//                       {strength === 'weak' ? 'Weak — add uppercase, numbers, lowercase, symbols'
//                         : strength === 'medium' ? 'Medium — almost there'
//                         : '✓ Strong password'}
//                     </p>
//                   </>
//                 )}
//                 {fieldErrors.password && (
//                   <p style={{ fontSize: '0.72rem', color: '#c0392b', margin: '0.2rem 0 0 0' }}>
//                     {fieldErrors.password}
//                   </p>
//                 )}
//               </div>
// 
//               <div className={styles.field} style={{ marginBottom: '1.25rem' }}>
//                 <label className={styles.label}>Confirm New Password</label>
//                 <input
//                   type="password"
//                   className={`${styles.input} ${fieldErrors.confirmPassword ? styles.inputError : ''}`}
//                   placeholder="Repeat your password"
//                   value={confirmPassword}
//                   onChange={e => {
//                     setConfirmPassword(e.target.value)
//                     setFieldErrors(prev => ({ ...prev, confirmPassword: undefined }))
//                   }}
//                   autoComplete="new-password"
//                 />
//                 {fieldErrors.confirmPassword && (
//                   <p style={{ fontSize: '0.72rem', color: '#c0392b', margin: '0.2rem 0 0 0' }}>
//                     {fieldErrors.confirmPassword}
//                   </p>
//                 )}
//               </div>
// 
//               <button
//                 className={styles.submitBtn}
//                 onClick={handleUpdatePassword}
//                 disabled={loading}
//               >
//                 {loading ? (
//                   <><span className={styles.spinner} /> Updating password...</>
//                 ) : (
//                   'Set New Password →'
//                 )}
//               </button>
// 
//               <p className={styles.backLink}>
//                 <Link href="/login">← Back to Login</Link>
//               </p>
//             </>
//           ) : (
//             <>
//               <div className={styles.successIcon}>✅</div>
//               <p className={styles.formTitle}>Password Updated</p>
//               <p className={styles.formSubtitle}>
//                 Your password has been changed successfully. You can now login with your new password.
//               </p>
//               <Link href="/login" style={{
//                 display: 'block',
//                 width: '100%',
//                 padding: '0.8rem',
//                 background: '#002147',
//                 color: '#ffffff',
//                 textAlign: 'center',
//                 borderRadius: '0.5rem',
//                 textDecoration: 'none',
//                 fontWeight: 700,
//                 fontSize: '0.85rem',
//                 textTransform: 'uppercase',
//                 letterSpacing: '0.05em',
//               }}>
//                 Login Now →
//               </Link>
//             </>
//           )}
//         </div>
//       </div>
//       <p className={styles.footer}>
//         © 2026 Kannur University • Internal Systems Division
//       </p>
//     </div>
//   )
// }
// 
// export default function ConfirmResetPage() {
//   return (
//     <Suspense fallback={
//       <div className={styles.pageWrapper}>
//         <div className={styles.card}>
//           <div className={styles.cardHeader}>
//             <div className={styles.logoWrapper}>
//               <Image src="/logo.png" alt="Kannur University" width={40} height={40} className={styles.logo} />
//             </div>
//             <h1 className={styles.portalTitle}>FYIMP Registration Portal</h1>
//             <div className={styles.goldLine} />
//           </div>
//           <div className={styles.cardBody} style={{ textAlign: 'center', padding: '2rem' }}>
//             <div className={styles.spinner} style={{ margin: '0 auto 1rem', borderTopColor: '#002147', borderColor: '#e2e5ea' }} />
//             <p style={{ fontSize: '0.82rem', color: '#9ba1ab', margin: 0 }}>Verifying reset link...</p>
//           </div>
//         </div>
//       </div>
//     }>
//       <ConfirmResetForm />
//     </Suspense>
//   )
// }

export default function ConfirmResetPage() {
  return null
}
