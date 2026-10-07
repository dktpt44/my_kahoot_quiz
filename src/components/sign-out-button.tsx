'use client'

export default function SignOutButton() {
  const signOut = async () => {
    const response = await fetch('/api/admin/session', { method: 'DELETE' })
    if (response.ok) window.location.replace('/login')
  }

  return <button className="btn-sign-out px-4 py-2.5 text-sm" type="button" onClick={signOut}>
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5" />
      <path d="m15 8 4 4-4 4M19 12H9" />
    </svg>
    Sign out
  </button>
}
