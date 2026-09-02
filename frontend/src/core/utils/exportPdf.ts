import jsPDF from 'jspdf'

interface Student {
  full_name: string
  department_name?: string
  department_code?: string
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

  // Sort students by department code (or department name) first, then by full_name
  const sortedStudents = [...students].sort((a, b) => {
    const deptA = (a.department_code || a.department_name || '').toUpperCase()
    const deptB = (b.department_code || b.department_name || '').toUpperCase()
    if (deptA !== deptB) return deptA.localeCompare(deptB)
    return a.full_name.localeCompare(b.full_name)
  })

  // ── TOP BANNER ──────────────────────────────
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
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'bold')

  const infoY = 24
  doc.text(`Course: ${courseTitle}`, margin, infoY)
  doc.text(`Code: ${courseCode}`, pageWidth / 2 - 20, infoY)
  doc.text(`Total Students: ${sortedStudents.length}`, pageWidth - margin - 40, infoY)

  // ── MONTH / YEAR MANUAL WRITE LINES ──────────
  const lineY = 32
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)

  doc.text('Month:', margin, lineY)
  doc.line(margin + 14, lineY, margin + 55, lineY)

  doc.text('Year:', margin + 62, lineY)
  doc.line(margin + 74, lineY, margin + 110, lineY)



  // ── TABLE SETUP ──────────────────────────────
  const tableStartY = 37
  const rowHeight = 7.3

  // Column widths (Total available width = 297 - 16 = 281mm)
  const slNoWidth = 8
  const nameWidth = 55
  const deptWidth = 14
  const dayWidth = 6.1   // 31 days × 6.1mm = 189.1mm
  const totalWidth = 14.9 // 8 + 55 + 14 + 189.1 + 14.9 = 281mm

  const days = 31
  const daysStartX = margin + slNoWidth + nameWidth + deptWidth

  // Helper to draw table header
  const drawTableHeader = (startY: number) => {
    doc.setFillColor(0, 33, 71)
    doc.rect(margin, startY, pageWidth - margin * 2, rowHeight, 'F')

    doc.setTextColor(255, 255, 255)
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')

    doc.text('Sl.', margin + slNoWidth / 2, startY + 4.8, { align: 'center' })
    doc.text('Student Name', margin + slNoWidth + 2, startY + 4.8)
    doc.text('DEPT', margin + slNoWidth + nameWidth + deptWidth / 2, startY + 4.8, { align: 'center' })

    for (let d = 1; d <= days; d++) {
      const x = daysStartX + (d - 1) * dayWidth + dayWidth / 2
      doc.text(String(d), x, startY + 4.8, { align: 'center' })
    }

    const totalX = daysStartX + days * dayWidth
    doc.text('Total', totalX + totalWidth / 2, startY + 4.8, { align: 'center' })
  }

  // Draw initial Page 1 table header
  drawTableHeader(tableStartY)

  // ── STUDENT ROWS ─────────────────────────────
  let currentY = tableStartY + rowHeight

  // Max Y boundary for Page 1 (fits 17-18 students on page 1)
  // 37mm + 7.3mm header + 18 * 7.3mm = 175.7mm
  const page1MaxY = 176

  // Max Y boundary for Page 2+ (fits 20-21 students on succeeding pages)
  // 8mm header start + 7.3mm header + 21 * 7.3mm = 168.6mm
  const page2MaxY = 169

  sortedStudents.forEach((student, index) => {
    const isPage1 = doc.getNumberOfPages() === 1
    const maxY = isPage1 ? page1MaxY : page2MaxY

    // Page break if current row would exceed the page limit
    if (currentY + rowHeight > maxY + 0.1 && index > 0) {
      doc.addPage()
      const newPageHeaderY = 8
      drawTableHeader(newPageHeaderY)
      currentY = newPageHeaderY + rowHeight
    }

    // Alternate row background shading
    if (index % 2 === 0) {
      doc.setFillColor(248, 249, 250)
      doc.rect(margin, currentY, pageWidth - margin * 2, rowHeight, 'F')
    }

    // Outer boundary line for row
    doc.setDrawColor(200, 200, 200)
    doc.setLineWidth(0.1)

    // Sl. No.
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(0, 0, 0)
    doc.text(String(index + 1), margin + slNoWidth / 2, currentY + 4.8, { align: 'center' })

    // Student Name (larger font, bold for readability)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    let displayName = student.full_name
    if (doc.getTextWidth(displayName) > nameWidth - 3) {
      while (displayName.length > 0 && doc.getTextWidth(displayName + '...') > nameWidth - 3) {
        displayName = displayName.slice(0, -1)
      }
      displayName += '...'
    }
    doc.text(displayName, margin + slNoWidth + 2, currentY + 4.8)

    // Department Code (from department table)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    const deptCode = student.department_code || student.department_name || '—'
    let displayDept = deptCode
    if (doc.getTextWidth(displayDept) > deptWidth - 1) {
      while (displayDept.length > 0 && doc.getTextWidth(displayDept + '...') > deptWidth - 1) {
        displayDept = displayDept.slice(0, -1)
      }
      displayDept += '...'
    }
    doc.text(displayDept, margin + slNoWidth + nameWidth + deptWidth / 2, currentY + 4.8, { align: 'center' })

    // 31 day cells — empty boxes for manual marking
    doc.setDrawColor(180, 180, 180)
    for (let d = 0; d < days; d++) {
      const x = daysStartX + d * dayWidth
      doc.rect(x, currentY, dayWidth, rowHeight)
    }

    // Total cell
    const totalX = daysStartX + days * dayWidth
    doc.rect(totalX, currentY, totalWidth, rowHeight)

    currentY += rowHeight
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
      doc.setFontSize(7.5)
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