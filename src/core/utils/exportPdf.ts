import jsPDF from 'jspdf'

interface Student {
  full_name: string
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
  const slNoWidth = 8
  const nameWidth = 55
  const deptWidth = 14
  const dayWidth = 6.1   // 31 days × 6.1mm = ~189.1mm
  const totalWidth = 14.9

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
  doc.text('DEPT', margin + slNoWidth + nameWidth + deptWidth / 2, tableStartY + 4.2, { align: 'center' })

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
    const name = student.full_name.length > 28
      ? student.full_name.substring(0, 26) + '...'
      : student.full_name
    doc.text(name, margin + slNoWidth + 2, currentY + 4.2)

    // Department (code only)
    const dept = (student.department_name ?? '').length > 6
      ? (student.department_name ?? '').substring(0, 5) + '...'
      : (student.department_name ?? '—')
    doc.text(dept, margin + slNoWidth + nameWidth + deptWidth / 2, currentY + 4.2, { align: 'center' })

    // 31 day cells — empty boxes for manual marking
    for (let d = 0; d < days; d++) {
      const x = daysStartX + d * dayWidth
      doc.rect(x, currentY, dayWidth, rowHeight)
    }

    // Total cell
    const totalX = daysStartX + days * dayWidth
    doc.rect(totalX, currentY, totalWidth, rowHeight)

    currentY += rowHeight

    // Page break if needed (25mm margin for footer/signature spacing)
    if (currentY + rowHeight > pageHeight - 25 && index < students.length - 1) {
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
      doc.text('DEPT', margin + slNoWidth + nameWidth + deptWidth / 2, newPageHeaderY + 4.2, { align: 'center' })

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

  // ── FOOTER & PAGINATION POST-PROCESSING ───────
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)

    const footerY = pageHeight - 10

    // Draw footer line
    doc.setDrawColor(0, 33, 71)
    doc.setLineWidth(0.3)
    doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4)

    // Timestamp center
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(100, 100, 100)
    doc.text(
      `Generated by FYIMP Registration Portal • ${new Date().toLocaleDateString('en-IN')}`,
      pageWidth / 2,
      footerY,
      { align: 'center' }
    )

    // Page X of Y right
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth - margin,
      footerY,
      { align: 'right' }
    )

    // Signatures only on the final page
    if (i === totalPages) {
      const sigY = footerY - 6
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')

      doc.line(margin, sigY, margin + 45, sigY)
      doc.text('Teacher Signature', margin, sigY + 3)

      doc.line(pageWidth - margin - 45, sigY, pageWidth - margin, sigY)
      doc.text('HOD Signature', pageWidth - margin - 45, sigY + 3)
    }
  }

  // ── SAVE ─────────────────────────────────────
  const fileName = `Attendance_${courseCode}_${new Date().toISOString().slice(0, 7)}.pdf`
  doc.save(fileName)
}