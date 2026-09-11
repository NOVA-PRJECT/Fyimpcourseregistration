import Link from 'next/link'
import Image from 'next/image'
import styles from './footer.module.css'

export default function Footer() {
  return (
    <footer className={styles.footerContainer}>
      <div className={styles.footerContent}>
        <div className={styles.left}>
          <Image src="/knrunilogo.png" alt="Kannur University" width={22} height={22} style={{ objectFit: 'contain', marginRight: '0.4rem', verticalAlign: 'middle', display: 'inline-block' }} />
          <span className={styles.brand}>FYIMP PORTAL</span>
          <span className={styles.dot}>•</span>
          <span className={styles.copy}>
            © {new Date().getFullYear()} Kannur University. All rights reserved.
          </span>
        </div>

        <div className={styles.links}>
          <Link href="/privacy-policy" className={styles.link}>
            Privacy Policy
          </Link>
          <span className={styles.separator}>|</span>
          <Link href="/terms-of-use" className={styles.link}>
            Terms of Use
          </Link>
        </div>
      </div>
    </footer>
  )
}
