'use client'

import { useState } from 'react'

export default function CloseParticipantWindow() {
  const [needsManualClose, setNeedsManualClose] = useState(false)

  const close = () => {
    setNeedsManualClose(false)
    try { window.close() } catch { /* Browsers may block closing a tab opened by the user. */ }
    window.setTimeout(() => {
      if (!window.closed) setNeedsManualClose(true)
    }, 150)
  }

  return <div className="mt-8 flex flex-col items-center gap-3">
    <button className="btn-secondary min-w-36" type="button" onClick={close}>Close</button>
    {needsManualClose && <p className="text-muted text-center text-sm" role="status">Your browser kept this tab open. You can close it manually.</p>}
  </div>
}
