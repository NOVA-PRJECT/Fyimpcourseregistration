import Link from 'next/link'
import Image from 'next/image'
import styles from './home.module.css'

export default function Home() {
  return (
    <div className={styles.pageWrapper}>

      {/* Background effects */}
      <div className={styles.glowTop} />
      <div className={styles.glowBottom} />

      {/* University Header */}
      <div className={styles.universityHeader}>
        <div className={styles.logoWrapper}>
          <Image
            src="/logo.png"
            alt="Kannur University"
            width={64}
            height={64}
            style={{ objectFit: 'contain' }}
          />
        </div>
        <h1 className={styles.universityName}>Kannur University</h1>
        <div className={styles.goldLine} />
      </div>

      {/* Main Card */}
      <div className={styles.card}>

        <h2 className={styles.portalTitle}>
          FYIMP Course Registration Portal
        </h2>
        <p className={styles.portalSubtitle}>
          Five Year Integrated Masters Programme
        </p>

        <div className={styles.divider} />

        {/* Info List */}
        <div className={styles.infoList}>
          <div className={styles.infoItem}>
            <div className={styles.infoDot} />
            <p className={styles.infoText}>
              Students — Semester course selection
            </p>
          </div>
          <div className={styles.infoItem}>
            <div className={styles.infoDot} />
            <p className={styles.infoText}>
              Faculty & HODs — Department management
            </p>
          </div>
          <div className={styles.infoItem}>
            <div className={styles.infoDot} />
            <p className={styles.infoText}>
              Administration — Campus oversight
            </p>
          </div>
        </div>

        {/* Login Button */}
        <Link href="/login" className={styles.loginBtn}>
          Login to Portal →
        </Link>



      </div>

      {/* Footer */}
      <p className={styles.footer}>
        © 2026 Kannur University • Internal Systems Division
      </p>

    </div>
  )
}
