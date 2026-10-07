import { redirect } from 'next/navigation'
import { hasAdminSession } from '@/lib/admin-auth'

export default async function Home() {
  redirect(await hasAdminSession() ? '/host/dashboard' : '/login')
}
