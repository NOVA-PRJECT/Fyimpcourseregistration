import * as XLSX from 'xlsx'

export interface StudentExcelRow {
  name: string
  sem: number
  paper_1?: string
  paper_2?: string
  paper_3?: string
  paper_4?: string
  paper_5?: string
  paper_6?: string
}

export function downloadStudentsExcel(rows: StudentExcelRow[], semesterLabel: string = 'All_Semesters') {
  const formattedData = rows.map((r, index) => ({
    'Sl. No.': index + 1,
    'Name': r.name,
    'Sem': r.sem,
    'Paper 1': r.paper_1 || '-',
    'Paper 2': r.paper_2 || '-',
    'Paper 3': r.paper_3 || '-',
    'Paper 4': r.paper_4 || '-',
    'Paper 5': r.paper_5 || '-',
    'Paper 6': r.paper_6 || '-',
  }))

  const worksheet = XLSX.utils.json_to_sheet(formattedData)

  // Column width formatting
  worksheet['!cols'] = [
    { wch: 8 },  // Sl. No.
    { wch: 26 }, // Name
    { wch: 8 },  // Sem
    { wch: 32 }, // Paper 1
    { wch: 32 }, // Paper 2
    { wch: 32 }, // Paper 3
    { wch: 32 }, // Paper 4
    { wch: 32 }, // Paper 5
    { wch: 32 }, // Paper 6
  ]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Student Papers Roster')

  const sanitizedSem = semesterLabel.replace(/\s+/g, '_')
  const dateStr = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(workbook, `Student_Papers_${sanitizedSem}_${dateStr}.xlsx`)
}
