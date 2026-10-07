import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Brand } from '@/components/ui'
import { hasAdminSession } from '@/lib/admin-auth'
import LoginForm from './login-form'

export const metadata: Metadata = {
  title: 'Admin sign in · Quizlet',
  description: 'Sign in to manage and host quizzes.',
}

export default async function LoginPage() {
  if (await hasAdminSession()) redirect('/host/dashboard')

  return <main className="app-shell min-h-screen">
    <div className="surface container-wide flex min-h-screen flex-col">
      <header className="py-7 sm:py-9"><Brand /></header>
      <div className="flex flex-1 items-center justify-center pb-20 pt-10">
        <section className="glass login-panel w-full max-w-md px-7 py-9 animate-in sm:px-10 sm:py-11" aria-labelledby="login-title">
          <div className="login-icon" aria-hidden="true">◆</div>
          <p className="eyebrow mt-7">Admin access</p>
          <h1 id="login-title" className="mt-3 text-4xl font-extrabold tracking-[-.05em]">Welcome back.</h1>
          <p className="text-muted mt-3 leading-relaxed">Enter your password to manage and host quizzes.</p>
          <LoginForm />
        </section>
      </div>
    </div>
  </main>
}
