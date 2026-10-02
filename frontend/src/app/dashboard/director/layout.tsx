// Role access is verified centrally by middleware against the backend profile.
export const dynamic = 'force-dynamic'

export default function DashboardRoleLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
