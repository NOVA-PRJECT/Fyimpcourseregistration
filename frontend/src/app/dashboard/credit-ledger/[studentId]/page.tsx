'use client'

import { use } from 'react'
import CreditLedgerView from '@/components/credit-ledger/CreditLedgerView'

interface PageProps {
  params: Promise<{ studentId: string }>
}

export default function AdvisorStudentCreditLedgerPage({ params }: PageProps) {
  const resolvedParams = use(params)

  return <CreditLedgerView studentId={resolvedParams.studentId} />
}
