'use client'

import { useState, useEffect, useCallback } from 'react'
import styles from './credit-ledger.module.css'

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
}

export const MASTER_FYIMP_CATEGORIES = [
  { category: 'DSC', title: 'Discipline Specific Core (DSC)', min3Year: 60, min4Year: 80 },
  { category: 'DSE', title: 'Discipline Specific Elective (DSE)', min3Year: 24, min4Year: 32 },
  { category: 'MDC', title: 'Multidisciplinary Course (MDC)', min3Year: 9, min4Year: 9 },
  { category: 'VAC', title: 'Value Addition Course (VAC)', min3Year: 6, min4Year: 6 },
  { category: 'SEC', title: 'Skill Enhancement Course (SEC)', min3Year: 9, min4Year: 9 },
  { category: 'AEC', title: 'Ability Enhancement Course (AEC)', min3Year: 9, min4Year: 9 },
  { category: 'MOC', title: 'Minor Open Elective (MOC)', min3Year: 8, min4Year: 12 },
  { category: 'MOOC', title: 'Massive Open Online Course (MOOC)', min3Year: 2, min4Year: 4 },
  { category: 'INT', title: 'Internship (INT)', min3Year: 4, min4Year: 4 },
  { category: 'RPH', title: 'Research Project / Honours (RPH)', min3Year: 0, min4Year: 12 },
  { category: 'FWD', title: 'Field Work / Dissertation (FWD)', min3Year: 0, min4Year: 4 },
  { category: 'DSS', title: 'Discipline Specific Skill (DSS)', min3Year: 6, min4Year: 6 },
  { category: 'DMP', title: 'Department Major Project (DMP)', min3Year: 0, min4Year: 8 },
  { category: 'CIP', title: 'Community Interaction (CIP)', min3Year: 2, min4Year: 2 },
]

export default function CreditLedgerView({
  studentId,
}: CreditLedgerViewProps) {
  const [data, setData] = useState<CreditLedgerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchLedger = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const baseEndpoint = studentId && studentId !== 'me'
        ? `/api/credit-ledger/${studentId}`
        : '/api/credit-ledger/me'
      const endpoint = `${baseEndpoint}?_t=${Date.now()}`

      const res = await fetch(endpoint, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      })
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

  const { totalCredits, categories, levelBands, byDepartment, registeredCourses } = data

  return (
    <div className={styles.container}>
      <main className={styles.contentWrapper}>
        {/* Unified Top Header Card (Merged Top Bar and Overview) */}
        <section className={styles.ledgerHeaderCard}>
          <div className={styles.ledgerHeaderLeft}>
            <h1 className={styles.ledgerHeaderTitle}>KU-FYIMP Credit Accumulation Ledger</h1>
            <p className={styles.ledgerHeaderSub}>
              Curricular progress evaluated against Calicut University FYIMP Regulation 2024
            </p>
          </div>
          <div className={styles.totalCreditsBox}>
            <div className={styles.totalCreditsLabel}>Total Credits Earned</div>
            <div className={styles.totalCreditsValue}>{totalCredits}</div>
          </div>
        </section>

        {/* Section 2: Curricular Category Breakdown (Circular Progress Loaders) */}
        <section className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Curricular Category Breakdown</h2>
              <p className={styles.sectionSub}>Credits earned across curricular categories with regulation targets</p>
            </div>
          </div>

          <div className={styles.circularGrid}>
            {(() => {
              const categoryList = MASTER_FYIMP_CATEGORIES.map((master) => {
                const existing = (categories || []).find(
                  (c) => (c.category || '').trim().toUpperCase() === master.category
                )
                if (existing) {
                  return existing
                }
                return {
                  category: master.category,
                  title: master.title,
                  earned: 0,
                  min3Year: master.min3Year,
                  min4Year: master.min4Year,
                  shortfall3Year: master.min3Year,
                  shortfall4Year: master.min4Year,
                  isMet3Year: master.min3Year === 0,
                  isMet4Year: master.min4Year === 0,
                }
              })

              return categoryList.map((cat) => {
                const target = cat.min4Year > 0 ? cat.min4Year : cat.min3Year > 0 ? cat.min3Year : Math.max(cat.earned, 1)
                const percentage = Math.min(100, Math.round((cat.earned / target) * 100))
                const radius = 38
                const circumference = 2 * Math.PI * radius
                const strokeDashoffset = circumference - (percentage / 100) * circumference

                const targetLabel = cat.min4Year > 0
                  ? `${cat.min4Year} cr (4-Yr)`
                  : cat.min3Year > 0
                  ? `${cat.min3Year} cr (3-Yr)`
                  : 'Core / Honours Track'

                return (
                  <div key={cat.category} className={styles.circularCard}>
                    <div className={styles.circleWrapper}>
                      <svg className={styles.circleSvg} viewBox="0 0 96 96">
                        <circle
                          className={styles.circleTrack}
                          cx="48"
                          cy="48"
                          r={radius}
                        />
                        <circle
                          className={styles.circleFill}
                          cx="48"
                          cy="48"
                          r={radius}
                          strokeDasharray={circumference}
                          strokeDashoffset={strokeDashoffset}
                        />
                      </svg>
                      <div className={styles.circleCenter}>
                        <span className={styles.circleCreditNum}>{cat.earned}</span>
                        <span className={styles.circleCreditUnit}>Credits</span>
                      </div>
                    </div>

                    <div className={styles.categoryCardMeta}>
                      <span className={styles.categoryCardCode}>{cat.category}</span>
                      <span className={styles.categoryTarget}>
                        Target: {targetLabel}
                      </span>
                    </div>
                  </div>
                )
              })
            })()}
          </div>
        </section>

        {/* Section 3: Level Band Breakdown Table */}
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
                      <strong style={{ fontSize: '1rem', color: '#0f172a' }}>{band.earned} Credits</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 4: Department Distribution Bar Graph */}
        <section className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Credits Earned by Academic Department</h2>
              <p className={styles.sectionSub}>Departmental credit distribution from registered coursework</p>
            </div>
          </div>

          {byDepartment.length > 0 ? (
            <div className={styles.barGraph}>
              {(() => {
                const maxCredits = Math.max(...byDepartment.map((d) => d.earned), 1)
                return byDepartment.map((dept) => {
                  const widthPercent = Math.max(6, Math.round((dept.earned / maxCredits) * 100))
                  return (
                    <div key={dept.departmentId} className={styles.barItem}>
                      <div className={styles.barHeader}>
                        <span className={styles.barDeptTitle}>{dept.departmentName}</span>
                        <span className={styles.barDeptMeta}>
                          {dept.count} {dept.count === 1 ? 'course' : 'courses'} registered
                        </span>
                      </div>
                      <div className={styles.barTrack}>
                        <div
                          className={styles.barFill}
                          style={{ width: `${widthPercent}%` }}
                        />
                        <span className={styles.barBadge}>{dept.earned} Credits</span>
                      </div>
                    </div>
                  )
                })
              })()}
            </div>
          ) : (
            <p className={styles.barEmpty}>No departmental course registrations recorded.</p>
          )}
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
                  <th>Department</th>
                  <th>Credits</th>
                </tr>
              </thead>
              <tbody>
                {registeredCourses.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <span className={`${styles.statusTag} ${styles.info}`}>{c.semester}</span>
                    </td>
                    <td>
                      <code style={{ fontWeight: 700, color: '#1e3a8a' }}>{c.courseCode}</code>
                    </td>
                    <td>{c.title}</td>
                    <td>{c.normalizedCategory}</td>
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
