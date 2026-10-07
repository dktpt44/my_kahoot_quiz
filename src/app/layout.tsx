import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Quizlet',
  description: 'Host quizzes and quick polls for live participants',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
