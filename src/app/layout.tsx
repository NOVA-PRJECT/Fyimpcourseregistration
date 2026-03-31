import './globals.css'

export const metadata = {
  title: 'Kannur University | FYIMP Digital Ledger',
  description: 'Academic Excellence Digitally Preserved.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
