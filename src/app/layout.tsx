import './globals.css'

export const metadata = {
  title: 'FYIMP COURSE REGISTRATION KUC',
  description: 'Academic Excellence Digitally Preserved.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
