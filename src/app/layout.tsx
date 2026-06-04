import './globals.css'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/core/security/authOptions'
import SessionProvider from '@/component/SessionProvider'

export const metadata = {
  title: 'FYIMP COURSE REGISTRATION KUC',
  description: 'Academic Excellence Digitally Preserved.',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  return (
    <html lang="en">
      <body>
        <SessionProvider session={session}>
          {children}
        </SessionProvider>
      </body>
    </html>
  )
}