import { redirect } from 'next/navigation'
import { hasAdminSession } from '@/lib/admin-auth'

export default async function HostLayout({ children }: { children: React.ReactNode }) {
  if (!await hasAdminSession()) redirect('/login')
  return children
}
