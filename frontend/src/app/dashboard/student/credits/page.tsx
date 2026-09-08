'use client'

import CreditLedgerView from '@/components/credit-ledger/CreditLedgerView'

export default function StudentCreditsPage() {
  return (
    <CreditLedgerView
      studentId="me"
      backHref="/dashboard/student"
      backLabel="Back to Student Dashboard"
    />
  )
}
