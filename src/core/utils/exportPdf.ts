import jsPDF from 'jspdf'

interface Student {
  full_name: string
  roll_number?: string
  department_name?: string
}

interface AttendanceSheetOptions {
  courseTitle: string
  courseCode: string
  students: Student[]
}

export async function generateAttendanceSheet({
  courseTitle,
  courseCode,
  students,
}: AttendanceSheetOptions) {

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = doc.internal.pageSize.getWidth()   // 297mm
  const pageHeight = doc.internal.pageSize.getHeight() // 210mm
  const margin = 8

  // ── HEADER ──────────────────────────────────
  doc.setFillColor(0, 33, 71)
  doc.rect(0, 0, pageWidth, 18, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('KANNUR UNIVERSITY — FYIMP PROGRAMME', pageWidth / 2, 7, { align: 'center' })

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('Monthly Attendance Register', pageWidth / 2, 13, { align: 'center' })

  // ── COURSE INFO ROW ──────────────────────────
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')

  const infoY = 24
  doc.text(`Course: ${courseTitle}`, margin, infoY)
  doc.text(`Code: ${courseCode}`, pageWidth / 2 - 20, infoY)
  doc.text(`Total Students: ${students.length}`, pageWidth - margin - 40, infoY)

  // ── MONTH / YEAR MANUAL WRITE LINES ──────────
  const lineY = 32
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)

  doc.text('Month:', margin, lineY)
  doc.line(margin + 16, lineY, margin + 55, lineY)

  doc.text('Year:', margin + 62, lineY)
  doc.line(margin + 76, lineY, margin + 110, lineY)

  doc.text('Department / Semester:', margin + 118, lineY)
  doc.line(margin + 160, lineY, pageWidth - margin, lineY)

  // ── TABLE SETUP ──────────────────────────────
  const tableStartY = 38
  const rowHeight = 6.5

  // Column widths
  const slNoWidth = 7
  const nameWidth = 42
  const deptWidth = 22
  const dayWidth = 5.2   // 31 days × 5.2mm = ~161mm
  const totalWidth = 12

  // Total days columns
  const days = 31

  // Calculate starting X for days
  const daysStartX = margin + slNoWidth + nameWidth + deptWidth

  // ── TABLE HEADER ─────────────────────────────
  doc.setFillColor(0, 33, 71)
  doc.rect(margin, tableStartY, pageWidth - margin * 2, rowHeight, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'bold')

  // Header labels
  doc.text('Sl.', margin + slNoWidth / 2, tableStartY + 4.2, { align: 'center' })
  doc.text('Student Name', margin + slNoWidth + nameWidth / 2, tableStartY + 4.2, { align: 'center' })
  doc.text('Department', margin + slNoWidth + nameWidth + deptWidth / 2, tableStartY + 4.2, { align: 'center' })

  // Day number headers
  for (let d = 1; d <= days; d++) {
    const x = daysStartX + (d - 1) * dayWidth + dayWidth / 2
    doc.text(String(d), x, tableStartY + 4.2, { align: 'center' })
  }

  // Total header
  const totalX = daysStartX + days * dayWidth
  doc.text('Total', totalX + totalWidth / 2, tableStartY + 4.2, { align: 'center' })

  // ── STUDENT ROWS ─────────────────────────────
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)

  let currentY = tableStartY + rowHeight

  students.forEach((student, index) => {
    // Alternate row shading
    if (index % 2 === 0) {
      doc.setFillColor(248, 249, 250)
      doc.rect(margin, currentY, pageWidth - margin * 2, rowHeight, 'F')
    }

    // Sl. No.
    doc.text(String(index + 1), margin + slNoWidth / 2, currentY + 4.2, { align: 'center' })

    // Student name — truncate if too long
    const name = student.full_name.length > 24
      ? student.full_name.substring(0, 22) + '...'
      : student.full_name
    doc.text(name, margin + slNoWidth + 2, currentY + 4.2)

    // Department
    const dept = (student.department_name ?? '').length > 14
      ? (student.department_name ?? '').substring(0, 12) + '...'
      : (student.department_name ?? '—')
    doc.text(dept, margin + slNoWidth + nameWidth + 2, currentY + 4.2)

    // 31 day cells — empty boxes for manual marking
    for (let d = 0; d < days; d++) {
      const x = daysStartX + d * dayWidth
      doc.rect(x, currentY, dayWidth, rowHeight)
    }

    // Total cell
    const totalX = daysStartX + days * dayWidth
    doc.rect(totalX, currentY, totalWidth, rowHeight)

    currentY += rowHeight

    // Page break if needed
   if (currentY + rowHeight > pageHeight - 15 && index < students.length - 1) {
  doc.addPage()

  // New page starts with just the column header — no course info, no logo, no month lines
  const newPageHeaderY = margin

  doc.setFillColor(0, 33, 71)
  doc.rect(margin, newPageHeaderY, pageWidth - margin * 2, rowHeight, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'bold')

  doc.text('Sl.', margin + slNoWidth / 2, newPageHeaderY + 4.2, { align: 'center' })
  doc.text('Student Name', margin + slNoWidth + nameWidth / 2, newPageHeaderY + 4.2, { align: 'center' })
  doc.text('Department', margin + slNoWidth + nameWidth + deptWidth / 2, newPageHeaderY + 4.2, { align: 'center' })

  for (let d = 1; d <= days; d++) {
    const x = daysStartX + (d - 1) * dayWidth + dayWidth / 2
    doc.text(String(d), x, newPageHeaderY + 4.2, { align: 'center' })
  }

  doc.text('Total', totalX + totalWidth / 2, newPageHeaderY + 4.2, { align: 'center' })

  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)

  currentY = newPageHeaderY + rowHeight
}
  })

  // ── OUTER TABLE BORDER ───────────────────────
  const tableHeight = (students.length + 1) * rowHeight
  // Don't draw outer border if multi-page — skip for simplicity

  // ── FOOTER ───────────────────────────────────
  const footerY = pageHeight - 10

  doc.setDrawColor(0, 33, 71)
  doc.setLineWidth(0.3)
  doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4)

  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)
  doc.text(
    `Generated by FYIMP Registration Portal • ${new Date().toLocaleDateString('en-IN')}`,
    pageWidth / 2,
    footerY,
    { align: 'center' }
  )

  // ── SIGNATURE LINES ───────────────────────────
  const sigY = footerY - 6
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(7)

  doc.line(margin, sigY, margin + 45, sigY)
  doc.text('Teacher Signature', margin, sigY + 3)

  doc.line(pageWidth - margin - 45, sigY, pageWidth - margin, sigY)
  doc.text('HOD Signature', pageWidth - margin - 45, sigY + 3)

  // ── SAVE ─────────────────────────────────────
  const fileName = `Attendance_${courseCode}_${new Date().toISOString().slice(0, 7)}.pdf`
  doc.save(fileName)
}