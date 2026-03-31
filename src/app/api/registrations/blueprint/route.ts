import { NextResponse } from 'next/server'
import { getBlueprint } from '@/modules/student/services/getBlueprint'

export async function GET() {

  const response = await getBlueprint()

  if (!response.success) {
    return NextResponse.json(
      { error: response.error },
      { status: response.status }
    )
  }

  return NextResponse.json(response)
}