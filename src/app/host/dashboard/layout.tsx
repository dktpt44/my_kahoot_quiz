import type { Metadata } from 'next'
import Link from 'next/link'
import { Brand } from '@/components/ui'
import SignOutButton from '@/components/sign-out-button'

export const metadata: Metadata = {
  title: 'Host dashboard · Quiz Game',
  description: 'Choose a quiz and bring everyone together.',
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <div className="app-shell">
    <div className="surface">
      <header className="container-wide flex flex-wrap items-center justify-between gap-4 py-6 sm:py-8">
        <Link href="/host/dashboard" aria-label="Quiz Game dashboard"><Brand /></Link>
        <nav className="glass-soft flex items-center gap-1 p-1.5" aria-label="Dashboard navigation">
          <Link className="btn-ghost px-4 py-2.5 text-sm" href="/host/dashboard">Library</Link>
          <Link className="btn-ghost px-4 py-2.5 text-sm" href="/host/dashboard/how-to">How to play</Link>
          <SignOutButton />
        </nav>
      </header>
      <main className="container-wide pb-24">{children}</main>
    </div>
  </div>
}
