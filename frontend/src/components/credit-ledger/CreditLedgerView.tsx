'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import styles from '@/app/dashboard/student/credits/credit-ledger.module.css'

interface CategoryItem {
  category: string
  title: string
  earned: number
  min3Year: number
  min4Year: number
  shortfall3Year: number
  shortfall4Year: number
  isMet3Year: boolean
  isMet4Year: boolean
}

interface LevelBandItem {
  band: string
  title: string
  earned: number
  minimum: number
  shortfall: number
  isMet: boolean
}

interface DeptItem {
  departmentId: string
  departmentName: string
  earned: number
  count: number
}

interface ExitMilestone {
  title: string
  eligible: boolean
  totalCredits: number
  requiredCredits: number
  totalShortfall: number
  unmetCategories: string[]
  unmetBands: string[]
  primaryShortfall: string
}

interface CreditLedgerData {
  student: {
    id: string
    fullName: string
    capApplicationNumber: string
    currentSemester: number
    academicYearJoined: string
    departmentName: string
    departmentCode: string
    campusName: string
  }
  totalCredits: number
  categories: CategoryItem[]
  levelBands: LevelBandItem[]
  byDepartment: DeptItem[]
  exitEligibility: {
    threeYear: ExitMilestone
    fourYear: ExitMilestone
    fiveYear: ExitMilestone
  }
  registeredCourses: Array<{
    id: string
    courseCode: string
    title: string
    credits: number
    category: string
    normalizedCategory: string
    levelBand: string
    departmentName: string
    semester: number
  }>
}

interface CreditLedgerViewProps {
  studentId?: string
  backHref?: string
  backLabel?: string
}

export default function CreditLedgerView({
  studentId,
  backHref = '/dashboard/student',
  backLabel = 'Back to Dashboard',
}: CreditLedgerViewProps) {
  const [data, setData] = useState<CreditLedgerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchLedger = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const endpoint = studentId && studentId !== 'me'
        ? `/api/credit-ledger/${studentId}`
        : '/api/credit-ledger/me'

      const res = await fetch(endpoint)
      const json = await res.json()

      if (!res.ok) {
        setError(json.message || 'Failed to load credit ledger.')
        setLoading(false)
        return
      }

      setData(json)
    } catch (err: any) {
      setError(err.message || 'Network error fetching credit ledger.')
    } finally {
      setLoading(false)
    }
  }, [studentId])

  useEffect(() => {
    fetchLedger()
  }, [fetchLedger])

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner} />
          <p>Calculating degree credit ledger from KU-FYIMP regulations...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className={styles.container}>
        <div className={styles.errorContainer}>
          <p style={{ color: '#be123c', fontWeight: 600 }}>{error || 'Unable to load credit ledger.'}</p>
          <button onClick={fetchLedger} className={styles.backBtn}>
            Try Again
          </button>
        </div>
      </div>
    )
  }

  const { student, totalCredits, categories, levelBands, byDepartment, exitEligibility, registeredCourses } = data

  return (
    <div className={styles.container}>
      {/* Top Header Bar */}
      <header className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <Link href={backHref} className={styles.backBtn}>
            ← {backLabel}
          </Link>
          <div className={styles.titleGroup}>
            <h1>KU-FYIMP Credit Accumulation Ledger</h1>
            <p>Degree audit view per Calicut University Four-Year Undergraduate Programme Regulation 2024</p>
          </div>
        </div>
      </header>

      <main className={styles.contentWrapper}>
        {/* Section 1: Student Profile Banner */}
        <section className={styles.studentBanner}>
          <div className={styles.studentMeta}>
            <h2>{student.fullName}</h2>
            <div className={styles.studentDetails}>
              <span>🎓 CAP ID: <strong>{student.capApplicationNumber || 'N/A'}</strong></span>
              <span>🏛️ Dept: <strong>{student.departmentName}</strong></span>
              <span>📍 Campus: <strong>{student.campusName}</strong></span>
              <span>📅 Current: <strong>Semester {student.currentSemester}</strong></span>
              <span>🗓️ Cohort: <strong>{student.academicYearJoined}</strong></span>
            </div>
          </div>
          <div className={styles.totalCreditsBox}>
            <div className={styles.totalCreditsLabel}>Total Credits Earned</div>
            <div className={styles.totalCreditsValue}>{totalCredits}</div>
          </div>
        </section>

        {/* Section 2: Exit Eligibility Indicators (3-Year / 4-Year / 5-Year) */}
        <section>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Exit Point Eligibility Milestones</h2>
              <p className={styles.sectionSub}>Structured evaluation against regulation credit and band thresholds</p>
            </div>
          </div>
          <div className={styles.exitBadgesGrid}>
            {/* 3-Year UG Exit */}
            <div className={`${styles.exitBadgeCard} ${exitEligibility.threeYear.eligible ? styles.eligible : styles.ineligible}`}>
              <div>
                <div className={styles.exitHeader}>
                  <h3 className={styles.exitTitle}>3-Year UG Exit</h3>
                  <span className={`${styles.exitStatusPill} ${exitEligibility.threeYear.eligible ? styles.eligible : styles.ineligible}`}>
                    {exitEligibility.threeYear.eligible ? '✓ Eligible' : '✗ Ineligible'}
                  </span>
                </div>
                <p className={styles.exitTargetText}>
                  Requires <strong>133 Credits</strong> + 100s/200s/300s & Category bounds
                </p>
              </div>

              <div className={`${styles.shortfallCallout} ${exitEligibility.threeYear.eligible ? styles.eligible : styles.ineligible}`}>
                <div>{exitEligibility.threeYear.primaryShortfall}</div>
                {exitEligibility.threeYear.unmetCategories.length > 0 && (
                  <ul className={styles.shortfallDetailsList}>
                    {exitEligibility.threeYear.unmetCategories.map((item, idx) => (
                      <li key={idx}>Needs {item}</li>
                    ))}
                  </ul>
                )}
                {exitEligibility.threeYear.unmetBands.length > 0 && (
                  <ul className={styles.shortfallDetailsList}>
                    {exitEligibility.threeYear.unmetBands.map((item, idx) => (
                      <li key={idx}>Level Band {item}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* 4-Year Honours Exit */}
            <div className={`${styles.exitBadgeCard} ${exitEligibility.fourYear.eligible ? styles.eligible : styles.ineligible}`}>
              <div>
                <div className={styles.exitHeader}>
                  <h3 className={styles.exitTitle}>4-Year Honours Exit</h3>
                  <span className={`${styles.exitStatusPill} ${exitEligibility.fourYear.eligible ? styles.eligible : styles.ineligible}`}>
                    {exitEligibility.fourYear.eligible ? '✓ Eligible' : '✗ Ineligible'}
                  </span>
                </div>
                <p className={styles.exitTargetText}>
                  Requires <strong>177 Credits</strong> + 400s Level & 12cr Research Project
                </p>
              </div>

              <div className={`${styles.shortfallCallout} ${exitEligibility.fourYear.eligible ? styles.eligible : styles.ineligible}`}>
                <div>{exitEligibility.fourYear.primaryShortfall}</div>
                {exitEligibility.fourYear.unmetCategories.length > 0 && (
                  <ul className={styles.shortfallDetailsList}>
                    {exitEligibility.fourYear.unmetCategories.map((item, idx) => (
                      <li key={idx}>Needs {item}</li>
                    ))}
                  </ul>
                )}
                {exitEligibility.fourYear.unmetBands.length > 0 && (
                  <ul className={styles.shortfallDetailsList}>
                    {exitEligibility.fourYear.unmetBands.map((item, idx) => (
                      <li key={idx}>Level Band {item}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* 5-Year Integrated PG Exit */}
            <div className={`${styles.exitBadgeCard} ${exitEligibility.fiveYear.eligible ? styles.eligible : styles.ineligible}`}>
              <div>
                <div className={styles.exitHeader}>
                  <h3 className={styles.exitTitle}>5-Year Integrated PG</h3>
                  <span className={`${styles.exitStatusPill} ${exitEligibility.fiveYear.eligible ? styles.eligible : styles.ineligible}`}>
                    {exitEligibility.fiveYear.eligible ? '✓ Eligible' : '✗ Ineligible'}
                  </span>
                </div>
                <p className={styles.exitTargetText}>
                  Requires <strong>217 Credits</strong> + 500s PG Band ($\ge 40$ cr)
                </p>
              </div>

              <div className={`${styles.shortfallCallout} ${exitEligibility.fiveYear.eligible ? styles.eligible : styles.ineligible}`}>
                <div>{exitEligibility.fiveYear.primaryShortfall}</div>
                {exitEligibility.fiveYear.unmetBands.length > 0 && (
                  <ul className={styles.shortfallDetailsList}>
                    {exitEligibility.fiveYear.unmetBands.map((item, idx) => (
                      <li key={idx}>Level Band {item}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Category Breakdown Table */}
        <section className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Curricular Category Breakdown</h2>
              <p className={styles.sectionSub}>Regulation minimums per KU-FYIMP 2024 Annexure</p>
            </div>
          </div>

          <div className={styles.tableResponsive}>
            <table className={styles.ledgerTable}>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Earned Credits</th>
                  <th>3-Year Min</th>
                  <th>4-Year Min</th>
                  <th>3-Year Status</th>
                  <th>4-Year Status</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr key={cat.category}>
                    <td>
                      <strong>{cat.title}</strong>
                    </td>
                    <td>
                      <strong style={{ fontSize: '1rem', color: '#0f172a' }}>{cat.earned}</strong>
                    </td>
                    <td>{cat.min3Year > 0 ? cat.min3Year : '—'}</td>
                    <td>{cat.min4Year > 0 ? cat.min4Year : '—'}</td>
                    <td>
                      {cat.min3Year === 0 ? (
                        <span className={`${styles.statusTag} ${styles.info}`}>Not required</span>
                      ) : cat.isMet3Year ? (
                        <span className={`${styles.statusTag} ${styles.met}`}>✓ Met</span>
                      ) : (
                        <span className={`${styles.statusTag} ${styles.shortfall}`}>
                          -{cat.shortfall3Year} cr
                        </span>
                      )}
                    </td>
                    <td>
                      {cat.min4Year === 0 ? (
                        <span className={`${styles.statusTag} ${styles.info}`}>Not required</span>
                      ) : cat.isMet4Year ? (
                        <span className={`${styles.statusTag} ${styles.met}`}>✓ Met</span>
                      ) : (
                        <span className={`${styles.statusTag} ${styles.shortfall}`}>
                          -{cat.shortfall4Year} cr
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 4: Level Band Breakdown Table */}
        <section className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Course Level Band Distribution</h2>
              <p className={styles.sectionSub}>Derived from course code numeric prefixes (Section 13.2)</p>
            </div>
          </div>

          <div className={styles.tableResponsive}>
            <table className={styles.ledgerTable}>
              <thead>
                <tr>
                  <th>Level Band</th>
                  <th>Prefix Rule</th>
                  <th>Earned Credits</th>
                  <th>Regulation Bound</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {levelBands.map((band) => (
                  <tr key={band.band}>
                    <td>
                      <strong>{band.title}</strong> ({band.band})
                    </td>
                    <td>
                      <code>First digit: {band.band.charAt(0)}</code>
                    </td>
                    <td>
                      <strong style={{ fontSize: '1rem', color: '#0f172a' }}>{band.earned}</strong>
                    </td>
                    <td>Min {band.minimum} Credits</td>
                    <td>
                      {band.isMet ? (
                        <span className={`${styles.statusTag} ${styles.met}`}>✓ Met</span>
                      ) : (
                        <span className={`${styles.statusTag} ${styles.shortfall}`}>
                          -{band.shortfall} credits short
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 5: Department Distribution Grid */}
        <section className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Credits Earned by Academic Department</h2>
              <p className={styles.sectionSub}>Informational distribution for pathway mapping and advisory tracking</p>
            </div>
          </div>

          <div className={styles.deptGrid}>
            {byDepartment.length > 0 ? (
              byDepartment.map((dept) => (
                <div key={dept.departmentId} className={styles.deptCard}>
                  <div>
                    <div className={styles.deptName}>{dept.departmentName}</div>
                    <div className={styles.deptCount}>{dept.count} {dept.count === 1 ? 'course' : 'courses'} registered</div>
                  </div>
                  <div className={styles.deptCredits}>{dept.earned} <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>CR</span></div>
                </div>
              ))
            ) : (
              <p style={{ color: '#64748b' }}>No course registrations recorded.</p>
            )}
          </div>
        </section>

        {/* Section 6: Registered Papers Audit Grid */}
        <section className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Registered Courses Audit Log</h2>
              <p className={styles.sectionSub}>Complete inventory of papers evaluated for this credit ledger</p>
            </div>
          </div>

          <div className={styles.tableResponsive}>
            <table className={styles.ledgerTable}>
              <thead>
                <tr>
                  <th>Sem</th>
                  <th>Code</th>
                  <th>Course Title</th>
                  <th>Category</th>
                  <th>Band</th>
                  <th>Department</th>
                  <th>Credits</th>
                </tr>
              </thead>
              <tbody>
                {registeredCourses.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <span className={`${styles.statusTag} ${styles.info}`}>Sem {c.semester}</span>
                    </td>
                    <td>
                      <code style={{ fontWeight: 700, color: '#1e3a8a' }}>{c.courseCode}</code>
                    </td>
                    <td>{c.title}</td>
                    <td>{c.normalizedCategory}</td>
                    <td>{c.levelBand}</td>
                    <td>{c.departmentName}</td>
                    <td>
                      <strong>{c.credits}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  )
}
