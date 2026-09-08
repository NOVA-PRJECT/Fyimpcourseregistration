import Link from 'next/link'
import Footer from '@/component/Footer'
import styles from '../privacy-policy/privacy-policy.module.css'

export const metadata = {
  title: 'Terms of Use | FYIMP Kannur University',
  description: 'Terms of Use for the FYIMP Management System — Department of Information Technology, Kannur University.',
}

export default function TermsOfUsePage() {
  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <Link href="/" className={styles.logo}>
            <span className={styles.logoBadge}>FYIMP</span>
            <span className={styles.logoText}>Kannur University</span>
          </Link>
          <Link href="/login" className={styles.backButton}>
            ← Return to Portal
          </Link>
        </div>
      </header>

      <main className={styles.main}>
        <article className={styles.documentCard}>
          <div className={styles.docHeader}>
            <span className={styles.versionBadge}>Version 2026-09-08</span>
            <h1 className={styles.docTitle}>Terms of Use</h1>
            <p className={styles.docSubtitle}>
              FYIMP Management System — Department of Information Technology, Kannur University
            </p>
            <p style={{ fontSize: '0.8rem', color: '#71717a', marginTop: '0.35rem' }}>
              Effective date: September 8, 2026 • Last updated: September 8, 2026
            </p>
          </div>

          <div className={styles.divider} />

          <section className={styles.section}>
            <h2>1. Acceptance of these terms</h2>
            <p>
              By creating an account or otherwise using the FYIMP Management System (&quot;the System&quot;),
              you agree to these Terms of Use and the accompanying Privacy Policy. If you do not agree,
              please do not use the System.
            </p>
          </section>

          <section className={styles.section}>
            <h2>2. What this System is — and is not</h2>
            <p>
              The System is a coordination and management tool built to reduce manual administrative effort
              in running the FYIMP programme — course registration, timetabling, attendance tracking, and
              credit progress summaries.
            </p>
            <div className={`${styles.dataBlock} ${styles.highlightBlock}`}>
              <h3 style={{ color: '#f59e0b', marginBottom: '0.5rem' }}>⚠️ Official Academic Records Notice</h3>
              <p style={{ color: '#e4e4e7', fontWeight: 500, lineHeight: 1.6 }}>
                <strong>The System is not Kannur University&apos;s official academic records system.</strong> Official
                marks, grades, SGPA/CGPA, grade cards, and permanent academic records are maintained solely by
                the University&apos;s own systems. In the event of any discrepancy between this System and the
                University&apos;s official records, the University&apos;s official records govern.
              </p>
            </div>
          </section>

          <section className={styles.section}>
            <h2>3. Eligibility</h2>
            <p>
              Access to the System is limited to enrolled FYIMP students, teaching staff, Heads of Department,
              campus administrators, and other individuals formally associated with the FYIMP programme at
              Kannur University. Accounts are provisioned by the department or programme administration and are
              not self-registrable by the general public.
            </p>
          </section>

          <section className={styles.section}>
            <h2>4. Your account</h2>
            <ul>
              <li>
                You are responsible for keeping your login credentials confidential and for all activity under your account.
              </li>
              <li>
                Accounts are personal and non-transferable — you may not share your login with another person or use another person&apos;s account.
              </li>
              <li>
                If you suspect unauthorized access to your account, notify us immediately using the contact details in Section 9.
              </li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>5. Acceptable use</h2>
            <p>You agree not to:</p>
            <ul>
              <li>Attempt to sign in to campus attendance, or mark period attendance, on behalf of another person.</li>
              <li>Attempt to access data, courses, or records outside your assigned role or department.</li>
              <li>Attempt to interfere with, disrupt, or gain unauthorized access to the System or its underlying infrastructure.</li>
              <li>Submit false or misleading information through the System.</li>
              <li>Use the System for any purpose other than legitimate academic coordination within the FYIMP programme.</li>
            </ul>
            <p>
              Violation of this section may result in suspension or termination of your access, in addition to any
              other consequences under University policy or applicable law.
            </p>
          </section>

          <section className={styles.section}>
            <h2>6. Attendance and academic data accuracy</h2>
            <p>
              Attendance and coordination data recorded in the System reflects submissions made by faculty,
              students, and administrators through the System&apos;s normal operation. While reasonable care
              is taken in the System&apos;s design to keep this data accurate, the System is a coordination aid
              and does not replace the University&apos;s own attendance and academic verification processes where
              those are required (for example, for examination eligibility, which is determined by the University,
              not by this System).
            </p>
          </section>

          <section className={styles.section}>
            <h2>7. Availability and no warranty</h2>
            <p>
              The System is provided on an &quot;as available&quot; basis. As a coordination tool rather than the
              University&apos;s core infrastructure, occasional downtime, maintenance, or feature changes may occur.
              The System is provided without warranty of any kind, express or implied, to the fullest extent permitted
              by law.
            </p>
          </section>

          <section className={styles.section}>
            <h2>8. Changes to the System and these Terms</h2>
            <p>
              We may update, modify, or discontinue features of the System, and may revise these Terms from time
              to time. Material changes will be communicated to users where reasonably practicable. Continued use
              of the System after a change constitutes acceptance of the revised Terms.
            </p>
          </section>

          <section className={styles.section}>
            <h2>9. Contact</h2>
            <p>Questions about these Terms should be directed to:</p>
            <div className={styles.dataBlock}>
              <h3>Programme Coordinator / Systems In-Charge</h3>
              <p style={{ color: '#d4af37', marginBottom: '0.25rem' }}>
                <a href="mailto:itcentre@kannuruniversity.ac.in" style={{ color: 'inherit', textDecoration: 'underline' }}>
                  itcentre@kannuruniversity.ac.in
                </a>
              </p>
              <p>Department of Information Technology, Kannur University</p>
            </div>
          </section>

          <section className={styles.section}>
            <h2>10. Governing law</h2>
            <p>
              These Terms are governed by the laws of India.
            </p>
          </section>
        </article>
      </main>

      <Footer />
    </div>
  )
}
