import Link from 'next/link'
import Footer from '@/component/Footer'
import styles from './privacy-policy.module.css'

export const metadata = {
  title: 'Privacy Policy | FYIMP Kannur University',
  description: 'Privacy Policy and Data Protection Framework for the FYIMP Management System — Department of Information Technology, Kannur University.',
}

export default function PrivacyPolicyPage() {
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
            <h1 className={styles.docTitle}>Privacy Policy</h1>
            <p className={styles.docSubtitle}>
              FYIMP Management System — Department of Information Technology, Kannur University
            </p>
            <p style={{ fontSize: '0.8rem', color: '#71717a', marginTop: '0.35rem' }}>
              Effective date: September 8, 2026 • Last updated: September 8, 2026
            </p>
          </div>

          <div className={styles.divider} />

          <section className={styles.section}>
            <h2>1. What this document covers</h2>
            <p>
              This Privacy Policy explains what personal data the FYIMP Management System (&quot;the System&quot;)
              collects, why, how it is stored, and what rights you have over it.
            </p>
            <div className={`${styles.dataBlock} ${styles.highlightBlock}`}>
              <h3 style={{ color: '#f59e0b', marginBottom: '0.4rem' }}>⚠️ Academic Coordination Tool Notice</h3>
              <p style={{ color: '#e4e4e7', lineHeight: 1.6 }}>
                <strong>This System is a coordination and management tool.</strong> It is not Kannur
                University&apos;s official academic records system. Official marks, grades, SGPA/CGPA,
                and permanent academic records are maintained separately by the University. This System
                exists to reduce manual coordination effort for students, faculty, and department
                administration — for example, course registration, timetables, and attendance tracking.
              </p>
            </div>
          </section>

          <section className={styles.section}>
            <h2>2. Who this applies to</h2>
            <p>
              This System is intended for use by enrolled FYIMP students, teaching staff, Heads of
              Department, and campus administrators at Kannur University. It is not intended for the
              general public.
            </p>
            <p>
              If you are, or believe you may be, under 18 years of age, please see Section 8 (Children&apos;s
              Data) before using this System.
            </p>
          </section>

          <section className={styles.section}>
            <h2>3. What data we collect</h2>
            <div className={styles.tableWrapper}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th style={{ width: '25%' }}>Category</th>
                    <th style={{ width: '35%' }}>Examples</th>
                    <th style={{ width: '40%' }}>Why we collect it</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Identity information</strong></td>
                    <td>Name, registration number, department, campus</td>
                    <td>To identify your account and route you to the correct courses, timetable, and records</td>
                  </tr>
                  <tr>
                    <td><strong>Academic coordination data</strong></td>
                    <td>Course registrations, timetable assignments, declared credits</td>
                    <td>To manage registration and generate timetables</td>
                  </tr>
                  <tr>
                    <td><strong>Attendance data</strong></td>
                    <td>Present/absent status per class period; on-time/late/early-leave status for campus sign-in</td>
                    <td>To help faculty and HODs track attendance and produce attendance statements</td>
                  </tr>
                  <tr>
                    <td><strong>Account data</strong></td>
                    <td>Login email, authentication session</td>
                    <td>To secure your account and control access by role</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className={styles.section}>
            <h2>4. What we deliberately do NOT collect or store</h2>
            <div className={`${styles.dataBlock} ${styles.highlightBlock}`}>
              <h3 style={{ color: '#38bdf8' }}>📍 Zero GPS Location Storage</h3>
              <p style={{ color: '#f4f4f5', lineHeight: 1.6, marginTop: '0.4rem' }}>
                <strong>We do not store your GPS location.</strong> When you use campus sign-in, your device&apos;s
                location is sent to our server for a single, momentary check — confirming you are within campus
                grounds — and is never written to any database. It exists only for the instant it takes to verify
                your location, then it is discarded. We do not retain a history of where you have been.
              </p>
            </div>
            <ul>
              <li>
                <strong>Official Academic Marks:</strong> We do not store marks, grades, SGPA, CGPA, or any
                official academic record. Those exist only in the University&apos;s own systems.
              </li>
              <li>
                <strong>Sensitive Categories:</strong> We do not collect health information, financial
                information, or any sensitive category of data beyond what is listed in Section 3.
              </li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>5. How your data is used</h2>
            <p>
              Your data is used solely to operate the System&apos;s features: registration, timetabling,
              attendance tracking and reporting, and credit progress summaries. We do not use your data for
              advertising, do not sell it, and do not share it with any party outside the University except
              the infrastructure providers listed in Section 6.
            </p>
            <p>
              Aggregated, non-identifying data (such as the total number of sections or courses in a department)
              may be processed by third-party AI services solely to generate timetables automatically. This does
              not include your name, registration number, or attendance records.
            </p>
          </section>

          <section className={styles.section}>
            <h2>6. Where your data is stored</h2>
            <p>
              Your data is stored using Supabase, hosted on Amazon Web Services in the{' '}
              <strong>Mumbai (ap-south-1), India</strong> region. Your data resides within India.
            </p>
            <p>
              The System&apos;s backend infrastructure runs on Railway, and Upstash Redis is used for short-term
              technical caching (such as rate-limiting sign-in requests) — neither service stores your personal
              data beyond what is technically necessary to operate the System.
            </p>
          </section>

          <section className={styles.section}>
            <h2>7. How long we keep your data</h2>
            <p>
              This System retains attendance and coordination data only for as long as it is practically useful
              for its coordination purpose — not indefinitely, and not for the University&apos;s official
              long-term retention period. Long-term academic record retention is the responsibility of Kannur
              University&apos;s official systems, not this System.
            </p>
            <p>
              <strong>GPS location data is never retained at all</strong> (see Section 4).
            </p>
          </section>

          <section className={styles.section}>
            <h2>8. Children&apos;s data</h2>
            <p>
              FYIMP admission occurs shortly after higher secondary education, and some students may be under 18
              at the time of first use. If you are under 18, a parent or guardian should be aware that this System
              is used as part of your academic coordination at the University. If you have concerns about a minor&apos;s
              use of this System, please contact us using the details in Section 11.
            </p>
          </section>

          <section className={styles.section}>
            <h2>9. Your rights</h2>
            <p>You may:</p>
            <ul>
              <li><strong>Request access</strong> to the personal data we hold about you</li>
              <li><strong>Request correction</strong> of inaccurate data (for example, an incorrectly recorded attendance entry)</li>
              <li><strong>Request deletion</strong> of data we are not required to retain for the System&apos;s coordination purpose</li>
              <li><strong>Withdraw consent</strong> for optional data collection, understanding that this may limit some features (for example, campus sign-in requires a momentary location check to function)</li>
            </ul>
            <p>
              To exercise any of these rights, contact us using the details in Section 11. We will respond as
              promptly as we reasonably can.
            </p>
          </section>

          <section className={styles.section}>
            <h2>10. Security</h2>
            <p>
              We take reasonable technical measures to protect your data, including role-based access controls
              (you can only see data relevant to your own role — student, faculty, HOD, etc.) and secure,
              India-hosted infrastructure. No system can guarantee absolute security, and we encourage you to
              keep your login credentials confidential.
            </p>
          </section>

          <section className={styles.section}>
            <h2>11. Grievance and contact</h2>
            <p>
              If you have questions, concerns, or requests regarding your personal data, please contact:
            </p>
            <div className={styles.dataBlock}>
              <h3>Grievance Officer / Data Protection Lead</h3>
              <p style={{ color: '#d4af37', marginBottom: '0.25rem' }}>
                <a href="mailto:itcentre@kannuruniversity.ac.in" style={{ color: 'inherit', textDecoration: 'underline' }}>
                  itcentre@kannuruniversity.ac.in
                </a>
              </p>
              <p>Department of Information Technology, Kannur University</p>
            </div>
          </section>

          <section className={styles.section}>
            <h2>12. Changes to this policy</h2>
            <p>
              We may update this Privacy Policy as the System evolves. If a change meaningfully affects what
              data is collected or how it is used, we will notify users and may request renewed consent where
              appropriate.
            </p>
          </section>

          <section className={styles.section}>
            <h2>13. Governing law</h2>
            <p>
              This Policy is governed by the laws of India, including the Information Technology Act, 2000,
              and the Digital Personal Data Protection Act, 2023, as applicable.
            </p>
          </section>
        </article>
      </main>

      <Footer />
    </div>
  )
}
