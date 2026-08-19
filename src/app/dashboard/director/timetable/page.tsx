'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
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
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
  const [activeDeptId, setActiveDeptId] = useState<string>('');
  const [departments, setDepartments] = useState<{ id: string; name: string; code?: string }[]>([]);
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);

  // Feedback banners
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  // 1. Load initial data and department list
  const fetchEntries = useCallback(async () => {
    try {
      const res = await fetch(`/api/timetable/entries?academicYear=${academicYear}&semester=${semester}`);
      if (!res.ok) return;
      const data = await res.json();
      setEntries(data.entries || []);
      setConflicts(data.conflicts || []);

      if (data.departments && data.departments.length > 0) {
        setDepartments(data.departments);
        setActiveDeptId((current) => {
          if (!current || !data.departments.some((d: { id: string }) => d.id === current)) {
            return data.departments[0].id;
          }
          return current;
        });
      } else {
        // Extract unique departments from entries fallback
        const deptMap = new Map<string, string>();
        (data.entries || []).forEach((e: TimetableEntry) => {
          if (e.departmentId) deptMap.set(e.departmentId, e.departmentName);
        });

        const deptList = Array.from(deptMap.entries()).map(([id, name]) => ({ id, name }));
        setDepartments(deptList);
        if (deptList.length > 0 && !activeDeptId) {
          setActiveDeptId(deptList[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load entries:', err);
    }
  }, [academicYear, semester, activeDeptId]);

  // 2. Poll job status when running or queued
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
          fetchEntries();
        } else if (data.status === 'failed') {
          clearInterval(interval);
          setJobError(data.errorMessage || data.error || 'Generation job failed');
        }
      } catch (err) {
        console.error('Job status polling error:', err);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [jobStatus, academicYear, semester, fetchEntries]);

  // Fetch entries when semester/year changes
  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

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

  // Handle Publish
  async function handlePublish() {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsPublishing(true);

    try {
      const res = await fetch('/api/timetable/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ academicYear, semester }),
      });

      const data = await res.json();
      setIsPublishing(false);

      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to publish timetable');
        if (data.conflicts) setConflicts(data.conflicts);
        return;
      }

      setSuccessMsg('Timetable published successfully!');
      fetchEntries();
    } catch {
      setIsPublishing(false);
      setErrorMsg('Network error publishing timetable');
    }
  }

  // Handle Validate
  async function handleValidate() {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsValidating(true);

    try {
      const res = await fetch('/api/timetable/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ academicYear, semester }),
      });

      const data = await res.json();
      setIsValidating(false);

      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to re-validate timetable');
        return;
      }

      if (data.newConflicts > 0) {
        setErrorMsg(`Re-validation complete: Found ${data.newConflicts} new registration conflict(s).`);
        fetchEntries();
      } else {
        setSuccessMsg('Re-validation complete: No conflicts detected.');
      }
    } catch {
      setIsValidating(false);
      setErrorMsg('Network error re-validating timetable');
    }
  }

  // Filter entries for active department
  const filteredEntries = entries.filter((e) => !activeDeptId || e.departmentId === activeDeptId);

  // Helper to find entry at day + period
  function getEntryAt(day: number, period: number): TimetableEntry | undefined {
    return filteredEntries.find((e) => e.day === day && e.period === period);
  }

  const isPublished = entries.length > 0 && entries.every((e) => e.status === 'published');
  const hasUnresolvedConflicts = conflicts.length > 0;

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

            {entries.length > 0 && !isPublished && (
              <button
                className={styles.publishBtn}
                onClick={handlePublish}
                disabled={isPublishing || hasUnresolvedConflicts}
              >
                {isPublishing ? 'Publishing...' : '🚀 Publish Timetable'}
              </button>
            )}

            {isPublished && (
              <button className={styles.validateBtn} onClick={handleValidate} disabled={isValidating}>
                {isValidating ? 'Validating...' : '🔍 Re-validate Schedule'}
              </button>
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

        {/* Panel B: Conflicts Warning List */}
        {hasUnresolvedConflicts && (
          <div className={styles.bannerWarning}>
            <p style={{ fontWeight: 700, margin: '0 0 0.5rem 0' }}>
              ⚠️ {conflicts.length} course(s) could not be scheduled due to student timetable conflicts:
            </p>
            <div className={styles.conflictsList}>
              {conflicts.map((c, idx) => (
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

        {/* Panel A: Timetable Grid */}
        {departments.length > 0 ? (
          <div>
            {/* Department Tabs */}
            <div className={styles.tabsContainer}>
              {departments.map((dept) => (
                <button
                  key={dept.id}
                  className={`${styles.tab} ${activeDeptId === dept.id ? styles.activeTab : ''}`}
                  onClick={() => setActiveDeptId(dept.id)}
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
