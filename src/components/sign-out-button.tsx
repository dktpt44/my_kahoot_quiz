'use client'

export default function SignOutButton() {
  const signOut = async () => {
    const response = await fetch('/api/admin/session', { method: 'DELETE' })
    if (response.ok) window.location.replace('/login')
  }

  return <button className="btn-ghost px-4 py-2.5 text-sm" type="button" onClick={signOut}>Sign out</button>
}
