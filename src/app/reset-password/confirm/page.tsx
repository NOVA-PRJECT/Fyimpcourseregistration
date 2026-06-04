import Link from 'next/link'
import Image from 'next/image'
import styles from '../reset-password.module.css'

export const dynamic = 'force-dynamic'

export default function ConfirmResetPage() {
  return (
    <div className={styles.pageWrapper}>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.logoWrapper}>
            <Image src="/logo.png" alt="Kannur University" width={40} height={40} className={styles.logo} />
          </div>
          <h1 className={styles.portalTitle}>FYIMP Registration Portal</h1>
          <div className={styles.goldLine} />
        </div>
        <div className={styles.cardBody}>
          <div className={styles.successIcon}>⚠️</div>
          <p className={styles.formTitle}>Password Reset Disabled</p>
          <p className={styles.formSubtitle}>
            Self-service password reset is currently unavailable. Please contact your department HOD to reset your password.
          </p>
          <p className={styles.backLink}>
            <Link href="/login">← Back to Login</Link>
          </p>
        </div>
      </div>
      <p className={styles.footer}>
        © 2026 Kannur University • Internal Systems Division
      </p>
    </div>
  )
}
