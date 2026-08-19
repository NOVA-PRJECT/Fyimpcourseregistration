'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import styles from './timetable.module.css';

interface TimetableEntry {
  id: string;
  courseId: string;
  courseName: string;
  courseCode: string;
  departmentId: string;
  departmentName: string;
  day: number;
  period: number;
  startTime: string;
  endTime: string;
  isLabBlock: boolean;
  sessionType?: 'theory' | 'practical';
  status: string;
}

interface ConflictItem {
  id?: string;
  courseId: string;
  courseName: string;
  reason: string;
  conflictingStudentCount: number;
}

const DAYS_MAP: Record<number, string> = {
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
};

const PERIODS = [
  { num: 1, label: 'P1 (09:30 - 10:30)' },
  { num: 2, label: 'P2 (10:30 - 11:30)' },
  { num: 3, label: 'P3 (11:30 - 12:30)' },
  { num: 4, label: 'P4 (13:30 - 14:30)' },
  { num: 5, label: 'P5 (14:30 - 15:30)' },
  { num: 6, label: 'P6 (15:30 - 16:30)' },
];

export default function CampusDirectorTimetablePage() {
  const router = useRouter();

  const [academicYear, setAcademicYear] = useState('2026-27');
  const [semester, setSemester] = useState(1);
  const [registrationClosed, setRegistrationClosed] = useState(true);

  // Job status state
  const [jobStatus, setJobStatus] = useState<'idle' | 'queued' | 'running' | 'completed' | 'failed'>('idle');
  const [jobProgress, setJobProgress] = useState(0);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobError, setJobError] = useState<string | null>(null);
  const [stepMessage, setStepMessage] = useState<string | null>(null);
  const [jobStats, setJobStats] = useState<Record<string, any> | null>(null);

  // Timetable data state
  const [allEntries, setAllEntries] = useState<TimetableEntry[]>([]);
  const [allConflicts, setAllConflicts] = useState<ConflictItem[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string; code?: string }[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);

  // Export Modal state (completely separated from UI selectedDeptId)
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [exportType, setExportType] = useState<'excel' | 'pdf'>('excel');
  const [exportTargetDept, setExportTargetDept] = useState<string>('all');
  const [printTargetDept, setPrintTargetDept] = useState<string>('all');

  // Feedback banners
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const CACHE_KEY = `fyimp:timetable:${academicYear}:${semester}`;

  // Core fetch function with optional forceRefresh
  const fetchEntries = useCallback(
    async (forceRefresh = false) => {
      if (!academicYear || !semester) return;

      if (forceRefresh) {
        try {
          sessionStorage.removeItem(CACHE_KEY);
        } catch {
          /* ignore */
        }
      } else {
        // Try cache first
        try {
          const cached = sessionStorage.getItem(CACHE_KEY);
          if (cached) {
            const parsed = JSON.parse(cached);
            setAllEntries(parsed.entries ?? []);
            setAllConflicts(parsed.conflicts ?? []);
            setDepartments(parsed.departments ?? []);
            return;
          }
        } catch {
          // Cache read failed — proceed to fetch
        }
      }

      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/timetable/entries?academicYear=${academicYear}&semester=${semester}`);
        if (!res.ok) throw new Error(`Failed to load timetable (${res.status})`);
        const data = await res.json();

        const entriesList = data.entries ?? [];
        const conflictsList = data.conflicts ?? [];
        let deptList = data.departments ?? [];

        if (!deptList || deptList.length === 0) {
          const deptMap = new Map<string, string>();
          entriesList.forEach((e: TimetableEntry) => {
            if (e.departmentId) deptMap.set(e.departmentId, e.departmentName);
          });
          deptList = Array.from(deptMap.entries()).map(([id, name]) => ({ id, name }));
        }

        setAllEntries(entriesList);
        setAllConflicts(conflictsList);
        setDepartments(deptList);

        try {
          sessionStorage.setItem(
            CACHE_KEY,
            JSON.stringify({
              entries: entriesList,
              conflicts: conflictsList,
              departments: deptList,
            })
          );
        } catch {
          // sessionStorage write failed (quota) — continue without cache
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [academicYear, semester, CACHE_KEY]
  );

  // Invalidate cache and force fresh API fetch
  const invalidateCache = useCallback(() => {
    fetchEntries(true);
  }, [fetchEntries]);

  // Selector change effect: Reset banners & fetch job status for newly selected year/semester
  useEffect(() => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setJobError(null);
    setError(null);
    setJobStatus('idle');
    setJobProgress(0);
    setJobId(null);
    setStepMessage(null);
    setJobStats(null);

    if (!academicYear || !semester) return;

    fetch(`/api/timetable/job-status?academicYear=${academicYear}&semester=${semester}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.status && data.status !== 'idle') {
          setJobStatus(data.status);
          setJobProgress(data.progress || 0);
          if (data.stepMessage) setStepMessage(data.stepMessage);
          if (data.stats) setJobStats(data.stats);
          if (data.status === 'failed') {
            setJobError(data.errorMessage || data.error || 'Generation job failed');
          }
        }
      })
      .catch(() => {});
  }, [academicYear, semester]);

  // Single fetch on mount / selector change with sessionStorage cache
  useEffect(() => {
    fetchEntries(false);
  }, [fetchEntries]);

  // Set default selected department once data loads
  useEffect(() => {
    if (departments.length > 0 && (!selectedDeptId || !departments.some((d) => d.id === selectedDeptId))) {
      setSelectedDeptId(departments[0].id);
    } else if (allEntries.length > 0 && !selectedDeptId) {
      setSelectedDeptId(allEntries[0].departmentId);
    }
  }, [allEntries, departments, selectedDeptId]);

  // Poll job status when running or queued
  useEffect(() => {
    if (jobStatus !== 'running' && jobStatus !== 'queued') return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/timetable/job-status?academicYear=${academicYear}&semester=${semester}`);
        if (!res.ok) return;
        const data = await res.json();

        setJobStatus(data.status);
        setJobProgress(data.progress || 0);
        if (data.stepMessage) setStepMessage(data.stepMessage);
        if (data.stats) setJobStats(data.stats);

        if (data.status === 'completed') {
          clearInterval(interval);
          setSuccessMsg('Timetable generated successfully!');
          invalidateCache();
        } else if (data.status === 'failed') {
          clearInterval(interval);
          setJobError(data.errorMessage || data.error || 'Generation job failed');
        }
      } catch (err) {
        console.error('Job status polling error:', err);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [jobStatus, academicYear, semester, invalidateCache]);

  // Handle Generate Timetable
  async function handleGenerate() {
    setErrorMsg(null);
    setSuccessMsg(null);
    setJobError(null);

    try {
      const res = await fetch('/api/timetable/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ academicYear, semester }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to start timetable generation');
        return;
      }

      setJobId(data.jobId);
      setJobStatus('queued');
      setJobProgress(5);
    } catch {
      setErrorMsg('Network error starting timetable generation');
    }
  }

  // Open Export Modal for Excel or PDF (Default dropdown is ALWAYS 'all')
  function handleOpenExportModal(type: 'excel' | 'pdf') {
    setExportType(type);
    setExportTargetDept('all'); // Strictly 'all' under any circumstances!
    setShowExportModal(true);
  }

  // Confirm Export from Modal (Does NOT mutate UI active tab selectedDeptId!)
  function handleConfirmExport() {
    const targetDept = exportTargetDept;
    setShowExportModal(false);

    if (exportType === 'excel') {
      const wb = XLSX.utils.book_new();

      // Combine departments from state and allEntries
      const deptMap = new Map<string, { id: string; name: string; code: string }>();

      departments.forEach((d) => {
        deptMap.set(d.id, { id: d.id, name: d.name, code: d.code || d.name });
      });

      allEntries.forEach((e) => {
        if (e.departmentId && !deptMap.has(e.departmentId)) {
          deptMap.set(e.departmentId, {
            id: e.departmentId,
            name: e.departmentName || 'Department',
            code: e.departmentName || 'Dept',
          });
        }
      });

      const deptsToExport = targetDept === 'all'
        ? Array.from(deptMap.values())
        : Array.from(deptMap.values()).filter((d) => d.id === targetDept);

      const usedSheetNames = new Set<string>();
      function getUniqueSheetName(rawName: string): string {
        let clean = rawName.replace(/[:\\/?*\[\]]/g, '').trim().substring(0, 30);
        if (!clean) clean = 'Sheet';
        let unique = clean;
        let counter = 1;
        while (usedSheetNames.has(unique.toLowerCase())) {
          const suffix = `_${counter}`;
          unique = clean.substring(0, 30 - suffix.length) + suffix;
          counter++;
        }
        usedSheetNames.add(unique.toLowerCase());
        return unique;
      }

      // If exporting ALL, add All Departments Stacked Sheet first with 5 rows per department and 10 row gaps!
      if (targetDept === 'all') {
        const allSheetRows: string[][] = [
          ['KANNUR UNIVERSITY — ALL DEPARTMENTS TIMETABLE OVERVIEW'],
          [`Academic Year: ${academicYear} | Semester: ${semester}`],
          [],
        ];

        deptsToExport.forEach((dept, idx) => {
          const deptEntries = allEntries.filter((e) => e.departmentId === dept.id);

          // Department Banner Row
          allSheetRows.push([`DEPARTMENT: ${dept.name.toUpperCase()} (${dept.code || dept.name})`]);
          allSheetRows.push(['Day / Period', ...PERIODS.map((p) => p.label)]);

          // 5 Rows (Monday through Friday)
          [1, 2, 3, 4, 5].forEach((dayNum) => {
            const row: string[] = [DAYS_MAP[dayNum]];
            PERIODS.forEach((p) => {
              const entry = deptEntries.find((e) => e.day === dayNum && e.period === p.num);
              if (entry) {
                row.push(`${entry.courseCode} - ${entry.courseName}${entry.isLabBlock ? ' [LAB]' : ''}`);
              } else {
                row.push('—');
              }
            });
            allSheetRows.push(row);
          });

          // Insert 10 blank rows as gap between departments
          if (idx < deptsToExport.length - 1) {
            for (let i = 0; i < 10; i++) {
              allSheetRows.push([]);
            }
          }
        });

        const allWs = XLSX.utils.aoa_to_sheet(allSheetRows);
        XLSX.utils.book_append_sheet(wb, allWs, getUniqueSheetName('All Departments'));
      }

      // Add 5x6 Matrix Sheet for each department
      deptsToExport.forEach((dept) => {
        const deptEntries = allEntries.filter((e) => e.departmentId === dept.id);
        const sheetData: string[][] = [
          [`KANNUR UNIVERSITY — ${dept.name.toUpperCase()} TIMETABLE`],
          [`Academic Year: ${academicYear} | Semester: ${semester}`],
          [],
          ['Day / Period', ...PERIODS.map((p) => p.label)],
        ];

        [1, 2, 3, 4, 5].forEach((dayNum) => {
          const row: string[] = [DAYS_MAP[dayNum]];
          PERIODS.forEach((p) => {
            const entry = deptEntries.find((e) => e.day === dayNum && e.period === p.num);
            if (entry) {
              row.push(`${entry.courseCode} - ${entry.courseName}${entry.isLabBlock ? ' [LAB]' : ''}`);
            } else {
              row.push('—');
            }
          });
          sheetData.push(row);
        });

        const ws = XLSX.utils.aoa_to_sheet(sheetData);
        const sheetName = getUniqueSheetName(dept.code || dept.name);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      });

      const selectedDeptObj = deptMap.get(targetDept);
      const fileTag = targetDept === 'all' ? 'All_Departments' : (selectedDeptObj?.code || selectedDeptObj?.name || 'Department');
      const filename = `FYIMP_Timetable_${fileTag}_${academicYear}_Sem${semester}.xlsx`;
      XLSX.writeFile(wb, filename);
    } else {
      // PDF Export: Set dedicated print scope without changing UI tab selectedDeptId!
      setPrintTargetDept(targetDept);
      setTimeout(() => {
        window.print();
      }, 150);
    }
  }

  // Derived client-side filtered entries for screen view
  const visibleEntries = allEntries.filter((e) => !selectedDeptId || e.departmentId === selectedDeptId);

  // Tab switch handler
  function handleDeptChange(deptId: string) {
    setSelectedDeptId(deptId);
  }

  // Helper to find entry at day + period
  function getEntryAt(day: number, period: number): TimetableEntry | undefined {
    return visibleEntries.find((e) => e.day === day && e.period === period);
  }

  const hasUnresolvedConflicts = allConflicts.length > 0;

  return (
    <div className={styles.pageWrapper}>
      {/* Top Navigation */}
      <div className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <Image src="/logo.png" alt="KU" width={28} height={28} />
          <div>
            <p className={styles.topBarTitle}>Timetable Management</p>
            <p className={styles.topBarSubtitle}>Campus Director Dashboard</p>
          </div>
        </div>
        <button className={styles.backBtn} onClick={() => router.push('/dashboard/director')}>
          ← Back to Dashboard
        </button>
      </div>

      <div className={styles.mainContent}>
        {/* Controls Card */}
        <div className={styles.headerCard}>
          <div className={styles.controlsRow}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Academic Year</label>
              <select
                className={styles.select}
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
              >
                <option value="2026-27">2026-27</option>
                <option value="2025-26">2025-26</option>
                <option value="2024-25">2024-25</option>
              </select>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Semester</label>
              <select
                className={styles.select}
                value={semester}
                onChange={(e) => setSemester(Number(e.target.value))}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((s) => (
                  <option key={s} value={s}>
                    Semester {s}
                  </option>
                ))}
              </select>
            </div>

            <button
              className={styles.generateBtn}
              onClick={handleGenerate}
              disabled={jobStatus === 'running' || jobStatus === 'queued'}
              title={
                !registrationClosed
                  ? 'Registration window must be closed before generation'
                  : 'Generate automated timetable'
              }
            >
              {jobStatus === 'running' || jobStatus === 'queued' ? 'Generating...' : '⚡ Generate Timetable'}
            </button>

            {allEntries.length > 0 && (
              <>
                <button
                  className={styles.exportExcelBtn}
                  onClick={() => handleOpenExportModal('excel')}
                  title="Export timetable as Excel workbook (.xlsx)"
                >
                  📊 Export Excel (.xlsx)
                </button>

                <button
                  className={styles.exportPdfBtn}
                  onClick={() => handleOpenExportModal('pdf')}
                  title="Export timetable as PDF"
                >
                  📄 Export PDF
                </button>
              </>
            )}
          </div>

          {/* Job Progress & GenAI Status Card */}
          {jobStatus !== 'idle' && (
            <div className={styles.aiJobCard}>
              <div className={styles.aiHeader}>
                <div className={styles.aiHeaderLeft}>
                  <div className={styles.aiIconWrapper}>
                    {jobStatus === 'running' || jobStatus === 'queued' ? (
                      <span className={styles.aiIconSpinner} style={{ display: 'inline-block' }}>✨</span>
                    ) : jobStatus === 'completed' ? (
                      <span>✓</span>
                    ) : (
                      <span>⚠️</span>
                    )}
                  </div>
                  <div>
                    <h4 className={styles.aiTitle}>
                      <span>AI Timetable Engine</span>
                      {(jobStatus === 'running' || jobStatus === 'queued') && (
                        <span style={{ fontSize: '0.68rem', color: '#818cf8', fontWeight: 600, background: 'rgba(99, 102, 241, 0.15)', padding: '0.1rem 0.45rem', borderRadius: '0.25rem' }}>
                          LIVE PROCESSING
                        </span>
                      )}
                    </h4>
                    <p className={styles.aiSubtitle}>
                      {jobStatus === 'completed' && (stepMessage || '🎉 Timetable generation complete! All department schedules placed.')}
                      {jobStatus === 'failed' && '❌ Generation interrupted due to scheduling constraints.'}
                      {(jobStatus === 'running' || jobStatus === 'queued') && (
                        stepMessage || (
                          jobProgress < 20
                            ? '🔍 Reading student registrations & department mappings...'
                            : jobProgress < 50
                            ? '⚡ Building multi-department student schedule conflict graph...'
                            : jobProgress < 80
                            ? '🧠 Solving optimal time slot allocations & 2-hour lab blocks...'
                            : '✨ Finalizing cross-department schedule entries & conflict log...'
                        )
                      )}
                    </p>
                  </div>
                </div>
                <div className={styles.aiPercentageBadge}>
                  {jobProgress}%
                </div>
              </div>

              {/* Progress track */}
              <div className={styles.aiProgressTrack}>
                <div className={styles.aiProgressFill} style={{ width: `${jobProgress}%` }} />
              </div>

              {/* Dynamic Step Badges */}
              <div className={styles.aiStepsContainer}>
                <div className={`${styles.aiStepPill} ${jobProgress >= 18 ? (jobProgress > 18 ? styles.aiStepDone : styles.aiStepActive) : ''}`}>
                  <span>{jobProgress > 18 ? '✓' : '1'}</span>
                  <span>
                    {jobStats?.registrationCount
                      ? `${jobStats.registrationCount} Regs | ${jobStats.courseCount || 0} Courses`
                      : 'Input Loaded'}
                  </span>
                </div>
                <div className={`${styles.aiStepPill} ${jobProgress >= 40 ? (jobProgress > 40 ? styles.aiStepDone : styles.aiStepActive) : ''}`}>
                  <span>{jobProgress > 40 ? '✓' : '2'}</span>
                  <span>
                    {jobStats?.conflictEdgesCount !== undefined
                      ? `${jobStats.conflictEdgesCount} Constraints`
                      : 'Conflict Graph'}
                  </span>
                </div>
                <div className={`${styles.aiStepPill} ${jobProgress >= 75 ? (jobProgress > 75 ? styles.aiStepDone : styles.aiStepActive) : ''}`}>
                  <span>{jobProgress > 75 ? '✓' : '3'}</span>
                  <span>
                    {jobStats?.totalHours
                      ? `${jobStats.placedHours || 0}/${jobStats.totalHours} Hours`
                      : 'Slots Allocated'}
                  </span>
                </div>
                <div className={`${styles.aiStepPill} ${jobProgress === 100 ? styles.aiStepDone : ''}`}>
                  <span>{jobProgress === 100 ? '✓' : '4'}</span>
                  <span>
                    {jobStats?.savedEntriesCount
                      ? `${jobStats.savedEntriesCount} Grid Entries`
                      : 'Saved & Ready'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Feedback Banners */}
        {errorMsg && <div className={styles.bannerError}>❌ {errorMsg}</div>}
        {jobError && <div className={styles.bannerError}>❌ Timetable Generation Failed: {jobError}</div>}
        {successMsg && <div className={styles.bannerSuccess}>✓ {successMsg}</div>}

        {/* Page-level Fetch Error State with Retry Button */}
        {error && (
          <div className={styles.bannerError} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>❌ {error}</span>
            <button
              style={{
                background: '#ef4444',
                color: '#ffffff',
                border: 'none',
                padding: '0.3rem 0.75rem',
                borderRadius: '0.25rem',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.8rem',
              }}
              onClick={() => invalidateCache()}
            >
              Retry
            </button>
          </div>
        )}

        {/* Panel B: Conflicts Warning List */}
        {hasUnresolvedConflicts && (
          <div className={styles.bannerWarning}>
            <p style={{ fontWeight: 700, margin: '0 0 0.5rem 0' }}>
              ⚠️ {allConflicts.length} course(s) could not be scheduled due to student timetable conflicts:
            </p>
            <div className={styles.conflictsList}>
              {allConflicts.map((c, idx) => (
                <div key={idx} className={styles.conflictItem}>
                  <p style={{ fontWeight: 700, color: '#991b1b', margin: 0 }}>Course: {c.courseName}</p>
                  <p style={{ fontSize: '0.82rem', color: '#334155', margin: '0.3rem 0' }}>
                    <strong>Explanation:</strong> {c.reason}
                  </p>
                  <p style={{ fontSize: '0.78rem', color: '#991b1b', margin: 0, fontWeight: 600 }}>
                    <strong>Impacted Students:</strong> {c.conflictingStudentCount} student(s) are registered in overlapping courses
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Panel A: Timetable Grid Area */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#6366f1', background: '#ffffff', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
            <p style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Loading timetable data...</p>
          </div>
        ) : departments.length > 0 ? (
          <div>
            {/* Department Tabs */}
            <div className={styles.tabsContainer}>
              {departments.map((dept) => (
                <button
                  key={dept.id}
                  className={`${styles.tab} ${selectedDeptId === dept.id ? styles.activeTab : ''}`}
                  onClick={() => handleDeptChange(dept.id)}
                  onMouseEnter={(e) => setTooltip({ text: dept.name, x: e.clientX + 14, y: e.clientY + 14 })}
                  onMouseMove={(e) => setTooltip({ text: dept.name, x: e.clientX + 14, y: e.clientY + 14 })}
                  onMouseLeave={() => setTooltip(null)}
                >
                  {dept.code || dept.name}
                </button>
              ))}
            </div>

            {/* 5x6 Grid */}
            <div className={styles.gridWrapper}>
              <table className={styles.gridTable}>
                <thead>
                  <tr>
                    <th style={{ width: '15%' }}>Day / Period</th>
                    {PERIODS.map((p) => (
                      <th key={p.num}>{p.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3, 4, 5].map((dayNum) => (
                    <tr key={dayNum}>
                      <td style={{ fontWeight: 700, background: '#f8fafc' }}>{DAYS_MAP[dayNum]}</td>
                      {PERIODS.map((p) => {
                        const entry = getEntryAt(dayNum, p.num);
                        return (
                          <td key={p.num}>
                            {entry ? (
                              <div className={styles.cellCourse}>
                                <div className={styles.cellCourseCode}>{entry.courseCode}</div>
                                <div className={styles.cellCourseTitle}>{entry.courseName}</div>
                                {entry.isLabBlock && <span className={styles.labBadge}>Lab Block (2h)</span>}
                              </div>
                            ) : (
                              <span style={{ color: '#cbd5e1' }}>—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b', background: '#ffffff', borderRadius: '0.5rem' }}>
            <p>No timetable entries generated yet for Semester {semester} ({academicYear}).</p>
            <p style={{ fontSize: '0.85rem' }}>Click <strong>"Generate Timetable"</strong> above to run the automated generator.</p>
          </div>
        )}
      </div>

      {/* Dedicated PDF Print Section (Only visible during window.print()) */}
      <div className={styles.printArea}>
        {(printTargetDept === 'all'
          ? (departments.length > 0 ? departments : Array.from(new Set(allEntries.map((e) => e.departmentId))).map((id) => ({ id, name: allEntries.find((e) => e.departmentId === id)?.departmentName || 'Department' })))
          : departments.filter((d) => d.id === printTargetDept)
        ).map((dept) => {
          const deptEntries = allEntries.filter((e) => e.departmentId === dept.id);
          return (
            <div key={dept.id} className={styles.printDeptSection}>
              <div className={styles.printHeader}>
                <h2>KANNUR UNIVERSITY — {dept.name.toUpperCase()} TIMETABLE</h2>
                <p>Academic Year: {academicYear} | Semester: {semester}</p>
              </div>
              <table className={styles.gridTable}>
                <thead>
                  <tr>
                    <th style={{ width: '15%' }}>Day / Period</th>
                    {PERIODS.map((p) => (
                      <th key={p.num}>{p.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3, 4, 5].map((dayNum) => (
                    <tr key={dayNum}>
                      <td style={{ fontWeight: 700, background: '#f8fafc' }}>{DAYS_MAP[dayNum]}</td>
                      {PERIODS.map((p) => {
                        const entry = deptEntries.find((e) => e.day === dayNum && e.period === p.num);
                        return (
                          <td key={p.num}>
                            {entry ? (
                              <div className={styles.cellCourse}>
                                <div className={styles.cellCourseCode}>{entry.courseCode}</div>
                                <div className={styles.cellCourseTitle}>{entry.courseName}</div>
                                {entry.isLabBlock && <span className={styles.labBadge}>Lab Block (2h)</span>}
                              </div>
                            ) : (
                              <span style={{ color: '#cbd5e1' }}>—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>

      {/* Export Options Modal */}
      {showExportModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>
              {exportType === 'excel' ? '📊 Export Excel (.xlsx)' : '📄 Export PDF'}
            </h3>
            <p className={styles.modalSubtitle}>
              Select which department schedule you want to export for Semester {semester} ({academicYear}):
            </p>

            <div className={styles.fieldGroup} style={{ marginTop: '1.25rem' }}>
              <label className={styles.label}>Select Export Scope</label>
              <select
                className={styles.select}
                style={{ width: '100%' }}
                value={exportTargetDept}
                onChange={(e) => setExportTargetDept(e.target.value)}
              >
                <option value="all">🌐 All Departments (Entire Campus)</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    🏢 {d.name} ({d.code || d.name})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                className={styles.modalCancelBtn}
                style={{
                  background: 'transparent',
                  border: '1px solid #cbd5e1',
                  padding: '0.5rem 1rem',
                  borderRadius: '0.375rem',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
                onClick={() => setShowExportModal(false)}
              >
                Cancel
              </button>
              <button
                style={{
                  background: exportType === 'excel' ? '#166534' : '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.5rem 1.25rem',
                  borderRadius: '0.375rem',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
                onClick={handleConfirmExport}
              >
                {exportType === 'excel' ? 'Download Excel →' : 'Print / Export PDF →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Instant Pointer Mouse Tooltip */}
      {tooltip && (
        <div
          className={styles.mouseTooltip}
          style={{
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
            position: 'fixed',
            pointerEvents: 'none',
            zIndex: 1000,
          }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}
